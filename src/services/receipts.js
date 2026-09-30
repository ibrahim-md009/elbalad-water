import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { storage } from '../firebase';
import { RECEIPTS_FOLDER } from '../config/app';
import { AppError } from '../lib/errors';

/** يرفع ملف WebP فقط إلى Firebase Storage ويعيد رابط التنزيل ليُحفظ في reservation.receiptUrl */
export async function uploadReceipt(webpFile) {
  if (!webpFile || webpFile.type !== 'image/webp') {
    throw new AppError('ملف الوصل غير صالح.');
  }
  const random = Math.random().toString(36).slice(2, 10);
  const fileRef = ref(storage, `${RECEIPTS_FOLDER}/${Date.now()}-${random}.webp`);
  await uploadBytes(fileRef, webpFile, { contentType: 'image/webp' });
  return getDownloadURL(fileRef);
}
