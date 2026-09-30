import {
  ACCEPTED_IMAGE_EXTENSIONS,
  ACCEPTED_IMAGE_TYPES,
  MAX_ORIGINAL_BYTES,
  MAX_WEBP_BYTES,
} from './constants';
import { AppError } from './errors';

/** أطول ضلع بعد التصغير: يكفي لقراءة الوصل بوضوح مع حجم صغير */
const MAX_SIDE = 1600;
const QUALITY = 0.8;

const CONVERT_FAILED = 'تعذر تجهيز صورة الوصل، جرّب صورة أخرى.';

function isAcceptedFile(file) {
  if (ACCEPTED_IMAGE_TYPES.includes(file.type)) return true;
  // بعض الأجهزة تترك type فارغًا، فنعتمد على الامتداد كحل أخير للقبول فقط (التحويل الفعلي يتم بعدها)
  const ext = (file.name.split('.').pop() || '').toLowerCase();
  return !file.type && ACCEPTED_IMAGE_EXTENSIONS.includes(ext);
}

/** فك ترميز الصورة مع احترام اتجاه التصوير (EXIF) على الأندرويد والآيفون */
async function decodeImage(file) {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(file, { imageOrientation: 'from-image' });
    } catch {
      /* نجرّب الطريقة التالية */
    }
    try {
      return await createImageBitmap(file);
    } catch {
      /* نجرّب عنصر Image */
    }
  }
  const url = URL.createObjectURL(file);
  try {
    return await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('decode-failed'));
      img.src = url;
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

const sizeOf = (img) => ({
  width: img.naturalWidth || img.width,
  height: img.naturalHeight || img.height,
});

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve) => {
    try {
      canvas.toBlob((blob) => resolve(blob), type, quality);
    } catch {
      resolve(null);
    }
  });
}

/** يتأكد أن محتوى الملف WebP فعلًا (RIFF....WEBP) وليس مجرد امتداد */
async function isRealWebP(blob) {
  if (!blob || blob.size < 12) return false;
  const head = new Uint8Array(await blob.slice(0, 12).arrayBuffer());
  const text = (from, to) => String.fromCharCode(...head.slice(from, to));
  return text(0, 4) === 'RIFF' && text(8, 12) === 'WEBP';
}

/** بعض المتصفحات (خصوصًا Safari القديم) لا تشفّر WebP عبر Canvas وتعيد PNG، فنستخدم مشفّر WASM */
async function encodeWithWasm(canvas, ctx) {
  const { default: encode } = await import('@jsquash/webp/encode');
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const buffer = await encode(imageData, { quality: Math.round(QUALITY * 100) });
  return new Blob([buffer], { type: 'image/webp' });
}

/**
 * يحوّل صورة الوصل داخل المتصفح إلى WebP حقيقي (تصغير + جودة 0.8).
 * يعيد File من نوع image/webp، أو يرمي AppError برسالة عربية.
 */
export async function convertToWebP(file) {
  if (!file || !isAcceptedFile(file)) {
    throw new AppError('الصيغ المقبولة: JPG أو PNG أو WEBP فقط.');
  }
  if (file.size > MAX_ORIGINAL_BYTES) {
    throw new AppError('حجم الصورة كبير جدًا (الحد الأقصى 15 ميغابايت).');
  }

  let image;
  try {
    image = await decodeImage(file);
  } catch {
    throw new AppError(CONVERT_FAILED);
  }

  try {
    const { width, height } = sizeOf(image);
    if (!width || !height) throw new Error('empty-image');

    const scale = Math.min(1, MAX_SIDE / Math.max(width, height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) throw new Error('no-canvas');
    // خلفية بيضاء حتى لا تصبح الأجزاء الشفافة (PNG) سوداء
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

    let blob = await canvasToBlob(canvas, 'image/webp', QUALITY);
    if (blob?.type !== 'image/webp' || !(await isRealWebP(blob))) {
      blob = await encodeWithWasm(canvas, ctx);
    }
    if (!(await isRealWebP(blob))) throw new Error('not-webp');
    if (blob.size > MAX_WEBP_BYTES) throw new AppError('حجم الصورة كبير جدًا حتى بعد الضغط، جرّب صورة أخرى.');

    return new File([blob], 'receipt.webp', { type: 'image/webp', lastModified: Date.now() });
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError(CONVERT_FAILED);
  } finally {
    image?.close?.();
  }
}
