import { useMemo } from "react";
import { useAuth } from "../context/AuthContext";
import { weekIndex } from "../lib/week";

/**
 * رصيد الحجز الأسبوعي للمستخدم المسجل:
 *   limit = weeklyBookingLimit (من لوحة التحكم، الافتراضي 1)
 *   used  = bookingCount لو bookingWeek هو الأسبوع الحالي، وإلا 0 (الأسبوع الجديد يبدأ من صفر)
 * الزائر غير المسجل: tracked=false (لا يُطبَّق عليه حد).
 */
export function useBookingQuota() {
  const { status, profile } = useAuth();
  return useMemo(() => {
    if (status !== "authed" || !profile) {
      return { tracked: false, limit: null, used: 0, remaining: Infinity, reached: false };
    }
    const limit = Number(profile.weeklyBookingLimit ?? 1);
    const used = profile.bookingWeek === weekIndex() ? Number(profile.bookingCount) || 0 : 0;
    const remaining = Math.max(0, limit - used);
    return { tracked: true, limit, used, remaining, reached: remaining <= 0 };
  }, [status, profile]);
}
