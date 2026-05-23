import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '../../../test/testUtils';
import userEvent from '@testing-library/user-event';
import DistributionFooter from '../DistributionFooter';

describe('DistributionFooter', () => {
  const defaultProps = {
    onCancel: vi.fn(),
    onGenerate: vi.fn(),
    generateDisabled: false,
    hasChanges: false,
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

  it('hides the Cancel Changes button when hasChanges is false', () => {
    render(<DistributionFooter {...defaultProps} hasChanges={false} />);

    expect(
      screen.queryByRole('button', { name: /cancel changes/i }),
    ).not.toBeInTheDocument();
  });

  it('shows the Cancel Changes button and fires onCancel when hasChanges is true', async () => {
    const onCancel = vi.fn();
    const user = userEvent.setup();
    render(
      <DistributionFooter {...defaultProps} onCancel={onCancel} hasChanges />,
    );

    const cancelButton = screen.getByRole('button', {
      name: /cancel changes/i,
    });
    expect(cancelButton).toBeInTheDocument();

    await user.click(cancelButton);

    expect(onCancel).toHaveBeenCalledTimes(1);
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
