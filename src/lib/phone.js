const ARABIC_DIGITS = {
  "٠": "0",
  "١": "1",
  "٢": "2",
  "٣": "3",
  "٤": "4",
  "٥": "5",
  "٦": "6",
  "٧": "7",
  "٨": "8",
  "٩": "9",
  "۰": "0",
  "۱": "1",
  "۲": "2",
  "۳": "3",
  "۴": "4",
  "۵": "5",
  "۶": "6",
  "۷": "7",
  "۸": "8",
  "۹": "9",
};

/** يوحّد الرقم: أرقام لاتينية، بدون مسافات أو شرطات أو أقواس (يبقي + في البداية) */
export function normalizePhone(value) {
  const latin = String(value || "").replace(/[٠-٩۰-۹]/g, (d) => ARABIC_DIGITS[d]);
  return latin.replace(/[\s\-().]/g, "");
}

/** تحقق مرن: من 7 إلى 15 رقمًا، مع + اختيارية في البداية. يعيد رسالة الخطأ أو '' */
export function validatePhone(value) {
  const phone = normalizePhone(value);
  if (!phone) return "أدخل رقم الهاتف.";
  if (!/^\+?\d+$/.test(phone)) return "رقم الهاتف يجب أن يحتوي على أرقام فقط.";
  const digits = phone.replace("+", "").length;
  if (digits < 7) return "رقم الهاتف ناقص، تأكد من إدخاله كاملًا.";
  if (digits > 15) return "رقم الهاتف طويل جدًا، تأكد من صحته.";
  return "";
}

/** يحوّل رقم الهاتف لإيميل داخلي صناعي — Firebase Auth لا يدعم الدخول برقم الهاتف بدون SMS
 *  فنستخدم الإيميل الصناعي ده للتسجيل وتسجيل الدخول برقم الهاتف بدل الإيميل */
export function phoneToEmail(phone) {
  return `${normalizePhone(phone)}@user.miahuk.app`;
}

/** كلمة مرور داخلية مشتقة من الرقم — المستخدم ما بيشوفهاش ولا بيكتبها.
 *  Firebase Auth بيطلب كلمة مرور (6 أحرف على الأقل) فبنولّدها من الرقم نفسه.
 *  تنبيه: ده معناه إن أي حد يعرف الرقم يقدر يدخل بيه. */
export function phoneToPassword(phone) {
  return `${normalizePhone(phone)}#miahuk-app`;
}
