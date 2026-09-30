import { useCallback, useEffect, useState } from 'react';
import { CalendarX } from 'lucide-react';
import { useAvailability } from '../hooks/useAvailability';
import { useSettings } from '../hooks/useSettings';
import { useToast } from '../context/ToastContext';
import AvailabilityCard from '../components/AvailabilityCard';
import BookingModal from '../components/BookingModal';
import CardSkeletons from '../components/CardSkeletons';
import EmptyState from '../components/EmptyState';
import ErrorState from '../components/ErrorState';
import { toArabicError } from '../lib/errors';

export default function Home() {
  const { items, loading, error, retry } = useAvailability();
  const settings = useSettings();
  const toast = useToast();
  const [selected, setSelected] = useState(null); // نسخة وقت الفتح
  const live = selected ? items.find((a) => a.id === selected.id) || null : null;

  useEffect(() => {
    document.title = 'مياهك | احجز موعد تعبئة المياه';
  }, []);

  const close = useCallback(() => setSelected(null), []);
  const onGone = useCallback(
    (message) => {
      toast.error(message);
      setSelected(null);
    },
    [toast],
  );

  return (
    <>
      <section className="hero">
        <h1>احجز موعد تعبئة المياه</h1>
        <p>اختر الوقت المناسب لك واحجز بالدقائق.</p>
      </section>

      {loading ? (
        <CardSkeletons />
      ) : error ? (
        <div className="stack">
          <ErrorState message={toArabicError(error)} />
          <button type="button" className="btn btn-primary" onClick={retry}>
            إعادة المحاولة
          </button>
        </div>
      ) : items.length === 0 ? (
        <EmptyState icon={CalendarX} title="لا توجد مواعيد متاحة حاليًا" text="سنضيف مواعيد جديدة قريبًا." />
      ) : (
        <div className="av-grid">
          {items.map((item) => (
            <AvailabilityCard key={item.id} item={item} onBook={setSelected} />
          ))}
        </div>
      )}

      {selected && (
        <BookingModal
          key={selected.id}
          open
          item={live}
          snapshot={selected}
          settings={settings}
          onClose={close}
          onGone={onGone}
        />
      )}
    </>
  );
}
