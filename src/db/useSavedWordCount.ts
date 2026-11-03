import { useEffect, useState } from 'react';
import { countSavedWords } from './savedWords';

// Returns the number of saved words. Re-reads when `refreshToken` changes.
// Pass a new token (e.g. Date.now()) to trigger a re-read after a save or delete.
export function useSavedWordCount(refreshToken: number): number {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    countSavedWords()
      .then((n) => {
        if (!cancelled) setCount(n);
      })
      .catch(() => {
        if (!cancelled) setCount(0);
      });
    return () => {
      cancelled = true;
    };
  }, [refreshToken]);

  return count;
}