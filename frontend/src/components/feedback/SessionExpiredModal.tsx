import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { LogOut } from 'lucide-react';

/**
 * Listens for the `auth:session-expired` custom event (dispatched by
 * apiClient when a 401 cannot be recovered via token refresh) and
 * shows a non-dismissable modal directing the user to sign in again.
 */
const SessionExpiredModal = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const handler = () => setIsOpen(true);
    window.addEventListener('auth:session-expired', handler);
    return () => window.removeEventListener('auth:session-expired', handler);
  }, []);

  const handleSignIn = async () => {
    await signOut();
    setIsOpen(false);
    navigate('/login', { replace: true });
  };

  return (
    <Modal isOpen={isOpen} onClose={() => {}} title="">
      <div className="text-center">
        <div className="flex justify-center mb-4">
          <div className="p-3 rounded-full bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-200 dark:border-amber-800">
            <LogOut className="w-12 h-12 text-amber-600 dark:text-amber-400" />
          </div>
        </div>
        <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
          Session Expired
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Your session has expired. Please sign in again.
        </p>
        <Button variant="primary" onClick={handleSignIn} className="w-full">
          Sign In
        </Button>
      </div>
    </Modal>
  );
};

export default SessionExpiredModal;
