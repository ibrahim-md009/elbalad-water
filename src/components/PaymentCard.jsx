import { useEffect, useRef, useState } from 'react';
import { Check, Copy, Landmark } from 'lucide-react';

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // بديل للمتصفحات/الصفحات غير الآمنة (بعض أجهزة iPhone)
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    area.setSelectionRange(0, text.length);
    let ok = false;
    try {
      ok = document.execCommand('copy');
    } catch {
      ok = false;
    }
    document.body.removeChild(area);
    return ok;
  }
}

export default function PaymentCard({ method }) {
  const [copied, setCopied] = useState(false);
  const [logoFailed, setLogoFailed] = useState(false);
  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);

  const onCopy = async () => {
    if (!(await copyText(method.accountNumber))) return;
    setCopied(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 2000);
  };

  return (
    <article className="card pay-card">
      <header className="pay-head">
        <span className="payment-logo">
          {method.logoUrl && !logoFailed ? (
            <img src={method.logoUrl} alt="" onError={() => setLogoFailed(true)} />
          ) : (
            <Landmark size={24} aria-hidden="true" />
          )}
        </span>
        <h3>{method.name}</h3>
      </header>

      {method.accountName && (
        <div className="pay-row">
          <span className="field-hint">اسم الحساب</span>
          <strong>{method.accountName}</strong>
        </div>
      )}
      <div className="pay-row">
        <span className="field-hint">رقم التحويل / الحساب</span>
        <strong className="pay-number" dir="ltr">
          {method.accountNumber}
        </strong>
      </div>

      <button type="button" className={`btn btn-lg btn-block ${copied ? 'btn-success' : 'btn-ghost'}`} onClick={onCopy}>
        {copied ? <Check size={18} aria-hidden="true" /> : <Copy size={18} aria-hidden="true" />}
        {copied ? 'تم النسخ ✓' : 'نسخ الرقم'}
      </button>
    </article>
  );
}
