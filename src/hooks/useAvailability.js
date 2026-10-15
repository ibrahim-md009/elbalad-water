import { useCallback, useEffect, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { COLLECTIONS } from '../config/app';
import { AVAILABILITY_STATUS } from '../lib/constants';

/** الدفعات القابلة للحجز فعليًا فقط (availableMinutes > 0 وحالتها available) — تحديث لحظي */
export function useAvailability() {
  const [state, setState] = useState({ items: [], loading: true, error: null });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    setState((s) => ({ ...s, loading: true, error: null }));
    const q = query(collection(db, COLLECTIONS.availability), where('availableMinutes', '>', 0));
    return onSnapshot(
      q,
      (snap) => {
        const items = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((a) => a.status === AVAILABILITY_STATUS.AVAILABLE && Number(a.availableMinutes) > 0)
          .sort((a, b) => (Number(a.number) || 0) - (Number(b.number) || 0));
        setState({ items, loading: false, error: null });
      },
      (error) => setState({ items: [], loading: false, error }),
    );
  }, [attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  return { ...state, retry };
}
