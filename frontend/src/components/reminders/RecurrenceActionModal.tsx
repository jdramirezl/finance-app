import Modal from '../Modal';
import Button from '../Button';

interface RecurrenceActionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAction: (scope: 'this' | 'all' | 'future') => void;
    actionType: 'edit' | 'delete';
}

const RecurrenceActionModal = ({ isOpen, onClose, onAction, actionType }: RecurrenceActionModalProps) => {
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={actionType === 'edit' ? 'Edit Recurring Reminder' : 'Delete Recurring Reminder'}
            size="sm"
        >
            <div className="space-y-4">
                <p className="text-gray-600 dark:text-gray-300">
                    This is a recurring reminder. How would you like to apply this change?
                </p>
                <div className="flex flex-col gap-2">
                    <Button
                        variant="secondary"
                        onClick={() => onAction('this')}
                        className="w-full justify-start"
                    >
                        {actionType === 'edit' ? 'Edit this occurrence only' : 'Delete this occurrence only'}
                    </Button>
                    <Button
                        variant="secondary"
                        onClick={() => onAction('future')}
                        className="w-full justify-start"
                    >
                        {actionType === 'edit' ? 'Edit this and following events' : 'Delete this and following events'}
                    </Button>
                    <Button
                        variant="primary"
                        onClick={() => onAction('all')}
                        className="w-full justify-start"
                    >
                        {actionType === 'edit' ? 'Edit all events in series' : 'Delete all events in series'}
                    </Button>
                </div>
                <div className="flex justify-end pt-2 border-t border-gray-200 dark:border-gray-700">
                    <Button variant="ghost" onClick={onClose}>
                        Cancel
                    </Button>
                </div>
            </div>
        </Modal>
    );
};

export default RecurrenceActionModal;
