import { useEffect, useState } from 'react';

export const useSlowQuery = (isLoading: boolean, thresholdMs = 10_000) => {
  const [isSlow, setIsSlow] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      setIsSlow(false);
      return;
    }
    const timer = setTimeout(() => setIsSlow(true), thresholdMs);
    return () => clearTimeout(timer);
  }, [isLoading, thresholdMs]);

  return isSlow;
};
