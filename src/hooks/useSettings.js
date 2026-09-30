import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { COLLECTIONS, SETTINGS_DOC } from '../config/app';
import { normalizeSettings } from '../lib/pricing';

/** settings/general (minutesPerCup, pricePerCup) — تحديث لحظي */
export function useSettings() {
  const [settings, setSettings] = useState(() => normalizeSettings(null));

  useEffect(
    () =>
      onSnapshot(
        doc(db, COLLECTIONS.settings, SETTINGS_DOC),
        (snap) => setSettings(normalizeSettings(snap.exists() ? snap.data() : null)),
        () => setSettings(normalizeSettings(null)),
      ),
    [],
  );

  return settings;
}
