export default function CardSkeletons({ count = 3 }) {
  return (
    <div className="av-grid" role="status" aria-label="جارٍ تحميل المواعيد">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="card av-card skeleton-card" aria-hidden="true">
          <span className="sk sk-icon" />
          <span className="sk sk-line" />
          <span className="sk sk-line short" />
          <span className="sk sk-btn" />
        </div>
      ))}
    </div>
  );
}
