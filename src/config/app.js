// إعدادات الموقع الأساسي — نفس أسماء الـ Collections الموجودة في الـ Dashboard

/** اسم المشروع (نفس الاسم في الـ Dashboard) */
export const APP_NAME = "مياهك";
export const APP_TAGLINE = "مياه أنقى .. لحياة أفضل.";

export const CURRENCY = "₪";

export const DEFAULT_SETTINGS = {
  minutesPerCup: 20,
  pricePerCup: 10,
  /** الحد الأسبوعي الافتراضي بالدقائق للعميل الجديد (يُضبط من الداش) */
  defaultWeeklyMinutes: 60,
};

export const COLLECTIONS = {
  availability: "availability",
  reservations: "reservations",
  paymentMethods: "paymentMethods",
  settings: "settings",
  customers: "customers",
};

export const SETTINGS_DOC = "general";

/** Cloudinary: ضع اسم الحساب واسم الـ Upload Preset (من نوع Unsigned) */
export const CLOUDINARY = {
  cloudName: "e5vp4fq4",
  uploadPreset: "receipts_unsigned",
};

/** مجلد وصلات الدفع داخل Cloudinary */
export const RECEIPTS_FOLDER = "receipts";

/** قيمة الحد الأسبوعي التي تعني «بدون حد» */
export const UNLIMITED_MINUTES = 99999;
