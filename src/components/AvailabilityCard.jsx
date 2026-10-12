import { Clock, Droplets } from "lucide-react";
import { formatMinutes } from "../lib/format";

export default function AvailabilityCard({ item, onBook }) {
  return (
    <article className="card av-card">
      <div className="av-top">
        <span className="av-icon">
          <Droplets size={22} aria-hidden="true" />
        </span>
        <span className="badge badge-success">متوفر</span>
      </div>
      <h3 className="av-minutes">متوفر حجز</h3>
      <p className="av-date">
        <Clock size={16} aria-hidden="true" />
        <span>{item.dateText}</span>
      </p>
      <p>{item.notes}</p>
      <button type="button" className="btn btn-primary btn-lg btn-block" onClick={() => onBook(item)}>
        احجز الآن
      </button>
    </article>
  );
}
