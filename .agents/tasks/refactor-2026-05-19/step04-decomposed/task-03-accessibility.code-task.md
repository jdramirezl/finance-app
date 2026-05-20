# Task: Fix Accessibility (aria-labels, keyboard nav, focus management)

## Description
The app has zero accessibility: no aria-labels on icon buttons, action buttons hidden behind hover (invisible to keyboard/touch), no focus trapping in modals, no keyboard navigation for lists.

## Technical Requirements

### aria-labels on all icon-only buttons
Find every button that only contains an icon (Lucide React icons like Trash2, Edit, X, Plus, etc.) and add `aria-label` describing the action. Examples:
- `<button><Trash2 /></button>` → `<button aria-label="Delete movement"><Trash2 /></button>`
- `<button><X /></button>` → `<button aria-label="Close"><X /></button>`

Search pattern: `<button` or `<Button` followed by only an icon component with no text children.

### Make hover-only actions always visible
Find all instances of `opacity-0 group-hover:opacity-100` on action buttons. Replace with always-visible but subtler styling (e.g., `opacity-60 hover:opacity-100` or just always visible).

### Focus management in modals
The existing `Modal.tsx` component should:
- Trap focus inside when open (Tab cycles within modal)
- Return focus to trigger element on close
- Close on Escape key
Check if it already does this. If not, add it using a focus-trap library or manual implementation.

### Keyboard navigation
- Lists of items (movements, accounts, reminders) should be navigable with arrow keys
- At minimum, all interactive elements must be reachable via Tab

## Acceptance Criteria
1. Every icon-only button has an aria-label
2. No action buttons are invisible by default (all reachable without hover)
3. Modals trap focus and close on Escape
4. All interactive elements are keyboard-reachable
5. Frontend builds clean
