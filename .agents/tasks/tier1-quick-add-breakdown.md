# Quick-Add Movement Mode — Task Breakdown

## Summary

Reduces movement recording from 8-10 interactions to 3-4 taps. Introduces a minimal quick-entry form that auto-selects the last-used account+pocket, defaults date to today, and provides a single-tap income/expense toggle. Accessible from a keyboard shortcut (desktop), the existing FAB (mobile), and a persistent inline bar on the movements page.

No backend changes required — the quick-add form submits a regular movement via the existing `movementService.createMovement` and `useMovementMutations.createMovement` paths.

## Architecture Decisions

### Why no backend changes
The quick-add form produces the same `createMovement` payload as the full form. The only new persistence is a `localStorage` key storing the last-used account+pocket pair, which lives entirely in the frontend.

### "Last used" strategy
A Zustand store with manual localStorage persistence (matching the existing `useThemeStore` pattern). Stores `{ accountId, pocketId }` and updates on every successful movement creation. Falls back to the first account+pocket if nothing is stored.

### Component placement
- **Movements page**: Persistent inline bar above the movement list (desktop) / below the header (mobile). Always visible, no modal needed for the common case.
- **Global shortcut (Ctrl+Shift+M / Cmd+Shift+M)**: Opens a centered modal version of the quick-add form from any page, then navigates to movements page on success.
- **FAB (mobile)**: Adds a "Quick Add" option to the existing `QuickActionsFAB` menu that opens the same modal.

### Expand to full form
The quick-add form includes a "More options" link that transfers the current amount/notes/type into the full `MovementForm` modal (via `formState.setDefaultValues` + `formState.openNewForm`).

## Dependencies

```
Task 1 (useLastUsedPocket store) ──┐
                                    ├──→ Task 3 (Integration: layout, FAB, keyboard, movements page)
Task 2 (QuickAddMovement component) ──┘
```

Tasks 1 and 2 are independent and can run in parallel. Task 3 depends on both being complete.

---

## Task 1: useLastUsedPocket Store

**Goal**: Create a Zustand store that persists the last-used account+pocket to localStorage and exposes a fallback resolution when no history exists.

**Files to create**:
1. `frontend/src/store/useLastUsedPocket.ts`
2. `frontend/src/store/useLastUsedPocket.test.ts`

**Files to modify**:
3. `frontend/src/store/index.ts` — add re-export
4. `frontend/src/hooks/actions/useMovementSubmit.ts` — call `setLastUsed` after successful creation

**Requirements**:

1. Store shape:
   ```ts
   interface LastUsedPocketStore {
     accountId: string | null;
     pocketId: string | null;
     setLastUsed: (accountId: string, pocketId: string) => void;
     getLastUsedOrDefault: (accounts: Account[], pockets: Pocket[]) => { accountId: string; pocketId: string } | null;
   }
   ```

2. Persistence: Use the same manual `localStorage.getItem` / `setItem` pattern as `useThemeStore`. Key: `finance-app-last-used-pocket`. Store as JSON `{ accountId, pocketId }`.

3. `getLastUsedOrDefault` logic:
   - If stored values exist AND both the account and pocket still exist in the provided arrays, return them.
   - Otherwise, return the first account's first pocket (if any exist).
   - Return `null` if no accounts/pockets exist at all.

4. Integration in `useMovementSubmit.ts`:
   - After a successful `createMovement` or `createTransfer` call (not update), call `setLastUsed(accountId, pocketId)` with the source account/pocket used.
   - Import the store at the top of the hook. Call `useLastUsedPocket.getState().setLastUsed(...)` (non-reactive, imperative call inside the async handler).

**Acceptance criteria**:
- [ ] Store persists across page reloads
- [ ] Falls back to first account+pocket when stored values reference deleted entities
- [ ] Returns `null` gracefully when no accounts exist
- [ ] `useMovementSubmit` updates the store on every successful creation
- [ ] Unit tests cover: persist/load, fallback when account deleted, fallback when no accounts, setLastUsed updates state
- [ ] `npm run build` passes

---

## Task 2: QuickAddMovement Component

**Goal**: Build the minimal quick-entry form component. Renders as either an inline bar or a modal depending on the `variant` prop.

**Files to create**:
1. `frontend/src/components/movements/QuickAddMovement.tsx`
2. `frontend/src/components/movements/QuickAddMovement.test.tsx`

**Files to modify**:
3. `frontend/src/components/movements/index.ts` — add export

**Requirements**:

1. Props interface:
   ```ts
   interface QuickAddMovementProps {
     variant: 'inline' | 'modal';
     onExpandToFull?: (prefill: { amount?: number; notes?: string; type?: MovementType }) => void;
     onClose?: () => void; // Only relevant for modal variant
     onSuccess?: () => void; // Called after successful submission
   }
   ```

2. Form fields (all in a single row for inline, stacked for modal):
   - **Type toggle**: Two-button segmented control — "Expense" (default, `EgresoNormal`) and "Income" (`IngresoNormal`). Visually distinct (red/green tint).
   - **Amount**: Number input, auto-focused on mount. Placeholder "0.00".
   - **Notes**: Text input, placeholder "What for?" (optional).
   - **Submit button**: Checkmark icon. Disabled when amount is empty or 0.

3. Auto-populated (not shown to user unless they expand):
   - `accountId` + `pocketId`: From `useLastUsedPocket.getState().getLastUsedOrDefault(accounts, pockets)`. Show a small label below the form: "→ {accountName} / {pocketName}" so the user knows where it's going.
   - `displayedDate`: Today (`format(new Date(), 'yyyy-MM-dd')`).
   - `isPending`: false.

4. "More options" link/button:
   - Calls `onExpandToFull` with current amount, notes, and type.
   - For modal variant, also calls `onClose`.

5. Submission:
   - Uses `useMovementMutations().createMovement.mutateAsync(...)` directly (same pattern as `useMovementSubmit` but simpler — no template, no transfer, no batch).
   - On success: clear the form fields (amount + notes), show a brief inline success indicator (green checkmark that fades after 1.5s), call `onSuccess`.
   - On error: show inline error text below the form.

6. Keyboard behavior:
   - Enter submits the form (when amount is valid).
   - Escape calls `onClose` (modal variant only).

7. Styling:
   - Inline variant: Compact single-row layout with `gap-2`, fits within the movements page header area. Background matches page (`bg-gray-50 dark:bg-gray-900` with subtle border).
   - Modal variant: Centered card with backdrop blur (reuse the same backdrop pattern from `MovementFormPanel`). Max-width `sm` (24rem).

8. Accessibility:
   - Amount input has `aria-label="Quick add amount"`.
   - Type toggle buttons have `aria-pressed` state.
   - Form has `role="form"` and `aria-label="Quick add movement"`.

**Acceptance criteria**:
- [ ] Inline variant renders a compact single-row form
- [ ] Modal variant renders a centered overlay with backdrop
- [ ] Type toggle switches between expense/income
- [ ] Amount + Enter submits successfully
- [ ] Shows destination account/pocket label
- [ ] "More options" transfers state to full form callback
- [ ] Success indicator appears and fades
- [ ] Error state displays inline
- [ ] Tests cover: render, submit flow, expand-to-full, error state
- [ ] `npm run build` passes

---

## Task 3: Integration — Layout, FAB, Keyboard Shortcut, Movements Page

**Goal**: Wire the `QuickAddMovement` component into all three access points and connect the "expand to full form" flow.

**Files to modify**:
1. `frontend/src/components/layout/QuickActionsFAB.tsx` — add "Quick Add" option
2. `frontend/src/components/layout/Layout.tsx` — add global keyboard listener + modal state
3. `frontend/src/pages/MovementsPage.tsx` — add inline quick-add bar
4. `frontend/src/components/movements/index.ts` — ensure QuickAddMovement is exported (should already be from Task 2)

**Files to create**:
5. `frontend/src/hooks/useGlobalKeyboardShortcuts.ts` — reusable keyboard shortcut hook

**Requirements**:

### 5. useGlobalKeyboardShortcuts hook

1. Accepts a map of shortcut definitions:
   ```ts
   interface ShortcutDef {
     key: string; // e.g. 'm'
     ctrl?: boolean;
     shift?: boolean;
     meta?: boolean; // Cmd on Mac
     handler: () => void;
     /** Skip when focus is inside an input/textarea/contenteditable */
     ignoreInputFocus?: boolean; // default true
   }
   ```

2. Registers a single `keydown` listener on `document`. Matches against all registered shortcuts. Calls `preventDefault` + `stopPropagation` on match.

3. Cleans up on unmount.

4. Does NOT fire when the active element is an `input`, `textarea`, `select`, or has `contentEditable` (unless `ignoreInputFocus` is explicitly false).

### 1. QuickActionsFAB changes

1. Add a third button to the expanded menu: "Quick Add" with a `Zap` icon (from lucide-react).
2. Instead of navigating to a URL, this button sets a state flag that renders the `QuickAddMovement` component in `modal` variant as a sibling of the FAB.
3. On `onClose` or `onSuccess`, hide the modal and collapse the FAB menu.
4. The "More options" flow from the modal navigates to `/movements?action=new` with any prefill params as query string (amount, notes, type).

### 2. Layout.tsx changes

1. Import and use `useGlobalKeyboardShortcuts` with one shortcut:
   - `Ctrl+Shift+M` (or `Cmd+Shift+M` on Mac): toggles a `showQuickAdd` state.
2. When `showQuickAdd` is true, render `<QuickAddMovement variant="modal" />` as a portal or direct child of Layout.
3. `onClose`: set `showQuickAdd` to false.
4. `onSuccess`: set `showQuickAdd` to false (user stays on current page; the movement is created in the background).
5. `onExpandToFull`: navigate to `/movements?action=new&amount=X&notes=Y&type=Z`, then set `showQuickAdd` to false.

### 3. MovementsPage changes

1. Render `<QuickAddMovement variant="inline" />` between the page header and the filters section.
2. `onExpandToFull` handler: call `formState.setDefaultValues({ amount, notes, type })` then `formState.openNewForm()`. This opens the full modal with prefilled values.
3. `onSuccess`: no special handling needed (TanStack Query invalidation from the mutation will refresh the list automatically).

**Acceptance criteria**:
- [ ] `Ctrl+Shift+M` opens the quick-add modal from any page (not when focused in an input)
- [ ] FAB menu shows "Quick Add" option that opens the modal
- [ ] Movements page shows the inline quick-add bar above filters
- [ ] "More options" from any variant opens the full movement form with prefilled values
- [ ] Successful quick-add from the global modal does NOT navigate away from the current page
- [ ] Successful quick-add from the inline bar refreshes the movement list
- [ ] Keyboard shortcut does not fire when typing in form fields
- [ ] `npm run build` passes
- [ ] Mobile: inline bar stacks vertically on small screens (responsive)

---

## Execution Plan

| Wave | Tasks | Parallelizable | Estimated files |
|------|-------|----------------|-----------------|
| 1 | Task 1 + Task 2 | Yes (independent) | 4 + 3 = 7 files |
| 2 | Task 3 | No (depends on wave 1) | 5 files |

**Total files touched**: ~12 (well within the 5-8 per task guideline, with Task 3 at the upper bound).

## Risk Assessment

- **Low risk**: No backend changes, no database changes, no breaking changes to existing forms.
- **Medium risk**: The global keyboard shortcut could conflict with browser shortcuts. Mitigation: use `Ctrl+Shift+M` which is not commonly bound by browsers (Chrome uses `Ctrl+Shift+M` for nothing on most OS; Firefox uses it for responsive design mode but only in DevTools).
- **Fallback**: If `Ctrl+Shift+M` conflicts, switch to `Ctrl+Shift+N` or make it configurable via settings.
