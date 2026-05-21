import { useCallback } from 'react';
import { useSettingsQuery } from './queries';
import { formatDisplayDate } from '../utils/dateUtils';
import type { DateFormatPreference } from '../types';

/**
 * Returns a date formatter that uses the user's preferred date format
 * from settings. Falls back to 'MMM d, yyyy' if settings haven't loaded.
 *
 * Usage:
 *   const formatDate = useDateFormat();
 *   formatDate('2025-03-15'); // uses settings.dateFormat
 *   formatDate('2025-03-15', 'yyyy-MM-dd'); // explicit override
 */
export const useDateFormat = () => {
  const { data: settings } = useSettingsQuery();
  const dateFormat: DateFormatPreference = settings?.dateFormat ?? 'MMM d, yyyy';

  return useCallback(
    (dateStr: string, overrideFormat?: string) =>
      formatDisplayDate(dateStr, overrideFormat ?? dateFormat),
    [dateFormat]
  );
};
