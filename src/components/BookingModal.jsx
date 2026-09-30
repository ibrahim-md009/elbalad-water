import { useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, ExternalLink, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import Modal from './Modal';
import ReceiptUpload from './ReceiptUpload';
import { calcPrice } from '../lib/pricing';
import { formatMinutes, formatMoney } from '../lib/format';
import { normalizePhone, validatePhone } from '../lib/phone';
import { toArabicError } from '../lib/errors';
import { withTimeout } from '../lib/timeout';
import { uploadReceipt } from '../services/receipts';
import {
  MINUTES_UNAVAILABLE,
  MINUTES_UNAVAILABLE_MESSAGE,
  assertMinutesAvailable,
  createReservation,
} from '../services/reservations';

const SUBMIT_ERROR = 'حدث خطأ أثناء إرسال الحجز، حاول مرة أخرى.';
const UPLOAD_ERROR = 'تعذر رفع صورة الوصل، حاول مرة أخرى.';

/**
 * item: نسخة حيّة من الدفعة (تتحدث لحظيًا) أو null إن لم تعد متاحة.
 * snapshot: بيانات الدفعة وقت الفتح (للعرض في شاشة النجاح).
 */
export default function BookingModal({ open, item, snapshot, settings, onClose, onGone }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [minutes, setMinutes] = useState('');
  const [notes, setNotes] = useState('');
  const [receipt, setReceipt] = useState(null);
  const [errors, setErrors] = useState({});
  const [phase, setPhase] = useState('idle'); // idle | uploading | submitting | done
  const [formError, setFormError] = useState('');
  const [result, setResult] = useState(null);
  const goneNotified = useRef(false);

  const busy = phase === 'uploading' || phase === 'submitting';
  const available = Number(item?.availableMinutes) || 0;

  // انتهت الدقائق أثناء وجود الزبون داخل الفورم (ليس بسبب حجزه هو)
  useEffect(() => {
    if (!open || phase !== 'idle' || goneNotified.current) return;
    if (!item || available < 1) {
      goneNotified.current = true;
      onGone(MINUTES_UNAVAILABLE_MESSAGE);
    }
  }, [open, item, available, phase, onGone]);

  const mins = Number(minutes);
  const minutesValid = minutes !== '' && Number.isInteger(mins) && mins > 0;
  const price = useMemo(() => (minutesValid ? calcPrice(mins, settings) : 0), [minutesValid, mins, settings]);

  const validate = () => {
    const next = {};
    if (!name.trim()) next.name = 'أدخل اسمك الكامل.';
    const phoneError = validatePhone(phone);
    if (phoneError) next.phone = phoneError;
    if (minutes === '') next.minutes = 'أدخل عدد الدقائق.';
    else if (!Number.isInteger(mins) || mins <= 0) next.minutes = 'أدخل عدد دقائق صحيحًا أكبر من صفر.';
    else if (mins > available) next.minutes = `المتاح حاليًا ${formatMinutes(available)} فقط.`;
    if (!receipt) next.receipt = 'أرفق صورة وصل الدفع.';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (busy) return;
    setFormError('');
    if (!validate()) return;

    try {
      // تحقق مبكر من التوفر قبل رفع الصورة
      await withTimeout(assertMinutesAvailable(snapshot.id, mins), 12000, 'تعذر الاتصال بالخادم، تحقق من الإنترنت وحاول مجددًا.');

      setPhase('uploading');
      let receiptUrl;
      try {
        receiptUrl = await withTimeout(uploadReceipt(receipt.file), 45000, UPLOAD_ERROR);
      } catch (uploadErr) {
        console.error('receipt upload failed:', uploadErr?.code, uploadErr);
        setPhase('idle');
        setFormError(UPLOAD_ERROR);
        return;
      }

      setPhase('submitting');
      await withTimeout(
        createReservation({
          name,
          phone: normalizePhone(phone),
          minutes: mins,
          availabilityId: snapshot.id,
          receiptUrl,
          notes,
        }),
        25000,
        SUBMIT_ERROR,
      );
      setResult({ minutes: mins, price, dateText: snapshot.dateText });
      setPhase('done');
    } catch (err) {
      console.error('reservation failed:', err?.code, err);
      if (err?.code === MINUTES_UNAVAILABLE) {
        goneNotified.current = true;
        setPhase('idle');
        onGone(MINUTES_UNAVAILABLE_MESSAGE);
        return;
      }
      setPhase('idle');
      setFormError(err?.name === 'AppError' ? toArabicError(err) : SUBMIT_ERROR);
    }
  };

  const submitLabel =
    phase === 'uploading' ? 'جاري رفع الوصل...' : phase === 'submitting' ? 'جاري إرسال الحجز...' : 'تأكيد الحجز';

  if (phase === 'done' && result) {
    return (
      <Modal open={open} onClose={onClose} title="تم الإرسال" size="booking">
        <div className="success-view">
          <span className="success-icon">
            <CheckCircle2 size={44} aria-hidden="true" />
          </span>
          <h3>تم إرسال طلب الحجز بنجاح</h3>
          <p className="field-hint">طلبك الآن قيد المراجعة.</p>
          <dl className="success-details">
            <div>
              <dt>عدد الدقائق</dt>
              <dd>{formatMinutes(result.minutes)}</dd>
            </div>
            <div>
              <dt>الموعد</dt>
              <dd>{result.dateText}</dd>
            </div>
            <div>
              <dt>السعر</dt>
              <dd>{formatMoney(result.price)}</dd>
            </div>
          </dl>
          <p className="field-hint">سيتم تأكيد الحجز من المسؤول.</p>
          <button type="button" className="btn btn-primary btn-lg btn-block" onClick={onClose}>
            العودة للحجوزات
          </button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal open={open} onClose={onClose} title="احجز موعدك" size="booking" busy={busy}>
      <form className="form" onSubmit={onSubmit} noValidate>
        <div className="booking-slot">
          <span>الموعد</span>
          <strong>{snapshot?.dateText}</strong>
          <span className="badge badge-success">{formatMinutes(available)} متاحة</span>
        </div>

        <div className="field">
          <label htmlFor="bk-name">الاسم الكامل</label>
          <input
            id="bk-name"
            className={`input ${errors.name ? 'invalid' : ''}`}
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
            maxLength={100}
            disabled={busy}
          />
          {errors.name && <span className="field-error">{errors.name}</span>}
        </div>

        <div className="field">
          <label htmlFor="bk-phone">رقم الهاتف</label>
          <input
            id="bk-phone"
            className={`input ${errors.phone ? 'invalid' : ''}`}
            dir="ltr"
            inputMode="tel"
            autoComplete="tel"
            placeholder="05XXXXXXXX"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            maxLength={20}
            disabled={busy}
          />
          {errors.phone && <span className="field-error">{errors.phone}</span>}
        </div>

        <div className="field">
          <label htmlFor="bk-minutes">عدد الدقائق</label>
          <input
            id="bk-minutes"
            className={`input ${errors.minutes ? 'invalid' : ''}`}
            type="number"
            inputMode="numeric"
            min="1"
            max={available}
            step="1"
            placeholder={`من 1 إلى ${available}`}
            value={minutes}
            onChange={(e) => setMinutes(e.target.value)}
            disabled={busy}
          />
          {errors.minutes && <span className="field-error">{errors.minutes}</span>}
        </div>

        <div className="price-box" aria-live="polite">
          <span>السعر</span>
          <strong>{minutesValid ? formatMoney(price) : '—'}</strong>
        </div>

        <ReceiptUpload value={receipt} onChange={setReceipt} disabled={busy} error={errors.receipt} />
        <Link to="/payment" target="_blank" rel="noreferrer" className="link-inline">
          طرق الدفع وأرقام التحويل <ExternalLink size={14} aria-hidden="true" />
        </Link>

        <div className="field">
          <label htmlFor="bk-notes">
            ملاحظات <span className="optional">(اختياري)</span>
          </label>
          <textarea
            id="bk-notes"
            className="input textarea"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            maxLength={300}
            disabled={busy}
          />
        </div>

        {formError && (
          <div className="alert alert-error" role="alert">
            <span>{formError}</span>
          </div>
        )}

        <div className="booking-actions">
          <button type="submit" className="btn btn-primary btn-lg btn-block" disabled={busy}>
            {busy && <Loader2 className="spin" size={18} aria-hidden="true" />}
            {submitLabel}
          </button>
        </div>
      </form>
    </Modal>
  );
}
