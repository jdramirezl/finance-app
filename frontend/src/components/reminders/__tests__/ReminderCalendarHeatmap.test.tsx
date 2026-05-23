import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, within } from '../../../test/testUtils';
import userEvent from '@testing-library/user-event';
import { format } from 'date-fns';
import ReminderCalendarHeatmap from '../ReminderCalendarHeatmap';
import type { Reminder } from '../../../services/reminderService';

// Pin "now" to mid-month so the calendar shows a stable June 2025 view and
// the future-projection logic produces reproducible occurrences.
const FIXED_NOW = new Date('2025-06-15T12:00:00Z');

const onceReminder: Reminder = {
  id: 'rem-once',
  userId: 'user-1',
  title: 'Internet bill',
  amount: 50,
  dueDate: '2025-06-20',
  isPaid: false,
  recurrence: { type: 'once', interval: 1, endType: 'never' },
  createdAt: '2025-01-01T00:00:00Z',
  updatedAt: '2025-01-01T00:00:00Z',
};

const monthlyReminder: Reminder = {
  id: 'rem-monthly',
  userId: 'user-1',
  title: 'Rent',
  amount: 1500,
  dueDate: '2025-06-01',
  isPaid: false,
  recurrence: { type: 'monthly', interval: 1, endType: 'never' },
  createdAt: '2025-01-01T00:00:00Z',
  updatedAt: '2025-01-01T00:00:00Z',
};

const sameDayReminder: Reminder = {
  id: 'rem-sameday',
  userId: 'user-1',
  title: 'Streaming',
  amount: 15,
  dueDate: '2025-06-20',
  isPaid: false,
  recurrence: { type: 'once', interval: 1, endType: 'never' },
  createdAt: '2025-01-01T00:00:00Z',
  updatedAt: '2025-01-01T00:00:00Z',
};

describe('ReminderCalendarHeatmap', () => {
  beforeEach(() => {
    // Only fake the Date constructor — userEvent relies on real setTimeout
    // for its async pointer-event sequencing, so leaving timers alone keeps
    // hover/click tests from hanging.
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(FIXED_NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('rendering', () => {
    it('renders the current month label', () => {
      render(<ReminderCalendarHeatmap reminders={[]} />);

      expect(screen.getByText(format(FIXED_NOW, 'MMMM yyyy'))).toBeInTheDocument();
    });

    it('renders all weekday headers in Monday-first order', () => {
      render(<ReminderCalendarHeatmap reminders={[]} />);

      ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].forEach((weekday) => {
        expect(screen.getByText(weekday)).toBeInTheDocument();
      });
    });

    it('renders without crashing when given an empty reminder list', () => {
      const { container } = render(<ReminderCalendarHeatmap reminders={[]} />);

      // No occurrence dots should be present in the grid.
      expect(container.querySelectorAll('.bg-blue-500\\/50').length).toBe(0);
      expect(container.querySelectorAll('.bg-blue-500\\/70').length).toBe(0);
    });

    it('renders the month grid covering the focused month', () => {
      render(<ReminderCalendarHeatmap reminders={[]} />);

      // Days that fall solely inside June 2025 (between the leading May and
      // trailing July spillover rows) appear exactly once.
      expect(screen.getByText('15')).toBeInTheDocument();
      expect(screen.getByText('20')).toBeInTheDocument();
      // Day 1 appears in both June and July within the visible range.
      expect(screen.getAllByText('1').length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('month navigation', () => {
    it('navigates to the previous month when the left chevron is clicked', async () => {
      const user = userEvent.setup();
      const { container } = render(<ReminderCalendarHeatmap reminders={[]} />);

      // Two icon-only buttons sit on either side of the month label.
      const navButtons = container.querySelectorAll('button');
      expect(navButtons.length).toBeGreaterThanOrEqual(2);

      await user.click(navButtons[0]);

      expect(screen.getByText('May 2025')).toBeInTheDocument();
      expect(screen.queryByText('June 2025')).not.toBeInTheDocument();
    });

    it('navigates to the next month when the right chevron is clicked', async () => {
      const user = userEvent.setup();
      const { container } = render(<ReminderCalendarHeatmap reminders={[]} />);

      const navButtons = container.querySelectorAll('button');
      await user.click(navButtons[navButtons.length - 1]);

      expect(screen.getByText('July 2025')).toBeInTheDocument();
      expect(screen.queryByText('June 2025')).not.toBeInTheDocument();
    });

    it('returns to the original month after navigating back and forth', async () => {
      const user = userEvent.setup();
      const { container } = render(<ReminderCalendarHeatmap reminders={[]} />);

      const navButtons = container.querySelectorAll('button');
      await user.click(navButtons[navButtons.length - 1]); // forward
      await user.click(navButtons[0]); // back

      expect(screen.getByText('June 2025')).toBeInTheDocument();
    });
  });

  describe('occurrence dots', () => {
    it('renders an occurrence dot on the day a one-off reminder is due', () => {
      const { container } = render(
        <ReminderCalendarHeatmap reminders={[onceReminder]} />
      );

      // Single-occurrence days use the lightest opacity dot class.
      const lowDots = container.querySelectorAll('.bg-blue-500\\/50');
      expect(lowDots.length).toBeGreaterThan(0);
    });

    it('renders dots for monthly recurring reminders this month', () => {
      const { container } = render(
        <ReminderCalendarHeatmap reminders={[monthlyReminder]} />
      );

      // The June 1 base occurrence should produce at least one dot.
      const dots = container.querySelectorAll('[class*="bg-blue-500"]');
      expect(dots.length).toBeGreaterThan(0);
    });

    it('renders a denser dot when two reminders fall on the same day', () => {
      const { container } = render(
        <ReminderCalendarHeatmap reminders={[onceReminder, sameDayReminder]} />
      );

      // count === 2 → bg-blue-500/70 class
      const mediumDots = container.querySelectorAll('.bg-blue-500\\/70');
      expect(mediumDots.length).toBeGreaterThan(0);
    });
  });

  describe('hover tooltip', () => {
    it('shows the reminder title and amount on hover for a day with reminders', async () => {
      const user = userEvent.setup();
      render(<ReminderCalendarHeatmap reminders={[onceReminder]} />);

      // The day cell containing "20" is the parent of the day number span.
      const dayNumber = screen.getByText('20');
      const dayCell = dayNumber.parentElement as HTMLElement;
      await user.hover(dayCell);

      expect(
        await screen.findByText(/Internet bill - \$50/)
      ).toBeInTheDocument();
    });

    it('hides the tooltip when the mouse leaves the day cell', async () => {
      const user = userEvent.setup();
      render(<ReminderCalendarHeatmap reminders={[onceReminder]} />);

      const dayCell = screen.getByText('20').parentElement as HTMLElement;
      await user.hover(dayCell);
      expect(
        await screen.findByText(/Internet bill - \$50/)
      ).toBeInTheDocument();

      await user.unhover(dayCell);
      expect(
        screen.queryByText(/Internet bill - \$50/)
      ).not.toBeInTheDocument();
    });

    it('does not show a tooltip on hover for a day with no reminders', async () => {
      const user = userEvent.setup();
      render(<ReminderCalendarHeatmap reminders={[onceReminder]} />);

      // Day 25 in June 2025 has no occurrences in our fixture.
      const emptyDay = screen.getByText('25').parentElement as HTMLElement;
      await user.hover(emptyDay);

      // Tooltip text from the only reminder should not appear.
      expect(screen.queryByText(/Internet bill - \$50/)).not.toBeInTheDocument();
    });

    it('lists multiple reminders in the tooltip when several share a day', async () => {
      const user = userEvent.setup();
      render(
        <ReminderCalendarHeatmap reminders={[onceReminder, sameDayReminder]} />
      );

      const dayCell = screen.getByText('20').parentElement as HTMLElement;
      await user.hover(dayCell);

      expect(
        await screen.findByText(/Internet bill - \$50/)
      ).toBeInTheDocument();
      expect(screen.getByText(/Streaming - \$15/)).toBeInTheDocument();
    });
  });

  describe('today indicator', () => {
    it('highlights today with a ring class', () => {
      const { container } = render(<ReminderCalendarHeatmap reminders={[]} />);

      // FIXED_NOW is June 15 → that cell carries the ring class.
      const todayLabel = within(container).getByText(
        String(FIXED_NOW.getDate())
      );
      const todayCell = todayLabel.parentElement as HTMLElement;
      expect(todayCell.className).toContain('ring-1');
    });
  });
});
