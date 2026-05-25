import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '../../../test/testUtils';
import userEvent from '@testing-library/user-event';
import DistributionFooter from '../DistributionFooter';

describe('DistributionFooter', () => {
  const defaultProps = {
    onGenerate: vi.fn(),
    generateDisabled: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the Generate Movements button', () => {
    render(<DistributionFooter {...defaultProps} />);

    expect(
      screen.getByRole('button', { name: /generate movements/i }),
    ).toBeInTheDocument();
  });

  it('disables the Generate Movements button when generateDisabled is true', () => {
    render(<DistributionFooter {...defaultProps} generateDisabled />);

    expect(
      screen.getByRole('button', { name: /generate movements/i }),
    ).toBeDisabled();
  });

  it('does not call onGenerate when the disabled button is clicked', async () => {
    const onGenerate = vi.fn();
    const user = userEvent.setup();
    render(
      <DistributionFooter
        {...defaultProps}
        onGenerate={onGenerate}
        generateDisabled
      />,
    );

    await user.click(
      screen.getByRole('button', { name: /generate movements/i }),
    );

    expect(onGenerate).not.toHaveBeenCalled();
  });

  it('does not render a Cancel Changes button', () => {
    render(<DistributionFooter {...defaultProps} />);

    expect(
      screen.queryByRole('button', { name: /cancel changes/i }),
    ).not.toBeInTheDocument();
  });

  it('fires onGenerate when the enabled Generate button is clicked', async () => {
    const onGenerate = vi.fn();
    const user = userEvent.setup();
    render(<DistributionFooter {...defaultProps} onGenerate={onGenerate} />);

    await user.click(
      screen.getByRole('button', { name: /generate movements/i }),
    );

    expect(onGenerate).toHaveBeenCalledTimes(1);
  });
});
