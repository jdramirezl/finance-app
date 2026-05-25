import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '../../../test/testUtils';
import { Edit2, Archive } from 'lucide-react';
import ActionButtons, {
    EditArchiveActions,
    EditDeleteActions,
} from '../ActionButtons';

// These tests cover the iconOnly contract specifically: the button must
// keep the accessible name (aria-label/title) so screen readers and
// hover tooltips still expose the action, while suppressing the visible
// text label so the surface stays compact. Without this coverage a
// regression that re-introduces the visible label would silently slip
// through the higher-level account/pocket card tests, which only assert
// on accessible names (which are satisfied by either the visible text
// or the aria-label).

describe('ActionButtons', () => {
    describe('iconOnly action', () => {
        it('exposes the label as the accessible name and tooltip', () => {
            render(
                <ActionButtons
                    actions={[
                        {
                            icon: Edit2,
                            label: 'Edit',
                            iconOnly: true,
                            onClick: vi.fn(),
                        },
                    ]}
                />,
            );

            const button = screen.getByRole('button', { name: 'Edit' });
            expect(button).toHaveAttribute('aria-label', 'Edit');
            expect(button).toHaveAttribute('title', 'Edit');
        });

        it('suppresses the visible label text', () => {
            render(
                <ActionButtons
                    actions={[
                        {
                            icon: Edit2,
                            label: 'Edit',
                            iconOnly: true,
                            onClick: vi.fn(),
                        },
                    ]}
                />,
            );

            const button = screen.getByRole('button', { name: 'Edit' });
            // The accessible name is still 'Edit' (via aria-label), but
            // the visible label text must NOT render. Asserting "does
            // not contain" rather than "is empty" tolerates non-textual
            // SVG enhancements (e.g. a future <title> for a11y) while
            // still catching the regression where the label re-appears.
            expect(button.textContent).not.toContain('Edit');
        });

        it('hides the action icon while loading so the spinner takes its place', () => {
            const { container } = render(
                <ActionButtons
                    actions={[
                        {
                            icon: Archive,
                            label: 'Archive',
                            iconOnly: true,
                            loading: true,
                            onClick: vi.fn(),
                        },
                    ]}
                />,
            );

            // Exactly one SVG should render (the spinner from <Button>),
            // not two (spinner + action icon). This protects against the
            // double-glyph regression flagged in the icon-only loading
            // visual review.
            const svgs = container.querySelectorAll('svg');
            expect(svgs.length).toBe(1);
        });
    });

    describe('labelled action (iconOnly omitted)', () => {
        it('renders the visible label text', () => {
            render(
                <ActionButtons
                    actions={[
                        {
                            icon: Edit2,
                            label: 'Edit',
                            onClick: vi.fn(),
                        },
                    ]}
                />,
            );

            const button = screen.getByRole('button', { name: 'Edit' });
            // Default behaviour: the trailing label span is rendered so
            // the labelled variant shows both the icon and the word.
            expect(button.textContent).toContain('Edit');
        });
    });

    describe('EditArchiveActions', () => {
        it('renders Edit and Archive as icon-only buttons with accessible names', () => {
            render(
                <EditArchiveActions
                    onEdit={vi.fn()}
                    onArchive={vi.fn()}
                />,
            );

            const editButton = screen.getByRole('button', { name: 'Edit' });
            const archiveButton = screen.getByRole('button', { name: 'Archive' });

            // No visible text on either button — the icon-only contract.
            // Asserting "does not contain" rather than "is empty" tolerates
            // non-textual SVG enhancements.
            expect(editButton.textContent).not.toContain('Edit');
            expect(archiveButton.textContent).not.toContain('Archive');
        });
    });

    describe('EditDeleteActions', () => {
        it('renders the visible Edit and Delete labels (default labelled mode)', () => {
            render(
                <EditDeleteActions onEdit={vi.fn()} onDelete={vi.fn()} />,
            );

            // The legacy labelled helper must keep its visible text so
            // existing surfaces that depend on the trailing label are
            // unaffected by the iconOnly addition.
            expect(
                screen.getByRole('button', { name: 'Edit' }).textContent,
            ).toContain('Edit');
            expect(
                screen.getByRole('button', { name: 'Delete' }).textContent,
            ).toContain('Delete');
        });
    });
});
