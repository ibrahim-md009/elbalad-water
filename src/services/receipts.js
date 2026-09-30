import { CLOUDINARY, RECEIPTS_FOLDER } from '../config/app';
import { AppError } from '../lib/errors';

/** يرفع ملف WebP إلى Cloudinary (رفع unsigned) ويعيد رابط الصورة ليُحفظ في reservation.receiptUrl */
export async function uploadReceipt(webpFile) {
  if (!webpFile || webpFile.type !== 'image/webp') {
    throw new AppError('ملف الوصل غير صالح.');
  }
  if (!CLOUDINARY.cloudName || !CLOUDINARY.uploadPreset) {
    throw new AppError('إعدادات رفع الصور غير مكتملة.');
  }

  const body = new FormData();
  body.append('file', webpFile);
  body.append('upload_preset', CLOUDINARY.uploadPreset);
  body.append('folder', RECEIPTS_FOLDER);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY.cloudName}/image/upload`, {
    method: 'POST',
    body,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.secure_url) {
    console.error('cloudinary upload failed:', res.status, data?.error?.message);
    throw new AppError('تعذر رفع صورة الوصل، حاول مرة أخرى.');
  }
  return data.secure_url;
}
