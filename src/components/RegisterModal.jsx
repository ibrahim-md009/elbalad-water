import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import Modal from './Modal';
import { useCustomer } from '../context/CustomerContext';
import { useToast } from '../context/ToastContext';
import { toArabicError } from '../lib/errors';
import { validatePhone } from '../lib/phone';
import { withTimeout } from '../lib/timeout';

/** تسجيل لمرة واحدة: الاسم ورقم الهاتف. بعدها لا يُطلبان منه مجددًا. */
export default function RegisterModal({ open, onClose, onDone }) {
  const { register } = useCustomer();
  const toast = useToast();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setFormError('');
    const next = {};
    if (!name.trim()) next.name = 'أدخل اسمك الكامل.';
    const phoneError = validatePhone(phone);
    if (phoneError) next.phone = phoneError;
    setErrors(next);
    if (Object.keys(next).length) return;

    setLoading(true);
    try {
      const c = await withTimeout(
        register({ name, phone }),
        20000,
        'تعذر الاتصال بالخادم، تحقق من الإنترنت وحاول مجددًا.',
      );
      toast.success(c.existing ? `أهلًا بعودتك ${c.name}` : 'تم تسجيلك بنجاح');
      onDone?.(c);
    } catch (err) {
      console.error('register failed:', err?.code, err);
      setFormError(err?.name === 'AppError' ? err.message : toArabicError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="مرحبًا بك في مياهك" size="md" busy={loading}>
      <form className="form" onSubmit={onSubmit} noValidate>
        <p className="field-hint register-note">
          سجّل اسمك ورقم هاتفك مرة واحدة فقط، ولن نطلبهما منك مرة أخرى عند الحجز.
        </p>

        <div className="field">
          <label htmlFor="rg-name">الاسم الكامل</label>
          <input
            id="rg-name"
            className={`input ${errors.name ? 'invalid' : ''}`}
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
            maxLength={100}
            disabled={loading}
          />
          {errors.name && <span className="field-error">{errors.name}</span>}
        </div>

        <div className="field">
          <label htmlFor="rg-phone">رقم الهاتف</label>
          <input
            id="rg-phone"
            className={`input ${errors.phone ? 'invalid' : ''}`}
            dir="ltr"
            inputMode="tel"
            autoComplete="tel"
            placeholder="05XXXXXXXX"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            maxLength={20}
            disabled={loading}
          />
          {errors.phone && <span className="field-error">{errors.phone}</span>}
        </div>

        {formError && (
          <div className="alert alert-error" role="alert">
            <span>{formError}</span>
          </div>
        )}

        <button type="submit" className="btn btn-primary btn-lg btn-block" disabled={loading}>
          {loading && <Loader2 className="spin" size={18} aria-hidden="true" />}
          {loading ? 'جاري التسجيل...' : 'تسجيل ومتابعة'}
        </button>
      </form>
    </Modal>
  );
}
