# Form UX Improvement — Task Breakdown

## Summary

Addresses all 6 systemic form UX issues identified in the audit: no form library, no inline validation, no unsaved-changes warning, no required-field indicators, inconsistent error display, and BatchMovementForm keyboard gap. Broken into 7 atomic tasks ordered by dependency.

## Dependencies

```
Task 1 (Input/Select) ──┐
                         ├──→ Task 3 (Simple Forms)
Task 2 (useUnsavedChanges) ──┤
                         ├──→ Task 4 (MovementForm)
                         ├──→ Task 5 (ReminderForm)
                         ├──→ Task 6 (BatchMovementForm)
                         └──→ Task 7 (FixedExpenseForm)
```

Tasks 1 and 2 are independent of each other and can run in parallel. Tasks 3-7 depend on both 1 and 2 being complete, but are independent of each other and can run in parallel.

---

## Task 1: Input/Select Component — Required Indicator + Error Standardization

**Goal**: Update shared Input and Select components to visually mark required fields and ensure the `error` prop interface is consistent and ready for react-hook-form integration.

**Files to modify**:
1. `frontend/src/components/Input.tsx`
2. `frontend/src/components/Select.tsx`

**Requirements**:

1. When `required` prop is truthy, render a red asterisk (`*`) after the label text:
   ```tsx
   {label && (
     <label htmlFor={inputId} className="...">
       {label}
       {props.required && <span className="text-red-500 ml-0.5">*</span>}
     </label>
   )}
   ```

2. Apply the same pattern to Select's label rendering.

3. Ensure both components forward `ref` using `React.forwardRef` — this is required for react-hook-form's `register()` to attach refs. Current implementations do NOT forward refs.
   - Input must become `forwardRef<HTMLInputElement, InputProps>`
   - Select must become `forwardRef<HTMLSelectElement, SelectProps>`

4. No other behavioral changes. The existing `error` and `helperText` props already work correctly.

**Acceptance criteria**:
- [ ] All inputs/selects with `required` prop show a red asterisk after their label
- [ ] Both components forward refs correctly (testable by assigning a ref and calling `.focus()`)
- [ ] Existing usage across the app is unaffected (no prop signature changes beyond adding ref forwarding)
- [ ] `npm run build` passes with no type errors

---

## Task 2: useUnsavedChanges Hook — Shared Infrastructure

**Goal**: Create a reusable hook that warns users before navigating away from a dirty form.

**Files to create/modify**:
1. `frontend/src/hooks/useUnsavedChanges.ts` (new)

**Requirements**:

1. The hook accepts a single `isDirty: boolean` parameter.

2. When `isDirty` is true:
   - Register a `beforeunload` event listener that triggers the browser's native "unsaved changes" dialog on tab close/refresh.
   - Use react-router-dom v7's `useBlocker` to block in-app navigation. When blocked, show a `window.confirm()` dialog with the message: `"You have unsaved changes. Leave anyway?"`. If confirmed, proceed with navigation. If cancelled, stay on page.

3. When `isDirty` is false (or transitions from true to false), clean up both listeners.

4. The hook must handle the case where the component unmounts while dirty (cleanup without blocking).

5. Note: react-router-dom v7 exports `useBlocker` directly. The app uses `BrowserRouter` (not data router), so `useBlocker` may require switching to `createBrowserRouter`. If `useBlocker` is unavailable under the current router setup, use `useNavigate` + `useEffect` with `window.history.pushState` / `popstate` listener as a fallback, OR use the `unstable_useBlocker` export if available. Document the approach chosen.

**Acceptance criteria**:
- [ ] Hook exists at `frontend/src/hooks/useUnsavedChanges.ts`
- [ ] Closing/refreshing the browser tab while `isDirty=true` triggers native browser dialog
- [ ] In-app navigation while `isDirty=true` shows confirm dialog
- [ ] Navigation proceeds normally when `isDirty=false`
- [ ] No memory leaks (listeners cleaned up on unmount)
- [ ] Exported and importable from the hooks directory
- [ ] `npm run build` passes

---

## Task 3: react-hook-form — Simple Forms (Account, Pocket, FixedExpenseGroup)

**Goal**: Install react-hook-form and migrate the three simplest forms. These forms have minimal state (mostly uncontrolled with `defaultValue`) making them ideal first candidates.

**Files to modify**:
1. `frontend/package.json` (add `react-hook-form` dependency)
2. `frontend/src/components/accounts/AccountForm.tsx`
3. `frontend/src/components/accounts/PocketForm.tsx`
4. `frontend/src/components/fixed-expenses/FixedExpenseGroupForm.tsx`

**Requirements**:

1. Install `react-hook-form` (latest stable, pin exact version).

2. For each form, replace manual state/uncontrolled patterns with `useForm`:
   - Use `register()` for simple inputs (leverages the new ref forwarding from Task 1)
   - Use `Controller` for non-standard inputs (ColorSelector radio buttons in AccountForm, color radios in FixedExpenseGroupForm)
   - Set `defaultValues` from `initialData` prop
   - Use `handleSubmit()` wrapper for form submission

3. Add validation rules via `register()` options:
   - AccountForm: `name` required
   - PocketForm: `name` required
   - FixedExpenseGroupForm: `groupName` required, `groupColor` required

4. Display validation errors using the Input/Select `error` prop (from Task 1):
   - Show error message from `formState.errors[fieldName]?.message`
   - Validate on blur (`mode: 'onBlur'`) for immediate feedback

5. Integrate `useUnsavedChanges(formState.isDirty)` from Task 2.

6. The `onSubmit` prop signature for AccountForm and PocketForm currently receives `React.FormEvent<HTMLFormElement>`. The parent extracts values via `new FormData(e.currentTarget)`. Two options:
   - **Option A (preferred)**: Change `onSubmit` to receive the validated data object directly. Update the parent call sites.
   - **Option B**: Keep the FormEvent signature and let react-hook-form's `handleSubmit` still call the parent's handler with the event. This is less clean but avoids touching parent files.
   
   Use Option A. The parent call sites for these forms are:
   - AccountForm: used in `frontend/src/pages/AccountsPage.tsx` (search for `AccountForm`)
   - PocketForm: used in `frontend/src/pages/AccountsPage.tsx`
   - FixedExpenseGroupForm: self-contained (calls mutations internally)

**Acceptance criteria**:
- [ ] `react-hook-form` is in `package.json` dependencies with pinned version
- [ ] All three forms use `useForm` with proper `defaultValues`
- [ ] Validation errors appear inline below the relevant field on blur
- [ ] Required fields show asterisk (via Task 1's `required` prop)
- [ ] Unsaved-changes warning fires when form is dirty and user navigates
- [ ] Parent components updated to receive typed data objects instead of FormEvent
- [ ] No regressions: create and edit flows work for accounts, pockets, and expense groups
- [ ] `npm run build` passes

---

## Task 4: react-hook-form — MovementForm

**Goal**: Migrate the most complex form in the app to react-hook-form. MovementForm has 20+ props with lifted state managed by the parent. This migration must consolidate state ownership into the form itself.

**Files to modify**:
1. `frontend/src/components/movements/MovementForm.tsx`
2. `frontend/src/components/movements/MovementFormPanel.tsx`
3. `frontend/src/hooks/useMovementFormState.ts` (likely needs significant changes or removal)

**Requirements**:

1. Replace the 20+ lifted-state props with `useForm`:
   - `defaultValues` populated from `initialData` or `defaultValues` prop
   - All field state (amount, notes, type, accountId, pocketId, subPocketId, etc.) managed by react-hook-form
   - Template selection and transfer mode remain as local UI state (not form values submitted to backend)

2. Validation rules:
   - `type`: required
   - `displayedDate`: required
   - `accountId`: required
   - `pocketId`: required
   - `amount`: required, min 0
   - `targetAccountId`: required when `isTransfer` is true
   - `targetPocketId`: required when `isTransfer` is true
   - `templateName`: required when `saveAsTemplate` is true

3. Display errors inline using Input/Select `error` prop. Validate on blur.

4. Integrate `useUnsavedChanges(formState.isDirty)`.

5. The `onSubmit` prop must change from `(e: React.FormEvent<HTMLFormElement>) => Promise<void>` to receiving the validated form data object. Update `MovementFormPanel` and `useMovementFormState` accordingly.

6. The `AccountPocketSelector` component uses controlled values. Use `Controller` or `setValue`/`watch` to integrate it with react-hook-form.

7. Template loading (`onTemplateSelect`) should call `reset()` or `setValue()` to populate form fields from the selected template.

**Acceptance criteria**:
- [ ] MovementForm uses `useForm` — no more lifted state props for field values
- [ ] All required fields validated on blur with inline error messages
- [ ] Transfer mode conditional validation works (target fields required only in transfer mode)
- [ ] Template loading populates form fields correctly
- [ ] Unsaved-changes warning active when form is dirty
- [ ] Parent components (MovementFormPanel, useMovementFormState) updated to new interface
- [ ] Create, edit, and transfer flows all work end-to-end
- [ ] `npm run build` passes

---

## Task 5: react-hook-form — ReminderForm

**Goal**: Migrate ReminderForm to react-hook-form. This form has complex conditional sections (recurrence type, end conditions) and auto-fill behavior from linked fixed expenses/templates.

**Files to modify**:
1. `frontend/src/components/reminders/ReminderForm.tsx`

**Requirements**:

1. Replace the `formData` useState + `useEffect` sync pattern with `useForm`:
   - `defaultValues` from `initialData` (transformed to form-friendly shape)
   - Remove the `useEffect` that syncs `initialData` into state — use `reset()` when `initialData` changes instead

2. Validation rules:
   - `title`: required
   - `amount`: required, min 0.01
   - `dueDate`: required
   - `recurrenceInterval`: required + min 1 (when recurrenceType is 'custom')
   - `recurrenceEndCount`: required + min 1 (when endType is 'after')
   - `recurrenceEndDate`: required (when endType is 'on_date')
   - `recurrenceDaysOfWeek`: at least one selected (when recurrenceType is 'weekly')

3. Conditional validation: use `watch()` to observe `recurrenceType` and `recurrenceEndType`, apply validation rules conditionally.

4. Auto-fill from fixed expense / template selection: use `setValue()` to populate amount/title when user selects a linked item.

5. Display errors inline. Validate on blur.

6. Integrate `useUnsavedChanges(formState.isDirty)`.

7. The `onSubmit` prop already receives a typed DTO — keep this interface but construct the DTO from react-hook-form's validated data inside `handleSubmit`.

**Acceptance criteria**:
- [ ] ReminderForm uses `useForm` — no more manual `formData` state
- [ ] Conditional validation works for all recurrence scenarios
- [ ] Auto-fill from fixed expense and template selections works
- [ ] Inline error messages appear on blur for all required fields
- [ ] Unsaved-changes warning active when form is dirty
- [ ] Create and edit flows work end-to-end
- [ ] `npm run build` passes

---

## Task 6: react-hook-form — BatchMovementForm + Enter Key Fix

**Goal**: Migrate BatchMovementForm to react-hook-form's `useFieldArray` and fix the Enter key submission gap.

**Files to modify**:
1. `frontend/src/components/BatchMovementForm.tsx`
2. `frontend/src/components/movements/BatchMovementRow.tsx`

**Requirements**:

1. Wrap the entire batch form in a `<form onSubmit={handleSubmit(onSave)}>` element. This immediately fixes the Enter key issue since the save button becomes a submit button inside a form.

2. Replace the manual `rows` state + `updateRow`/`addRow`/`removeRow` callbacks with `useFieldArray`:
   - `useForm<{ rows: BatchMovementRowData[], markAsPending: boolean }>`
   - `useFieldArray({ control, name: 'rows' })`
   - Row components receive `register`, `control`, and field index instead of `onUpdate` callback

3. Validation rules (per row):
   - `rows.${index}.accountId`: required
   - `rows.${index}.pocketId`: required
   - `rows.${index}.amount`: required, min 0 (validate as number, not string)

4. Replace the toast-based error display with per-field inline errors:
   - Each BatchMovementRow shows its own field errors below the relevant input
   - Remove the `errors.join(' • ')` toast pattern

5. Integrate `useUnsavedChanges(formState.isDirty)`.

6. Preserve the `forwardRef` + `useImperativeHandle` pattern for `updateAmount` — use `setValue` internally.

7. Preserve `onFocusRow` and `onRowsChange` callbacks — wire them to `watch()` or field array's `fields` changes.

**Acceptance criteria**:
- [ ] BatchMovementForm wrapped in `<form>` — Enter key submits the form
- [ ] Uses `useFieldArray` for row management
- [ ] Per-row inline validation errors (no more concatenated toast)
- [ ] Adding/removing rows works correctly
- [ ] `updateAmount` imperative handle still works (used by QuickCalculator)
- [ ] `onFocusRow` and `onRowsChange` callbacks still fire correctly
- [ ] Unsaved-changes warning active when form is dirty
- [ ] `npm run build` passes

---

## Task 7: react-hook-form — FixedExpenseForm

**Goal**: Migrate FixedExpenseForm to react-hook-form. This form is unusual because it contains its own mutation logic (calls `createSubPocket`/`updateSubPocket` directly) rather than delegating via `onSubmit` prop.

**Files to modify**:
1. `frontend/src/components/fixed-expenses/FixedExpenseForm.tsx`

**Requirements**:

1. Replace the hybrid state (uncontrolled `defaultValue` + controlled `formValues` for live calculation) with `useForm`:
   - `defaultValues` from `initialData`
   - Use `watch('valueTotal')` and `watch('periodicityMonths')` for the live monthly contribution calculation

2. Validation rules:
   - `name`: required
   - `valueTotal`: required, min 0.01
   - `periodicityMonths`: required, min 1
   - `selectedPocketId`: required (when multiple fixed pockets exist)

3. Display errors inline. Validate on blur.

4. Replace the top-level error banner with per-field inline errors for validation failures. Keep the banner only for server/mutation errors (network failures, constraint violations).

5. Integrate `useUnsavedChanges(formState.isDirty)`.

6. The form's internal mutation calls remain — this is not a refactor of the data flow, only the form state management.

**Acceptance criteria**:
- [ ] FixedExpenseForm uses `useForm` — no more hybrid state
- [ ] Live monthly contribution calculation works via `watch()`
- [ ] Inline validation errors on blur for all required fields
- [ ] Server errors still display in the top banner (distinct from validation errors)
- [ ] Unsaved-changes warning active when form is dirty
- [ ] Create and edit flows work end-to-end
- [ ] `npm run build` passes

---

## Execution Plan

| Wave | Tasks | Parallelizable | Estimated Complexity |
|------|-------|----------------|---------------------|
| 1 | Task 1 + Task 2 | Yes (independent) | Low |
| 2 | Tasks 3, 4, 5, 6, 7 | Yes (all independent after Wave 1) | Medium-High |

**Recommended sub-agent allocation for Wave 2**:
- Agent A: Task 3 (simple forms — fastest, good warmup)
- Agent B: Task 4 (MovementForm — highest complexity, most files)
- Agent C: Task 5 (ReminderForm — medium complexity)
- Agent D: Task 6 (BatchMovementForm — medium-high, structural change)
- Agent E: Task 7 (FixedExpenseForm — medium, self-contained)

If limited to 4 agents, combine Tasks 3 + 7 (both are simpler forms with similar patterns).

---

## Notes for Coders

- **react-router-dom version**: The app uses v7.9.6. `useBlocker` is available in v7 but requires a data router (`createBrowserRouter`). If the current `BrowserRouter` setup doesn't support it, Task 2 must either migrate to data router or use the `beforeunload` + `popstate` fallback. Document the decision.
- **Input/Select ref forwarding** (Task 1) is a hard prerequisite for `register()` to work. Without it, react-hook-form cannot attach to the DOM elements.
- **AccountPocketSelector** is used in MovementForm and BatchMovementForm. It's a controlled component that manages its own cascading logic. Use `Controller` or manual `setValue`/`watch` integration — do NOT try to `register()` it directly.
- **No shortcuts**: Every form listed must be fully migrated. No "we'll do this one later" — the audit found issues in ALL forms and all must be addressed.
