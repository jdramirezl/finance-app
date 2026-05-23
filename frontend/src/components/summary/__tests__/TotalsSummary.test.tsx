import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '../../../test/testUtils';
import TotalsSummary from '../TotalsSummary';

// Mock SelectableValue to skip the SelectionContext requirement — it just renders children
vi.mock('../../ui/SelectableValue', () => ({
  default: ({ children, value, currency }: { children?: React.ReactNode; value: number; currency?: string }) => (
    <span data-testid="selectable-value" data-value={value} data-currency={currency}>
      {children ?? `${currency ?? ''} ${value}`}
    </span>
  ),
}));

// Mock AnimatedCounter to render the formatted value synchronously without animation
vi.mock('../../ui/AnimatedCounter', () => ({
  default: ({
    value,
    formatValue,
  }: {
    value: number;
    formatValue?: (v: number) => string;
  }) => <span data-testid="animated-counter">{formatValue ? formatValue(value) : String(value)}</span>,
}));

vi.mock('../../../services/currencyService', () => ({
  currencyService: {
    formatCurrency: vi.fn((amount: number, currency: string) => `$${amount.toFixed(2)} ${currency}`),
  },
}));

describe('TotalsSummary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the Net Worth label', () => {
    render(
      <TotalsSummary
        consolidatedTotal={1000}
        primaryCurrency="USD"
        totalsByCurrency={{ USD: 1000 } as Record<string, number>}
      />
    );

    expect(screen.getByText('Net Worth')).toBeInTheDocument();
    expect(screen.getByText(/All currencies consolidated/i)).toBeInTheDocument();
  });

  it('renders the consolidated total via the AnimatedCounter', () => {
    render(
      <TotalsSummary
        consolidatedTotal={2500.5}
        primaryCurrency="USD"
        totalsByCurrency={{ USD: 2500.5 } as Record<string, number>}
      />
    );

    expect(screen.getByTestId('animated-counter')).toHaveTextContent('$2500.50 USD');
  });

  it('renders a skeleton instead of the counter while consolidated total is not ready', () => {
    render(
      <TotalsSummary
        consolidatedTotal={0}
        primaryCurrency="USD"
        totalsByCurrency={{ USD: 0 } as Record<string, number>}
        isConsolidatedReady={false}
      />
    );

    expect(screen.queryByTestId('animated-counter')).not.toBeInTheDocument();
    expect(screen.getByLabelText(/calculating net worth/i)).toBeInTheDocument();
    const skeletons = document.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('renders currency pills when more than one currency is present', () => {
    render(
      <TotalsSummary
        consolidatedTotal={3000}
        primaryCurrency="USD"
        totalsByCurrency={{ USD: 1000, MXN: 2000 } as Record<string, number>}
      />
    );

    expect(screen.getByText('USD')).toBeInTheDocument();
    expect(screen.getByText('MXN')).toBeInTheDocument();
  });

  it('does not render currency pills when only a single currency is present', () => {
    render(
      <TotalsSummary
        consolidatedTotal={1000}
        primaryCurrency="USD"
        totalsByCurrency={{ USD: 1000 } as Record<string, number>}
      />
    );

    // The only USD reference comes from the AnimatedCounter formatted output, not a pill
    expect(screen.queryByText(/^USD$/)).not.toBeInTheDocument();
  });

  it('renders the per-currency formatted amounts inside the pills', () => {
    render(
      <TotalsSummary
        consolidatedTotal={3000}
        primaryCurrency="USD"
        totalsByCurrency={{ USD: 1000, MXN: 2000 } as Record<string, number>}
      />
    );

    expect(screen.getByText('$1000.00 USD')).toBeInTheDocument();
    expect(screen.getByText('$2000.00 MXN')).toBeInTheDocument();
  });

  it('passes the consolidated value and currency through to SelectableValue', () => {
    render(
      <TotalsSummary
        consolidatedTotal={1234}
        primaryCurrency="USD"
        totalsByCurrency={{ USD: 1234 } as Record<string, number>}
      />
    );

    const selectables = screen.getAllByTestId('selectable-value');
    // First selectable is the consolidated total
    expect(selectables[0]).toHaveAttribute('data-value', '1234');
    expect(selectables[0]).toHaveAttribute('data-currency', 'USD');
  });

  it('shows the consolidated counter when isConsolidatedReady defaults to true', () => {
    render(
      <TotalsSummary
        consolidatedTotal={500}
        primaryCurrency="USD"
        totalsByCurrency={{ USD: 500 } as Record<string, number>}
      />
    );

    // Default behaviour: counter is visible, skeleton is not
    expect(screen.getByTestId('animated-counter')).toBeInTheDocument();
    expect(screen.queryByLabelText(/calculating net worth/i)).not.toBeInTheDocument();
  });
});
