import { useEffect, useState } from 'react';
import { CalendarClock, Phone, UserRound } from 'lucide-react';
import EmptyState from '../components/EmptyState';
import LoadingState from '../components/LoadingState';
import RegisterModal from '../components/RegisterModal';
import { useCustomer } from '../context/CustomerContext';
import { formatDate, formatMinutes, formatNumber } from '../lib/format';
import { nextWeekStart } from '../lib/week';

/** صفحة «بياناتي»: اسم العميل ورقمه والدقائق المتبقية له هذا الأسبوع. */
export default function MyData() {
  const { status, customer, allowance } = useCustomer();
  const [regOpen, setRegOpen] = useState(false);

  useEffect(() => {
    document.title = 'مياهك | بياناتي';
  }, []);

  return (
    <>
      <section className="hero">
        <h1>بياناتي</h1>
        <p>تعرّف على دقائقك المتبقية لهذا الأسبوع.</p>
      </section>

      {status === 'guest' ? (
        <EmptyState
          icon={UserRound}
          title="لم تسجّل بعد"
          text="سجّل اسمك ورقمك لتعرف دقائقك المتبقية."
          action={
            <button type="button" className="btn btn-primary" onClick={() => setRegOpen(true)}>
              تسجيل
            </button>
          }
        />
      ) : !customer || !allowance?.known ? (
        <LoadingState label="جارٍ تحميل بياناتك..." />
      ) : (
        <MyDataCard customer={customer} allowance={allowance} />
      )}

      <RegisterModal open={regOpen && status === 'guest'} onClose={() => setRegOpen(false)} onDone={() => setRegOpen(false)} />
    </>
  );
}

function MyDataCard({ customer, allowance }) {
  const { limit, used, remaining, unlimited, blocked } = allowance;
  const usedPct = limit > 0 ? Math.min(100, (used / limit) * 100) : 0;

  return (
    <article className="card me-card">
      <ul className="me-info">
        <li>
          <UserRound size={18} aria-hidden="true" />
          <span>{customer.name}</span>
        </li>
        <li>
          <Phone size={18} aria-hidden="true" />
          <span dir="ltr">{customer.phone}</span>
        </li>
      </ul>

      <div className={`me-remaining ${!unlimited && remaining < 1 ? 'is-out' : ''}`}>
        <span className="me-remaining-label">المتبقي لك هذا الأسبوع</span>
        <strong className="me-remaining-value">{unlimited ? 'بدون حد' : formatMinutes(remaining)}</strong>
      </div>

      {!unlimited && (
        <>
          <div className="me-progress" aria-hidden="true">
            <span style={{ width: `${usedPct}%` }} />
          </div>
          <p className="field-hint">
            استخدمت {formatNumber(used)} من {formatNumber(limit)} دقيقة
          </p>
        </>
      )}

      {blocked && (
        <div className="alert alert-error" role="alert">
          <span>تعذر الحجز حاليًا، يرجى التواصل مع الإدارة.</span>
        </div>
      )}

      <p className="me-renew">
        <CalendarClock size={16} aria-hidden="true" />
        <span>يتجدد رصيدك يوم السبت {formatDate(nextWeekStart(new Date()))}</span>
      </p>
    </article>
  );
}
