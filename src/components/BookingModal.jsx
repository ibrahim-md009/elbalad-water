import { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, ExternalLink, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import Modal from "./Modal";
import ReceiptUpload from "./ReceiptUpload";
import { calcPrice } from "../lib/pricing";
import { formatMinutes, formatMoney } from "../lib/format";
import { useCustomer } from "../context/CustomerContext";
import { toArabicError } from "../lib/errors";
import { withTimeout } from "../lib/timeout";
import { uploadReceipt } from "../services/receipts";
import {
  CUSTOMER_BLOCKED,
  NOT_REGISTERED,
  WEEKLY_LIMIT,
  MINUTES_UNAVAILABLE,
  MINUTES_UNAVAILABLE_MESSAGE,
  assertMinutesAvailable,
  createReservation,
} from "../services/reservations";

const SUBMIT_ERROR = "حدث خطأ أثناء إرسال الحجز، حاول مرة أخرى.";
const UPLOAD_ERROR = "تعذر رفع صورة الوصل، حاول مرة أخرى.";

/**
 * item: نسخة حيّة من الدفعة (تتحدث لحظيًا) أو null إن لم تعد متاحة.
 * snapshot: بيانات الدفعة وقت الفتح (للعرض في شاشة النجاح).
 */
export default function BookingModal({ open, item, snapshot, settings, onClose, onGone }) {
  const { customer, allowance, forget } = useCustomer();
  const [minutes, setMinutes] = useState("");
  const [notes, setNotes] = useState("");
  const [receipt, setReceipt] = useState(null);
  const [errors, setErrors] = useState({});
  const [phase, setPhase] = useState("idle"); // idle | uploading | submitting | done
  const [formError, setFormError] = useState("");
  const [result, setResult] = useState(null);
  const goneNotified = useRef(false);

  const busy = phase === "uploading" || phase === "submitting";
  const available = Number(item?.availableMinutes) || 0;
  const showMinutes = item?.showMinutes === true;

  // انتهت الدقائق أثناء وجود الزبون داخل الفورم (ليس بسبب حجزه هو)
  useEffect(() => {
    if (!open || phase !== "idle" || goneNotified.current) return;
    if (!item || available < 1) {
      goneNotified.current = true;
      onGone(MINUTES_UNAVAILABLE_MESSAGE);
    }
  }, [open, item, available, phase, onGone]);

  // لا يستطيع الحجز: محظور أو استنفد دقائقه الأسبوعية
  const blockedReason = !customer
    ? "سجّل اسمك ورقمك أولًا."
    : allowance?.blocked
      ? "تعذر إتمام الحجز حاليًا، يرجى التواصل مع الإدارة."
      : allowance?.known && allowance.remaining < 1
        ? `استنفدت دقائقك الأسبوعية (${allowance.limit} دقيقة). يتجدد يوم السبت.`
        : "";

  const switchAccount = () => {
    forget();
    onClose();
  };

  // لا نكشف عدد الدقائق المتاحة عبر حدّ الحقل إن كانت مخفية عن العميل
  const caps = [
    showMinutes ? available : null,
    allowance?.known && !allowance.unlimited ? allowance.remaining : null,
  ].filter((n) => n !== null);
  const maxMinutes = caps.length ? Math.min(...caps) : undefined;

  const mins = Number(minutes);
  const minutesValid = minutes !== "" && Number.isInteger(mins) && mins > 0;
  const price = useMemo(() => (minutesValid ? calcPrice(mins, settings) : 0), [minutesValid, mins, settings]);

  const validate = () => {
    const next = {};
    if (minutes === "") next.minutes = "أدخل عدد الدقائق.";
    else if (!Number.isInteger(mins) || mins <= 0) next.minutes = "أدخل عدد دقائق صحيح أكبر من صفر.";
    else if (mins > available) next.minutes = "الرقم المطلوب غير متوفر";
    else if (allowance?.known && !allowance.unlimited && mins > allowance.remaining)
      next.minutes = `المتبقي لك هذا الأسبوع ${allowance.remaining} دقيقة فقط.`;
    if (!receipt) next.receipt = "أرفق صورة وصل الدفع.";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (busy) return;
    setFormError("");
    if (blockedReason) {
      setFormError(blockedReason);
      return;
    }
    if (!validate()) return;

    try {
      // تحقق مبكر من التوفر قبل رفع الصورة
      await withTimeout(
        assertMinutesAvailable(snapshot.id, mins),
        12000,
        "تعذر الاتصال بالخادم، تحقق من الإنترنت وحاول مجددًا.",
      );

      setPhase("uploading");
      let receiptUrl;
      try {
        receiptUrl = await withTimeout(uploadReceipt(receipt.file), 45000, UPLOAD_ERROR);
      } catch (uploadErr) {
        console.error("receipt upload failed:", uploadErr?.code, uploadErr);
        setPhase("idle");
        setFormError(UPLOAD_ERROR);
        return;
      }

      setPhase("submitting");
      await withTimeout(
        createReservation({
          customerPhone: customer.phone,
          minutes: mins,
          availabilityId: snapshot.id,
          receiptUrl,
          notes,
        }),
        25000,
        SUBMIT_ERROR,
      );
      setResult({ minutes: mins, price, dateText: snapshot.dateText });
      setPhase("done");
    } catch (err) {
      console.error("reservation failed:", err?.code, err);
      if (err?.code === MINUTES_UNAVAILABLE) {
        goneNotified.current = true;
        setPhase("idle");
        onGone(MINUTES_UNAVAILABLE_MESSAGE);
        return;
      }
      setPhase("idle");
      if ([WEEKLY_LIMIT, CUSTOMER_BLOCKED, NOT_REGISTERED].includes(err?.code)) {
        setFormError(err.message);
        return;
      }
      setFormError(err?.name === "AppError" ? toArabicError(err) : SUBMIT_ERROR);
    }
  };

  const submitLabel =
    phase === "uploading" ? "جاري رفع الوصل..." : phase === "submitting" ? "جاري إرسال الحجز..." : "تأكيد الحجز";

  if (phase === "done" && result) {
    return (
      <Modal open={open} onClose={onClose} title="تم الإرسال" size="booking">
        <div className="success-view">
          <span className="success-icon">
            <CheckCircle2 size={44} aria-hidden="true" />
          </span>
          <h3>تم إرسال حجزك للمسؤول</h3>
          <p className="field-hint">سيصلك رسالة بتأكيد الحجز عند قبوله.</p>
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
        </div>

        {showMinutes && (
          <div className="booking-slot">
            <span>المتاح</span>
            <strong>{formatMinutes(available)}</strong>
          </div>
        )}

        {customer && (
          <div className="customer-box">
            <div>
              <span>الاسم</span>
              <strong>{customer.name}</strong>
            </div>
            <div>
              <span>رقم الهاتف</span>
              <strong dir="ltr">{customer.phone}</strong>
            </div>
            <button type="button" className="link-btn" onClick={switchAccount} disabled={busy}>
              ليس أنت؟ سجّل برقم آخر
            </button>
          </div>
        )}

        {allowance?.known && !allowance.blocked && (
          <p className={`allowance ${allowance.remaining < 1 ? "is-out" : ""}`}>
            {allowance.unlimited
              ? "دقائقك هذا الأسبوع: بدون حد"
              : `المتبقي لك هذا الأسبوع: ${allowance.remaining} من ${allowance.limit} دقيقة`}
          </p>
        )}

        <div className="field">
          <label htmlFor="bk-minutes">عدد الدقائق</label>
          <input
            id="bk-minutes"
            className={`input ${errors.minutes ? "invalid" : ""}`}
            type="number"
            inputMode="numeric"
            min="1"
            max={maxMinutes}
            step="1"
            placeholder="كم دقيقة تحتاج ؟"
            value={minutes}
            onChange={(e) => setMinutes(e.target.value)}
            disabled={busy}
          />
          {errors.minutes && <span className="field-error">{errors.minutes}</span>}
        </div>

        <div className="price-box" aria-live="polite">
          <span>السعر</span>
          <strong>{minutesValid ? formatMoney(price) : "—"}</strong>
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
          <button type="submit" className="btn btn-primary btn-lg btn-block" disabled={busy || !!blockedReason}>
            {busy && <Loader2 className="spin" size={18} aria-hidden="true" />}
            {submitLabel}
          </button>
        </div>
      </form>
    </Modal>
  );
}
