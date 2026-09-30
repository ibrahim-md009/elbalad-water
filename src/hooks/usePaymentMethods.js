import { useCallback, useEffect, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { COLLECTIONS } from '../config/app';

/** طرق الدفع المفعّلة فقط (enabled = true) — تحديث لحظي */
export function usePaymentMethods() {
  const [state, setState] = useState({ items: [], loading: true, error: null });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    setState((s) => ({ ...s, loading: true, error: null }));
    const q = query(collection(db, COLLECTIONS.paymentMethods), where('enabled', '==', true));
    return onSnapshot(
      q,
      (snap) => {
        const items = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((m) => (m.accountNumber || '').trim())
          .sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0));
        setState({ items, loading: false, error: null });
      },
      (error) => setState({ items: [], loading: false, error }),
    );
  }, [attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  return { ...state, retry };
}
