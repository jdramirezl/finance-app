import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '../test/testUtils';
import userEvent from '@testing-library/user-event';
import Modal from './Modal';

describe('Modal', () => {
    it('should render when isOpen is true', () => {
        render(
            <Modal isOpen={true} onClose={() => { }}>
                <div>Modal Content</div>
            </Modal>
        );

        expect(screen.getByText('Modal Content')).toBeInTheDocument();
    });

    it('should not render when isOpen is false', () => {
        render(
            <Modal isOpen={false} onClose={() => { }}>
                <div>Modal Content</div>
            </Modal>
        );

        expect(screen.queryByText('Modal Content')).not.toBeInTheDocument();
    });

    it('should call onClose when clicking backdrop', async () => {
        const user = userEvent.setup();
        const onClose = vi.fn();

        const { container } = render(
            <Modal isOpen={true} onClose={onClose}>
                <div>Modal Content</div>
            </Modal>
        );

        const backdrop = container.querySelector('.backdrop-blur-md');
        if (backdrop) {
            await user.click(backdrop);
        }

        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('should not call onClose when clicking modal content', async () => {
        const user = userEvent.setup();
        const onClose = vi.fn();

        render(
            <Modal isOpen={true} onClose={onClose}>
                <div>Modal Content</div>
            </Modal>
        );

        const content = screen.getByText('Modal Content');
        await user.click(content);

        expect(onClose).not.toHaveBeenCalled();
    });

    it('should render title when provided', () => {
        render(
            <Modal isOpen={true} onClose={() => { }} title="Test Title">
                <div>Content</div>
            </Modal>
        );

        expect(screen.getByText('Test Title')).toBeInTheDocument();
    });

    it('should call onClose when clicking close button', async () => {
        const user = userEvent.setup();
        const onClose = vi.fn();

        render(
            <Modal isOpen={true} onClose={onClose} title="Test">
                <div>Content</div>
            </Modal>
        );

        const closeButton = screen.getByRole('button');
        await user.click(closeButton);

        expect(onClose).toHaveBeenCalledTimes(1);
    });
});
