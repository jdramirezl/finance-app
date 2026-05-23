import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '../../../test/testUtils';
import userEvent from '@testing-library/user-event';
import PreferencesSection from '../PreferencesSection';
import type { Settings } from '../../../types';

const baseSettings: Settings = {
  primaryCurrency: 'USD',
  snapshotFrequency: 'weekly',
  dateFormat: 'MMM d, yyyy',
  movementsPerPage: 50,
  reminderAdvanceDays: 7,
  defaultCurrencyForNewAccounts: 'USD',
};

const buildProps = (overrides: Partial<React.ComponentProps<typeof PreferencesSection>> = {}) => ({
  settings: baseSettings,
  isUpdating: false,
  onCurrencyChange: vi.fn(),
  onSnapshotFrequencyChange: vi.fn(),
  onDateFormatChange: vi.fn(),
  onMovementsPerPageChange: vi.fn(),
  onReminderAdvanceDaysChange: vi.fn(),
  onDefaultCurrencyChange: vi.fn(),
  ...overrides,
});

// Selects render in this document order:
//   0: Snapshot Frequency
//   1: Date Format
//   2: Base Currency
//   3: Default for New Accounts
//
// Number inputs in this order:
//   0: Movements Per Page
//   1: Reminder Advance Days

describe('PreferencesSection', () => {
  it('renders the section heading and card titles', () => {
    render(<PreferencesSection {...buildProps()} />);

    expect(
      screen.getByRole('heading', { level: 3, name: /Preferences/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 4, name: /Interface Appearance/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 4, name: /Date Format/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 4, name: /Currency.*Locality/i }),
    ).toBeInTheDocument();
  });

  it('reflects current settings in selects and inputs', () => {
    render(<PreferencesSection {...buildProps()} />);

    const [snapshotSelect, dateFormatSelect, baseCurrencySelect, defaultCurrencySelect] =
      screen.getAllByRole('combobox') as HTMLSelectElement[];
    const [movementsInput, reminderInput] = screen.getAllByRole(
      'spinbutton',
    ) as HTMLInputElement[];

    expect(snapshotSelect.value).toBe('weekly');
    expect(dateFormatSelect.value).toBe('MMM d, yyyy');
    expect(baseCurrencySelect.value).toBe('USD');
    expect(defaultCurrencySelect.value).toBe('USD');
    expect(movementsInput.value).toBe('50');
    expect(reminderInput.value).toBe('7');
  });

  it('falls back to "weekly" when snapshotFrequency is undefined', () => {
    render(
      <PreferencesSection
        {...buildProps({ settings: { ...baseSettings, snapshotFrequency: undefined } })}
      />,
    );

    const [snapshotSelect] = screen.getAllByRole('combobox') as HTMLSelectElement[];
    expect(snapshotSelect.value).toBe('weekly');
  });

  it('fires onSnapshotFrequencyChange with the selected value', async () => {
    const user = userEvent.setup();
    const onSnapshotFrequencyChange = vi.fn();
    render(
      <PreferencesSection {...buildProps({ onSnapshotFrequencyChange })} />,
    );

    const [snapshotSelect] = screen.getAllByRole('combobox');
    await user.selectOptions(snapshotSelect, 'daily');

    expect(onSnapshotFrequencyChange).toHaveBeenCalledWith('daily');
  });

  it('fires onDateFormatChange with the selected value', async () => {
    const user = userEvent.setup();
    const onDateFormatChange = vi.fn();
    render(<PreferencesSection {...buildProps({ onDateFormatChange })} />);

    const [, dateFormatSelect] = screen.getAllByRole('combobox');
    await user.selectOptions(dateFormatSelect, 'dd/MM/yyyy');

    expect(onDateFormatChange).toHaveBeenCalledWith('dd/MM/yyyy');
  });

  it('fires onCurrencyChange with the selected base currency', async () => {
    const user = userEvent.setup();
    const onCurrencyChange = vi.fn();
    render(<PreferencesSection {...buildProps({ onCurrencyChange })} />);

    const [, , baseCurrencySelect] = screen.getAllByRole('combobox');
    await user.selectOptions(baseCurrencySelect, 'EUR');

    expect(onCurrencyChange).toHaveBeenCalledWith('EUR');
  });

  it('fires onDefaultCurrencyChange with the selected default currency', async () => {
    const user = userEvent.setup();
    const onDefaultCurrencyChange = vi.fn();
    render(<PreferencesSection {...buildProps({ onDefaultCurrencyChange })} />);

    const [, , , defaultCurrencySelect] = screen.getAllByRole('combobox');
    await user.selectOptions(defaultCurrencySelect, 'MXN');

    expect(onDefaultCurrencyChange).toHaveBeenCalledWith('MXN');
  });

  it('fires onMovementsPerPageChange for valid in-range values', async () => {
    const onMovementsPerPageChange = vi.fn();
    render(
      <PreferencesSection {...buildProps({ onMovementsPerPageChange })} />,
    );

    const [movementsInput] = screen.getAllByRole('spinbutton');
    fireEvent.change(movementsInput, { target: { value: '100' } });

    expect(onMovementsPerPageChange).toHaveBeenCalledWith(100);
  });

  it('does not fire onMovementsPerPageChange when below the minimum (10)', async () => {
    const onMovementsPerPageChange = vi.fn();
    render(
      <PreferencesSection {...buildProps({ onMovementsPerPageChange })} />,
    );

    const [movementsInput] = screen.getAllByRole('spinbutton');
    fireEvent.change(movementsInput, { target: { value: '5' } });

    expect(onMovementsPerPageChange).not.toHaveBeenCalled();
  });

  it('does not fire onMovementsPerPageChange when above the maximum (200)', async () => {
    const onMovementsPerPageChange = vi.fn();
    render(
      <PreferencesSection {...buildProps({ onMovementsPerPageChange })} />,
    );

    const [movementsInput] = screen.getAllByRole('spinbutton');
    fireEvent.change(movementsInput, { target: { value: '500' } });

    expect(onMovementsPerPageChange).not.toHaveBeenCalled();
  });

  it('fires onReminderAdvanceDaysChange for valid in-range values', async () => {
    const onReminderAdvanceDaysChange = vi.fn();
    render(
      <PreferencesSection {...buildProps({ onReminderAdvanceDaysChange })} />,
    );

    const [, reminderInput] = screen.getAllByRole('spinbutton');
    fireEvent.change(reminderInput, { target: { value: '14' } });

    expect(onReminderAdvanceDaysChange).toHaveBeenCalledWith(14);
  });

  it('does not fire onReminderAdvanceDaysChange when above the maximum (30)', async () => {
    const onReminderAdvanceDaysChange = vi.fn();
    render(
      <PreferencesSection {...buildProps({ onReminderAdvanceDaysChange })} />,
    );

    const [, reminderInput] = screen.getAllByRole('spinbutton');
    fireEvent.change(reminderInput, { target: { value: '99' } });

    expect(onReminderAdvanceDaysChange).not.toHaveBeenCalled();
  });

  it('does not fire onReminderAdvanceDaysChange when below the minimum (1)', async () => {
    const onReminderAdvanceDaysChange = vi.fn();
    render(
      <PreferencesSection {...buildProps({ onReminderAdvanceDaysChange })} />,
    );

    const [, reminderInput] = screen.getAllByRole('spinbutton');
    fireEvent.change(reminderInput, { target: { value: '0' } });

    expect(onReminderAdvanceDaysChange).not.toHaveBeenCalled();
  });

  it('renders an option for every supported currency in both currency selects', () => {
    render(<PreferencesSection {...buildProps()} />);

    // Each supported currency appears twice — once per currency select.
    ['USD', 'MXN', 'COP', 'EUR', 'GBP'].forEach((code) => {
      expect(screen.getAllByRole('option', { name: code }).length).toBeGreaterThanOrEqual(2);
    });
  });

  it('disables every form control when isUpdating is true', () => {
    render(<PreferencesSection {...buildProps({ isUpdating: true })} />);

    const selects = screen.getAllByRole('combobox');
    const inputs = screen.getAllByRole('spinbutton');

    [...selects, ...inputs].forEach((el) => expect(el).toBeDisabled());
  });
});
