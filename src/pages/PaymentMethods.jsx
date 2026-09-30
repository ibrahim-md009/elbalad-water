import { useEffect } from 'react';
import { WalletCards } from 'lucide-react';
import { usePaymentMethods } from '../hooks/usePaymentMethods';
import PaymentCard from '../components/PaymentCard';
import LoadingState from '../components/LoadingState';
import EmptyState from '../components/EmptyState';
import ErrorState from '../components/ErrorState';
import { toArabicError } from '../lib/errors';

export default function PaymentMethods() {
  const { items, loading, error, retry } = usePaymentMethods();

  useEffect(() => {
    document.title = 'مياهك | طرق الدفع';
  }, []);

  return (
    <>
      <section className="hero">
        <h1>طرق الدفع</h1>
        <p>حوّل المبلغ بإحدى الطرق التالية ثم أرفق صورة الوصل عند الحجز.</p>
      </section>

      {loading ? (
        <LoadingState label="جارٍ تحميل طرق الدفع..." />
      ) : error ? (
        <div className="stack">
          <ErrorState message={toArabicError(error)} />
          <button type="button" className="btn btn-primary" onClick={retry}>
            إعادة المحاولة
          </button>
        </div>
      ) : items.length === 0 ? (
        <EmptyState icon={WalletCards} title="لا توجد طرق دفع متاحة حاليًا" text="يرجى المحاولة لاحقًا." />
      ) : (
        <div className="pay-grid">
          {items.map((m) => (
            <PaymentCard key={m.id} method={m} />
          ))}
        </div>
      )}
    </>
  );
}
