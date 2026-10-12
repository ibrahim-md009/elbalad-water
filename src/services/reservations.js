import { collection, doc, getDoc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { COLLECTIONS, SETTINGS_DOC } from '../config/app';
import { AVAILABILITY_STATUS, RESERVATION_STATUS as S } from '../lib/constants';
import { AppError } from '../lib/errors';
import { calcPrice, normalizeSettings } from '../lib/pricing';
import { weekIndex } from '../lib/week';

export const MINUTES_UNAVAILABLE = 'minutes-unavailable';
export const MINUTES_UNAVAILABLE_MESSAGE = 'عذرًا، لم تعد هذه الدقائق متاحة. يرجى اختيار موعد آخر.';
export const WEEKLY_LIMIT = 'weekly-limit';
export const WEEKLY_LIMIT_MESSAGE = 'وصلت للحد الأسبوعي المسموح لك من الحجوزات. جرّب الأسبوع القادم.';
const unavailable = () => new AppError(MINUTES_UNAVAILABLE_MESSAGE, MINUTES_UNAVAILABLE);

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
 * إنشاء طلب حجز (status = pending) مع خصم الدقائق داخل Firestore Transaction.
 * مطابق لـ createReservation في الـ Dashboard، والحقول مطابقة تمامًا لـ firestore.rules.
 * طلبان متزامنان على نفس الدقائق: ينجح واحد فقط ولا يصبح الرصيد سالبًا.
 */
export async function createReservation({ name, phone, minutes, availabilityId, receiptUrl, notes = '', userId = null }) {
  const m = Number(minutes);
  if (!Number.isInteger(m) || m <= 0) throw new AppError('عدد الدقائق غير صحيح.');
  if (!name?.trim() || !phone?.trim()) throw new AppError('الاسم ورقم الهاتف مطلوبان.');
  if (!receiptUrl) throw new AppError('صورة الوصل مطلوبة.');

  const aRef = availabilityRef(availabilityId);
  const sRef = doc(db, COLLECTIONS.settings, SETTINGS_DOC);
  const rRef = doc(collection(db, COLLECTIONS.reservations));
  // المستخدم المسجل: يُخصم حجز من رصيده الأسبوعي في نفس العملية
  const uRef = userId ? doc(db, COLLECTIONS.users, userId) : null;

  await runTransaction(db, async (tx) => {
    const aSnap = await tx.get(aRef);
    const sSnap = await tx.get(sRef);
    const uSnap = uRef ? await tx.get(uRef) : null;
    if (!aSnap.exists()) throw unavailable();

    const a = aSnap.data();
    const available = Number(a.availableMinutes) || 0;
    if (a.status !== AVAILABILITY_STATUS.AVAILABLE || available < m) throw unavailable();

    // الحد الأسبوعي (القراءة قبل أي كتابة داخل الـ Transaction)
    let nextCount = null;
    const week = weekIndex();
    if (uSnap?.exists()) {
      const u = uSnap.data();
      const limit = Number(u.weeklyBookingLimit ?? 1);
      const used = u.bookingWeek === week ? Number(u.bookingCount) || 0 : 0;
      if (used >= limit) throw new AppError(WEEKLY_LIMIT_MESSAGE, WEEKLY_LIMIT);
      nextCount = used + 1;
    }

    const settings = normalizeSettings(sSnap.exists() ? sSnap.data() : null);
    const nextAvailable = available - m;
    const nextReserved = (Number(a.reservedMinutes) || 0) + m;

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

    if (nextCount !== null) tx.update(uRef, { bookingWeek: week, bookingCount: nextCount });

    tx.set(rRef, {
      name: name.trim(),
      phone: phone.trim(),
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

  return rRef.id;
}
