import { collection, doc, getDoc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { COLLECTIONS, SETTINGS_DOC } from '../config/app';
import { AVAILABILITY_STATUS, RESERVATION_STATUS as S } from '../lib/constants';
import { AppError } from '../lib/errors';
import { calcPrice, normalizeSettings } from '../lib/pricing';
import { toDate } from '../lib/format';
import { isSameWeek } from '../lib/week';
import { customerRef } from './customers';

export const MINUTES_UNAVAILABLE = 'minutes-unavailable';
export const MINUTES_UNAVAILABLE_MESSAGE = 'عذرًا، لم تعد هذه الدقائق متاحة. يرجى اختيار موعد آخر.';
const unavailable = () => new AppError(MINUTES_UNAVAILABLE_MESSAGE, MINUTES_UNAVAILABLE);

export const NOT_REGISTERED = 'not-registered';
export const WEEKLY_LIMIT = 'weekly-limit';
export const CUSTOMER_BLOCKED = 'customer-blocked';

const availabilityRef = (id) => doc(db, COLLECTIONS.availability, id);

/** نفس منطق الـ Dashboard (availability.js) لحساب حالة الدفعة */
function computeAvailabilityStatus({ totalMinutes = 0, availableMinutes = 0, reservedMinutes = 0 }) {
  if (totalMinutes <= 0) return AVAILABILITY_STATUS.EMPTY;
  if (availableMinutes > 0) return AVAILABILITY_STATUS.AVAILABLE;
  if (reservedMinutes > 0) return AVAILABILITY_STATUS.FULL;
  return AVAILABILITY_STATUS.COMPLETED;
}

/** فحص سريع قبل رفع الوصل حتى لا نرفع صورة لدقائق لم تعد متاحة */
export async function assertMinutesAvailable(availabilityId, minutes) {
  const snap = await getDoc(availabilityRef(availabilityId));
  if (!snap.exists()) throw unavailable();
  const a = snap.data();
  if (a.status !== AVAILABILITY_STATUS.AVAILABLE || (Number(a.availableMinutes) || 0) < minutes) {
    throw unavailable();
  }
}

/**
 * إنشاء طلب حجز (status = pending) مع:
 *  1) خصم الدقائق من الدفعة، و
 *  2) زيادة عدّاد العميل الأسبوعي (ضمن حدّه)
 * كلاهما داخل Firestore Transaction واحدة، وقواعد Firestore تتحقق منهما من جهة الخادم.
 * طلبان متزامنان على نفس الدقائق: ينجح واحد فقط ولا يصبح الرصيد سالبًا.
 */
export async function createReservation({ customerPhone, minutes, availabilityId, receiptUrl, notes = '' }) {
  const m = Number(minutes);
  if (!Number.isInteger(m) || m <= 0) throw new AppError('عدد الدقائق غير صحيح.');
  if (!customerPhone) throw new AppError('سجّل اسمك ورقمك أولًا.', NOT_REGISTERED);
  if (!receiptUrl) throw new AppError('صورة الوصل مطلوبة.');

  const aRef = availabilityRef(availabilityId);
  const sRef = doc(db, COLLECTIONS.settings, SETTINGS_DOC);
  const cRef = customerRef(customerPhone);
  const rRef = doc(collection(db, COLLECTIONS.reservations));

  // flipWeek: إن اختلف توقيت جهاز العميل عن توقيت الخادم (عند حدود الأسبوع أو ساعة خاطئة)
  // تُرفض العملية من القواعد، فنعيد المحاولة مرة واحدة بالتخمين المعاكس لأسبوع العدّاد.
  const attempt = (flipWeek) =>
    runTransaction(db, async (tx) => {
      // كل القراءات أولًا
      const aSnap = await tx.get(aRef);
      const sSnap = await tx.get(sRef);
      const cSnap = await tx.get(cRef);

      if (!cSnap.exists()) {
        throw new AppError('سجّل اسمك ورقمك أولًا.', NOT_REGISTERED);
      }
      const c = cSnap.data();
      if (c.blocked === true) {
        throw new AppError('تعذر إتمام الحجز حاليًا، يرجى التواصل مع الإدارة.', CUSTOMER_BLOCKED);
      }

      let sameWeek = isSameWeek(toDate(c.lastBookingAt), new Date());
      if (flipWeek) sameWeek = !sameWeek;
      const used = sameWeek ? Number(c.weekCount) || 0 : 0;
      const limit = Number(c.weeklyLimit) || 0;
      if (used + 1 > limit) {
        throw new AppError('وصلت للحد الأسبوعي للحجوزات. يتجدد يوم السبت.', WEEKLY_LIMIT);
      }

      if (!aSnap.exists()) throw unavailable();
      const a = aSnap.data();
      const available = Number(a.availableMinutes) || 0;
      if (a.status !== AVAILABILITY_STATUS.AVAILABLE || available < m) throw unavailable();

      const settings = normalizeSettings(sSnap.exists() ? sSnap.data() : null);
      const nextAvailable = available - m;
      const nextReserved = (Number(a.reservedMinutes) || 0) + m;

      // ثم الكتابات
      tx.update(cRef, {
        weekCount: used + 1,
        lastBookingAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      tx.update(aRef, {
        availableMinutes: nextAvailable,
        reservedMinutes: nextReserved,
        status: computeAvailabilityStatus({
          ...a,
          availableMinutes: nextAvailable,
          reservedMinutes: nextReserved,
        }),
        updatedAt: serverTimestamp(),
      });

      tx.set(rRef, {
        name: String(c.name || '').trim(),
        phone: customerPhone,
        minutes: m,
        price: calcPrice(m, settings),
        minutesPerCup: settings.minutesPerCup,
        pricePerCup: settings.pricePerCup,
        availabilityId,
        dateText: a.dateText || '',
        notes: (notes || '').trim(),
        receiptUrl,
        status: S.PENDING,
        createdAt: serverTimestamp(),
      });
    });

  try {
    await attempt(false);
  } catch (err) {
    // قواعد Firestore هي الحَكَم: نعيد المحاولة مرة واحدة بالتخمين المعاكس عند الرفض أو عند ظهور "الحد"
    if (err?.code !== 'permission-denied' && err?.code !== WEEKLY_LIMIT) throw err;
    try {
      await attempt(true);
    } catch (err2) {
      // إن كان الحد حقيقيًا يرفض الخادم المحاولة الثانية، فنعرض رسالة الحد الواضحة
      if (err?.code === WEEKLY_LIMIT && err2?.code === 'permission-denied') throw err;
      throw err2;
    }
  }

  return rRef.id;
}
