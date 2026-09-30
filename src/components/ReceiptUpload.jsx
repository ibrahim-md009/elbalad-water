import { useEffect, useRef, useState } from 'react';
import { ImagePlus, Loader2, Trash2 } from 'lucide-react';
import { convertToWebP } from '../lib/image';
import { toArabicError } from '../lib/errors';

const formatKB = (bytes) => `${Math.max(1, Math.round(bytes / 1024))} ك.ب`;

/**
 * اختيار صورة الوصل: تُحوَّل فورًا داخل المتصفح إلى WebP، ويظهر Preview للصورة الناتجة.
 * value = { file (WebP), previewUrl } | null
 */
export default function ReceiptUpload({ value, onChange, disabled = false, error = '' }) {
  const inputRef = useRef(null);
  const previewRef = useRef(null);
  const [converting, setConverting] = useState(false);
  const [localError, setLocalError] = useState('');

  useEffect(() => {
    previewRef.current = value?.previewUrl || null;
  }, [value]);

  // تحرير رابط المعاينة عند الإزالة/الإغلاق
  useEffect(() => () => previewRef.current && URL.revokeObjectURL(previewRef.current), []);

  const clear = () => {
    if (value?.previewUrl) URL.revokeObjectURL(value.previewUrl);
    setLocalError('');
    onChange(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  const onPick = async (e) => {
    const file = e.target.files?.[0];
    if (inputRef.current) inputRef.current.value = ''; // يسمح باختيار نفس الصورة مجددًا
    if (!file) return;

    setLocalError('');
    setConverting(true);
    try {
      const webp = await convertToWebP(file);
      if (value?.previewUrl) URL.revokeObjectURL(value.previewUrl);
      onChange({ file: webp, previewUrl: URL.createObjectURL(webp) });
    } catch (err) {
      onChange(null);
      setLocalError(toArabicError(err));
    } finally {
      setConverting(false);
    }
  };

  const message = localError || error;

  return (
    <div className="field">
      <label htmlFor="receipt-input">صورة وصل الدفع</label>
      <input
        ref={inputRef}
        id="receipt-input"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="visually-hidden"
        onChange={onPick}
        disabled={disabled || converting}
      />

      {converting ? (
        <div className="upload-box upload-busy" role="status">
          <Loader2 className="spin" size={26} aria-hidden="true" />
          <span>جاري تجهيز الصورة...</span>
        </div>
      ) : value ? (
        <div className="upload-preview">
          <img src={value.previewUrl} alt="معاينة وصل الدفع" />
          <div className="upload-preview-foot">
            <span className="field-hint">
              جاهزة للرفع · WebP · {formatKB(value.file.size)}
            </span>
            <span className="upload-actions">
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => inputRef.current?.click()} disabled={disabled}>
                <ImagePlus size={16} aria-hidden="true" /> تغيير
              </button>
              <button type="button" className="btn btn-ghost btn-sm upload-remove" onClick={clear} disabled={disabled}>
                <Trash2 size={16} aria-hidden="true" /> حذف
              </button>
            </span>
          </div>
        </div>
      ) : (
        <button
          type="button"
          className={`upload-box ${message ? 'invalid' : ''}`}
          onClick={() => inputRef.current?.click()}
          disabled={disabled}
        >
          <ImagePlus size={28} aria-hidden="true" />
          <strong>اختر صورة الوصل</strong>
          <span className="field-hint">JPG أو PNG أو WEBP</span>
        </button>
      )}

      {message && <span className="field-error">{message}</span>}
    </div>
  );
}
