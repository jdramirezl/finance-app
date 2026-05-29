import type { Currency } from '../types';

export interface PhantomPoint {
  date: string;
  total: number;
  breakdown: Record<string, number>;
  isPhantom: true;
  isAnchor: true;
}

export interface UsePhantomNetWorthPointParams {
  totalsByCurrency: Record<Currency, number>;
  consolidatedTotal: number;
  isReady: boolean;
}

export const usePhantomNetWorthPoint = ({
  totalsByCurrency,
  consolidatedTotal,
  isReady,
}: UsePhantomNetWorthPointParams): { data: PhantomPoint | null; isLoading: boolean } => {
  if (!isReady || consolidatedTotal === 0) {
    return { data: null, isLoading: !isReady };
  }

  return {
    data: {
      date: new Date().toISOString().slice(0, 10),
      total: consolidatedTotal,
      breakdown: { ...totalsByCurrency },
      isPhantom: true,
      isAnchor: true,
    },
    isLoading: false,
  };
};
