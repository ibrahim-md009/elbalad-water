import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { onSnapshot } from 'firebase/firestore';
import { customerRef, registerCustomer } from '../services/customers';
import { toDate } from '../lib/format';
import { isSameWeek } from '../lib/week';
import { UNLIMITED_MINUTES } from '../config/app';
import { useSettings } from '../hooks/useSettings';

const CustomerContext = createContext(null);
const STORAGE_KEY = 'water_customer_v1';

function readStored() {
  try {
    const v = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return v && /^[0-9]{7,15}$/.test(v.phone || '') ? v : null;
  } catch {
    return null;
  }
}
function writeStored(c) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ phone: c.phone, name: c.name }));
  } catch {
    /* التخزين غير متاح (وضع خاص) — يستمر الموقع بدون تذكّر */
  }
}
function clearStored() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * حساب العميل: يُسجَّل مرة واحدة (اسم + رقم) ويُحفظ في المتصفح، فلا يُطلب منه مجددًا.
 * السجل الحي (الحد والمستهلك بالدقائق) يُقرأ من Firestore لحظيًا. status: guest | ready
 */
export function CustomerProvider({ children }) {
  const settings = useSettings();
  const [stored, setStored] = useState(readStored);
  const [customer, setCustomer] = useState(() => {
    const s = readStored();
    return s ? { id: s.phone, phone: s.phone, name: s.name } : null;
  });

  const forget = useCallback(() => {
    clearStored();
    setStored(null);
    setCustomer(null);
  }, []);

  const phone = stored?.phone || null;
  useEffect(() => {
    if (!phone) return undefined;
    return onSnapshot(
      customerRef(phone),
      (snap) => {
        if (snap.exists()) {
          const data = { id: snap.id, ...snap.data() };
          setCustomer(data);
          writeStored(data);
        } else if (!snap.metadata.fromCache) {
          // حذف المسؤول السجل → نطلب التسجيل من جديد
          forget();
        }
      },
      () => {
        /* خطأ شبكة مؤقت: نبقى على البيانات المحفوظة */
      },
    );
  }, [phone, forget]);

  const register = useCallback(async ({ name, phone: p }) => {
    const c = await registerCustomer({ name, phone: p });
    writeStored(c);
    setStored({ phone: c.phone, name: c.name });
    setCustomer(c);
    return c;
  }, []);

  const allowance = useMemo(() => {
    if (!customer) return null;
    const limit = Number(customer.weeklyMinutes ?? settings.defaultWeeklyMinutes);
    const known = Number.isFinite(limit);
    const used = isSameWeek(toDate(customer.lastBookingAt), new Date()) ? Number(customer.weekMinutes) || 0 : 0;
    return {
      known, // false = بيانات محفوظة محليًا لم يصل سجلها الحي بعد
      limit: known ? limit : 0,
      used,
      remaining: known ? Math.max(0, limit - used) : 0,
      unlimited: known && limit >= UNLIMITED_MINUTES,
      blocked: customer.blocked === true,
    };
  }, [customer, settings.defaultWeeklyMinutes]);

  const value = useMemo(
    () => ({ status: phone ? 'ready' : 'guest', customer, allowance, register, forget }),
    [phone, customer, allowance, register, forget],
  );

  return <CustomerContext.Provider value={value}>{children}</CustomerContext.Provider>;
}

export const useCustomer = () => useContext(CustomerContext);
