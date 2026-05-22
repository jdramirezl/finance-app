import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '../../../test/testUtils';
import userEvent from '@testing-library/user-event';
import RemindersWidget from '../RemindersWidget';
import type { Reminder } from '../../../services/reminderService';
import type { Settings } from '../../../types';

// JSDOM does not implement Element.scrollIntoView. The widget calls it in
// an effect when the upcoming list renders, so stub it once for the suite.
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = vi.fn();
}

// State that test cases can mutate before render to drive query/action mocks.
const mockState: {
  reminders: Reminder[];
  isLoading: boolean;
  settings: Settings | undefined;
  actions: {
    isFormOpen: boolean;
    editingReminder: Reminder | null;
    isEditingException: boolean;
    isSaving: boolean;
  };
} = {
  reminders: [],
  isLoading: false,
  settings: undefined,
  actions: {
    isFormOpen: false,
    editingReminder: null,
    isEditingException: false,
    isSaving: false,
  },
};

const openCreateForm = vi.fn();
const closeForm = vi.fn();
const closeRecurrenceModal = vi.fn();
const closeMarkAsPaid = vi.fn();
const handlePayNow = vi.fn();
const handleEdit = vi.fn();
const handleDelete = vi.fn();
const handleMarkAsPaid = vi.fn();
const handleConfirmMarkAsPaid = vi.fn();
const handleRecurrenceAction = vi.fn();
const handleCreate = vi.fn();
const handleUpdate = vi.fn();

vi.mock('../../../hooks/queries', () => ({
  useRemindersQuery: () => ({ data: mockState.reminders, isLoading: mockState.isLoading }),
  useSettingsQuery: () => ({ data: mockState.settings }),
  useReminderMutations: () => ({
    createMutation: { mutateAsync: vi.fn(), isPending: false },
    updateMutation: { mutateAsync: vi.fn(), isPending: false },
    deleteMutation: { mutateAsync: vi.fn(), mutate: vi.fn(), isPending: false },
    createExceptionMutation: { mutateAsync: vi.fn(), isPending: false },
    splitMutation: { mutateAsync: vi.fn(), isPending: false },
  }),
}));

vi.mock('../../../hooks/actions/useReminderActions', () => ({
  useReminderActions: () => ({
    isFormOpen: mockState.actions.isFormOpen,
    editingReminder: mockState.actions.editingReminder,
    isEditingException: mockState.actions.isEditingException,
    openCreateForm,
    closeForm,
    recurrenceModal: { isOpen: false, type: 'edit', reminder: null },
    closeRecurrenceModal,
    markAsPaidReminder: null,
    closeMarkAsPaid,
    handlePayNow,
    handleEdit,
    handleDelete,
    handleMarkAsPaid,
    handleConfirmMarkAsPaid,
    handleRecurrenceAction,
    handleCreate,
    handleUpdate,
    isSaving: mockState.actions.isSaving,
  }),
}));

// Replace heavy children with simple stubs so the widget's own logic is the
// thing under test.
vi.mock('../MonthSection', () => ({
  default: ({ monthGroup }: { monthGroup: { label: string; reminders: { id: string }[] } }) => (
    <div data-testid="month-section">
      <span>{monthGroup.label}</span>
      <span>{monthGroup.reminders.length} reminder(s)</span>
    </div>
  ),
}));

vi.mock('../ReminderCalendarHeatmap', () => ({
  default: ({ reminders }: { reminders: { id: string }[] }) => (
    <div data-testid="reminder-heatmap">heatmap with {reminders.length} reminders</div>
  ),
}));

vi.mock('../RecurrenceActionModal', () => ({
  default: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div data-testid="recurrence-modal">recurrence</div> : null,
}));

vi.mock('../MarkAsPaidModal', () => ({
  default: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div data-testid="mark-as-paid-modal">mark</div> : null,
}));

vi.mock('../../ui/Modal', () => ({
  default: ({ isOpen, title, children }: { isOpen: boolean; title?: string; children: React.ReactNode }) =>
    isOpen ? (
      <div data-testid="modal" role="dialog" aria-label={title}>
        {children}
      </div>
    ) : null,
}));

vi.mock('../ReminderForm', () => ({
  default: () => <div data-testid="reminder-form">form</div>,
}));

const baseSettings: Settings = {
  primaryCurrency: 'USD',
  dateFormat: 'MMM d, yyyy',
  movementsPerPage: 50,
  reminderAdvanceDays: 7,
  defaultCurrencyForNewAccounts: 'USD',
};

const futureReminder: Reminder = {
  id: 'rem-future',
  userId: 'u1',
  title: 'Internet',
  amount: 50,
  // 10 days in the future so it lands in the current/next month and shows up.
  dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
  isPaid: false,
  recurrence: { type: 'once', interval: 1, endType: 'never' },
  createdAt: '2025-01-01T00:00:00Z',
  updatedAt: '2025-01-01T00:00:00Z',
};

const overdueReminder: Reminder = {
  id: 'rem-overdue',
  userId: 'u1',
  title: 'Late bill',
  amount: 100,
  dueDate: '2020-01-01',
  isPaid: false,
  recurrence: { type: 'once', interval: 1, endType: 'never' },
  createdAt: '2020-01-01T00:00:00Z',
  updatedAt: '2020-01-01T00:00:00Z',
};

const resetMockState = () => {
  mockState.reminders = [];
  mockState.isLoading = false;
  mockState.settings = baseSettings;
  mockState.actions = {
    isFormOpen: false,
    editingReminder: null,
    isEditingException: false,
    isSaving: false,
  };
};

describe('RemindersWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetMockState();
  });

  describe('loading and empty states', () => {
    it('renders the loading skeleton when remindersQuery is loading', () => {
      mockState.isLoading = true;
      const { container } = render(<RemindersWidget />);

      // Skeleton uses animate-pulse and no header content.
      expect(container.querySelector('.animate-pulse')).not.toBeNull();
      expect(screen.queryByText(/payments & calendar/i)).not.toBeInTheDocument();
    });

    it('renders the empty state when there are no reminders', () => {
      render(<RemindersWidget />);

      expect(screen.getByText(/no reminders yet/i)).toBeInTheDocument();
      expect(
        screen.getByText(/click \+ to add your first payment reminder/i)
      ).toBeInTheDocument();
    });
  });

  describe('header', () => {
    it('renders the Payments & Calendar header and tab buttons', () => {
      render(<RemindersWidget />);

      expect(screen.getByText(/payments & calendar/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /upcoming/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /^calendar$/i })).toBeInTheDocument();
    });

    it('calls openCreateForm when the add button is clicked', async () => {
      const user = userEvent.setup();
      render(<RemindersWidget />);

      await user.click(screen.getByLabelText(/add new reminder/i));
      expect(openCreateForm).toHaveBeenCalledTimes(1);
    });

    it('toggles the show-paid label between "Show paid" and "Hide paid"', async () => {
      const user = userEvent.setup();
      render(<RemindersWidget />);

      const showPaidBtn = screen.getByRole('button', { name: /show paid/i });
      expect(showPaidBtn).toBeInTheDocument();

      await user.click(showPaidBtn);

      expect(screen.getByRole('button', { name: /hide paid/i })).toBeInTheDocument();
    });
  });

  describe('overdue banner', () => {
    it('does not render the banner when there are no overdue reminders', () => {
      mockState.reminders = [futureReminder];
      render(<RemindersWidget />);

      expect(
        screen.queryByText(/you have \d+ overdue payment/i)
      ).not.toBeInTheDocument();
    });

    it('renders the banner with the overdue count when reminders are overdue', () => {
      mockState.reminders = [overdueReminder];
      render(<RemindersWidget />);

      expect(
        screen.getByText(/you have 1 overdue payment/i)
      ).toBeInTheDocument();
    });
  });

  describe('tab switching', () => {
    it('shows the calendar heatmap when the Calendar tab is active', async () => {
      const user = userEvent.setup();
      mockState.reminders = [futureReminder];
      render(<RemindersWidget />);

      // Initially upcoming → MonthSection visible, heatmap hidden.
      expect(screen.queryByTestId('reminder-heatmap')).not.toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: /^calendar$/i }));

      expect(screen.getByTestId('reminder-heatmap')).toBeInTheDocument();
      // Calendar tab also hides the upcoming-only header controls.
      expect(screen.queryByLabelText(/add new reminder/i)).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /show paid/i })).not.toBeInTheDocument();
    });

    it('returns to the upcoming list when clicking the Upcoming tab', async () => {
      const user = userEvent.setup();
      mockState.reminders = [futureReminder];
      render(<RemindersWidget />);

      await user.click(screen.getByRole('button', { name: /^calendar$/i }));
      await user.click(screen.getByRole('button', { name: /upcoming/i }));

      expect(screen.queryByTestId('reminder-heatmap')).not.toBeInTheDocument();
      expect(screen.getByLabelText(/add new reminder/i)).toBeInTheDocument();
    });
  });

  describe('upcoming list', () => {
    it('renders one MonthSection per non-empty month group', () => {
      mockState.reminders = [futureReminder];
      render(<RemindersWidget />);

      // The widget builds month groups from groupRemindersByMonth. We only
      // need to assert that at least one MonthSection is rendered when
      // reminders exist.
      const sections = screen.getAllByTestId('month-section');
      expect(sections.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('form modal', () => {
    it('renders the reminder form modal when isFormOpen is true', () => {
      mockState.actions.isFormOpen = true;
      render(<RemindersWidget />);

      expect(screen.getByTestId('modal')).toBeInTheDocument();
      expect(screen.getByTestId('reminder-form')).toBeInTheDocument();
    });

    it('does not render the form modal when isFormOpen is false', () => {
      render(<RemindersWidget />);
      expect(screen.queryByTestId('modal')).not.toBeInTheDocument();
    });

    it('uses "New Reminder" as the modal title in create mode', () => {
      mockState.actions.isFormOpen = true;
      render(<RemindersWidget />);

      expect(screen.getByRole('dialog')).toHaveAttribute(
        'aria-label',
        'New Reminder'
      );
    });

    it('uses "Edit Reminder" as the modal title when editing a series', () => {
      mockState.actions.isFormOpen = true;
      mockState.actions.editingReminder = futureReminder;
      mockState.actions.isEditingException = false;
      render(<RemindersWidget />);

      expect(screen.getByRole('dialog')).toHaveAttribute(
        'aria-label',
        'Edit Reminder'
      );
    });

    it('uses "Edit This Occurrence" as the modal title when editing a single occurrence', () => {
      mockState.actions.isFormOpen = true;
      mockState.actions.editingReminder = futureReminder;
      mockState.actions.isEditingException = true;
      render(<RemindersWidget />);

      expect(screen.getByRole('dialog')).toHaveAttribute(
        'aria-label',
        'Edit This Occurrence'
      );
    });
  });
});
