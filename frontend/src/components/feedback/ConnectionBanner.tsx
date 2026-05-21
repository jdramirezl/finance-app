import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';

/**
 * Sticky banner that appears when the browser goes offline.
 * Auto-hides when connectivity is restored.
 */
const ConnectionBanner = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="sticky top-0 z-50 flex items-center justify-center gap-2 bg-red-600 px-4 py-2 text-sm text-white">
      <WifiOff className="h-4 w-4" />
      <span>You're offline. Changes won't be saved.</span>
    </div>
  );
};

export default ConnectionBanner;
