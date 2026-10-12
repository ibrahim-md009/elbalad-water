import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { COLLECTIONS, SETTINGS_DOC } from '../config/app';
import { AppError } from '../lib/errors';
import { canonicalPhone, validatePhone } from '../lib/phone';
import { normalizeSettings } from '../lib/pricing';

export const customerRef = (id) => doc(db, COLLECTIONS.customers, id);

/**
 * تسجيل العميل مرة واحدة (اسم + رقم).
 * إن كان الرقم مسجّلًا مسبقًا (مثلًا عميل قديم أو سجّل من جهاز آخر) نعتمد سجله الحالي كما هو.
 * الحد الأسبوعي لا يحدده العميل: يُنشأ بالحد الافتراضي من settings/general وتفرضه قواعد Firestore.
 */
export async function registerCustomer({ name, phone }) {
  const cleanName = (name || '').trim();
  if (!cleanName) throw new AppError('أدخل اسمك الكامل.');
  if (cleanName.length > 100) throw new AppError('الاسم طويل جدًا.');
  const phoneError = validatePhone(phone);
  if (phoneError) throw new AppError(phoneError);

  const id = canonicalPhone(phone);
  const ref = customerRef(id);

  const existing = await getDoc(ref);
  if (existing.exists()) return { id, ...existing.data(), existing: true };

  const settingsSnap = await getDoc(doc(db, COLLECTIONS.settings, SETTINGS_DOC));
  const { defaultWeeklyLimit } = normalizeSettings(settingsSnap.exists() ? settingsSnap.data() : null);

  try {
    await setDoc(ref, {
      name: cleanName,
      phone: id,
      weeklyLimit: defaultWeeklyLimit,
      blocked: false,
      weekCount: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    // سُجّل الرقم للتو من جهاز آخر → نعتمد السجل الموجود
    const again = await getDoc(ref).catch(() => null);
    if (again?.exists()) return { id, ...again.data(), existing: true };
    throw err;
  }

  const created = await getDoc(ref);
  return { id, ...created.data(), existing: false };
}
