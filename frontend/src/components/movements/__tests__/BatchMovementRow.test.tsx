import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '../../../test/testUtils';
import userEvent from '@testing-library/user-event';
import { useForm } from 'react-hook-form';
import BatchMovementRow, {
  type BatchFormValues,
  type BatchMovementRow as BatchMovementRowType,
} from '../BatchMovementRow';

// Mock the heavy children. We only care that they receive the right
// props from BatchMovementRow — their own behavior is covered by their
// own test suites and would otherwise drag in TanStack Query data deps.
vi.mock('../AccountPocketSelector', () => ({
  default: ({
    accountId,
    pocketId,
    movementType,
  }: {
    accountId: string;
    pocketId: string;
    movementType: string;
  }) => (
    <div data-testid="account-pocket-selector">
      account={accountId}|pocket={pocketId}|type={movementType}
    </div>
  ),
}));

vi.mock('../CategorySelector', () => ({
  default: ({
    value,
    onChange,
  }: {
    value: string;
    onChange: (v: string) => void;
  }) => (
    <input
      data-testid="category-selector"
      aria-label="Category"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  ),
}));

interface HostProps {
  index?: number;
  errors?: Record<string, { message?: string }>;
  canRemove?: boolean;
  amountStep?: string;
  onRemove?: () => void;
  onFocus?: () => void;
  initialRow?: Partial<BatchMovementRowType>;
}

/**
 * Test host that provides react-hook-form `control` to BatchMovementRow.
 * BatchMovementRow is a Controller-driven row component, so it cannot be
 * rendered standalone — it needs a form context.
 */
const Host = ({
  index = 0,
  errors,
  canRemove = false,
  amountStep = '0.01',
  onRemove = () => {},
  onFocus = () => {},
  initialRow,
}: HostProps) => {
  const defaultRow: BatchMovementRowType = {
    id: 'r1',
    type: 'EgresoNormal',
    accountId: 'acc1',
    pocketId: 'pkt1',
    subPocketId: '',
    amount: '0',
    notes: '',
    displayedDate: '2026-01-15',
    ...initialRow,
  };

  const { control } = useForm<BatchFormValues>({
    defaultValues: {
      rows: [defaultRow],
      markAsPending: false,
    },
  });

  return (
    <form>
      <BatchMovementRow
        index={index}
        control={control}
        errors={errors}
        canRemove={canRemove}
        amountStep={amountStep}
        onRemove={onRemove}
        onFocus={onFocus}
      />
    </form>
  );
};

describe('BatchMovementRow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the row header with the 1-based index label', () => {
    render(<Host index={0} />);

    expect(screen.getByText('Movement #1')).toBeInTheDocument();
  });

  it('renders the second row with index #2', () => {
    render(<Host index={1} />);

    expect(screen.getByText('Movement #2')).toBeInTheDocument();
  });

  it('renders the type, amount, date and notes inputs', () => {
    render(<Host />);

    // Required-field labels include a trailing "*" asterisk text node, so we
    // match on the label substring rather than anchored equality.
    expect(screen.getByLabelText(/type/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/amount/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/date/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/notes \(optional\)/i)).toBeInTheDocument();
  });

  it('renders the AccountPocketSelector with the row values', () => {
    render(
      <Host
        initialRow={{
          accountId: 'acc99',
          pocketId: 'pkt99',
          type: 'IngresoFijo',
        }}
      />,
    );

    expect(screen.getByTestId('account-pocket-selector')).toHaveTextContent(
      'account=acc99|pocket=pkt99|type=IngresoFijo',
    );
  });

  it('hides the remove button when canRemove is false', () => {
    render(<Host canRemove={false} />);

    expect(
      screen.queryByRole('button', { name: /remove movement #1/i }),
    ).not.toBeInTheDocument();
  });

  it('renders the remove button when canRemove is true', () => {
    render(<Host canRemove />);

    expect(
      screen.getByRole('button', { name: /remove movement #1/i }),
    ).toBeInTheDocument();
  });

  it('invokes onRemove when the remove button is clicked', async () => {
    const user = userEvent.setup();
    const onRemove = vi.fn();
    render(<Host canRemove onRemove={onRemove} />);

    await user.click(
      screen.getByRole('button', { name: /remove movement #1/i }),
    );

    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  it('invokes onFocus when an input inside the row receives focus', async () => {
    const user = userEvent.setup();
    const onFocus = vi.fn();
    render(<Host onFocus={onFocus} />);

    await user.click(screen.getByLabelText(/amount/i));

    expect(onFocus).toHaveBeenCalled();
  });

  it('forwards amountStep to the amount input', () => {
    render(<Host amountStep="0.5" />);

    expect(screen.getByLabelText(/amount/i)).toHaveAttribute('step', '0.5');
  });

  it('renders the amount error from the errors prop', () => {
    render(
      <Host
        errors={{ amount: { message: 'Amount must be positive' } }}
      />,
    );

    expect(screen.getByText('Amount must be positive')).toBeInTheDocument();
  });

  it('renders the account error from the errors prop', () => {
    render(
      <Host errors={{ accountId: { message: 'Account is required' } }} />,
    );

    expect(screen.getByText('Account is required')).toBeInTheDocument();
  });

  it('renders the pocket error when accountId error is absent', () => {
    render(
      <Host errors={{ pocketId: { message: 'Pocket is required' } }} />,
    );

    expect(screen.getByText('Pocket is required')).toBeInTheDocument();
  });
});
