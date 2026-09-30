export const RESERVATION_STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  REJECTED: 'rejected',
};

export const AVAILABILITY_STATUS = {
  AVAILABLE: 'available',
  FULL: 'full',
  COMPLETED: 'completed',
  EMPTY: 'empty',
};

/** الصيغ المقبولة لصورة الوصل */
export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const ACCEPTED_IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp'];
/** الحد الأقصى للصورة الأصلية قبل التحويل */
export const MAX_ORIGINAL_BYTES = 15 * 1024 * 1024;
/** الحد الأقصى لملف WebP الناتج (يجب أن يبقى أقل من حد storage.rules = 3MB) */
export const MAX_WEBP_BYTES = 2.5 * 1024 * 1024;
