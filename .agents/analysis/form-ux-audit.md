# Form UX Audit

## Summary

All forms in the app share the same fundamental issues: manual `useState` management, no unsaved-changes protection, no inline validation, and inconsistent error display. The codebase has zero usage of form libraries (react-hook-form, formik, etc.). Most forms are functional but fragile from a UX perspective.

### Critical Issues (present in nearly every form)

| Issue | Severity | Affected Forms |
|-------|----------|----------------|
| No unsaved-changes warning on navigation | High | ALL |
| No inline/real-time validation | Medium | ALL except CDAccountForm |
| No form library — all manual useState | Medium | ALL |
| Required fields not visually marked (no asterisk) | Low | ALL |
| No explicit keyboard handling (Enter/Tab) | Low | ALL (relies on native browser) |

---

## Per-Form Findings

### 1. MovementForm.tsx

| Criterion | Status | Notes |
|-----------|--------|-------|
| Data lost on error? | No | Form state is controlled via parent props (`amount`, `notes`, etc.) — state persists on failure |
| Inline validation? | No | Only HTML5 `required` attributes; no custom validation messages |
| Unsaved-changes warning? | No | None |
| Required fields marked? | No | Uses `required` HTML attr but no visual asterisk/indicator |
| Submit disabled while saving? | Yes | `Button loading={isSaving}` disables the button |
| Error messages inline? | No | No error display at all — relies on parent toast |
| Keyboard handling? | Native only | Standard `<form onSubmit>` handles Enter; no custom Tab logic |
| State management? | Manual | Props from parent (lifted state), no form library |

**Additional notes**: Transfer mode adds hidden inputs and extra selectors. The form is complex (20+ props) and would benefit significantly from react-hook-form.

---

### 2. MovementTemplateForm.tsx

| Criterion | Status | Notes |
|-----------|--------|-------|
| Data lost on error? | No | Local useState persists on failed `onSubmit` |
| Inline validation? | No | Only HTML5 `required` |
| Unsaved-changes warning? | No | None |
| Required fields marked? | No | No visual indicator |
| Submit disabled while saving? | Yes | `Button loading={isSaving}` |
| Error messages inline? | No | No error display — relies on parent |
| Keyboard handling? | Native only | |
| State management? | Manual useState | 7 separate useState calls |

---

### 3. BatchMovementForm.tsx (+ BatchMovementRow.tsx)

| Criterion | Status | Notes |
|-----------|--------|-------|
| Data lost on error? | No | Rows persist in state; `isSaving` resets in `finally` block |
| Inline validation? | Partial | Manual validation in `handleSave` checks required fields, but errors shown as a single toast, not per-field |
| Unsaved-changes warning? | No | None |
| Required fields marked? | No | HTML `required` on inputs but no visual indicator |
| Submit disabled while saving? | Yes | `disabled={isSaving}` on Save button |
| Error messages inline? | No | All errors concatenated into one toast message |
| Keyboard handling? | Native only | No Enter-to-submit (it's a button click, not a form submit) |
| State management? | Manual useState + useCallback | Complex row management with `setRows` functional updater |

**Additional notes**: This is the most complex form. Validation errors are joined with `•` and shown as a single toast — poor discoverability. The form uses `onClick` on the save button rather than `<form onSubmit>`, so Enter key does NOT submit.

---

### 4. AccountForm.tsx

| Criterion | Status | Notes |
|-----------|--------|-------|
| Data lost on error? | No | Uses `defaultValue` (uncontrolled) + parent handles `onSubmit` |
| Inline validation? | No | Only HTML5 `required` |
| Unsaved-changes warning? | No | None |
| Required fields marked? | No | No visual indicator |
| Submit disabled while saving? | Yes | `Button loading={isSaving}` |
| Error messages inline? | No | No error display at all |
| Keyboard handling? | Native only | Standard form submit |
| State management? | Minimal | Only `type` and `color` in useState; rest is uncontrolled via `defaultValue` |

---

### 5. CDAccountForm.tsx

| Criterion | Status | Notes |
|-----------|--------|-------|
| Data lost on error? | No | Full controlled state in `formData` object persists on error |
| Inline validation? | Yes | `validateForm()` sets per-field `errors` state; `error` prop passed to Input |
| Unsaved-changes warning? | No | None |
| Required fields marked? | Partial | Some inputs have `required` attr; no universal visual indicator |
| Submit disabled while saving? | Yes | `disabled={isLoading}` on submit button |
| Error messages inline? | Yes | Uses Input's `error` prop to show messages below fields |
| Keyboard handling? | Native only | Standard form submit |
| State management? | Manual useState | Single `formData` object + separate `errors` object |

**Additional notes**: This is the ONLY form with proper inline validation and per-field error messages. It's the gold standard in this codebase. However, validation only runs on submit — not on blur/change.

---

### 6. PocketForm.tsx

| Criterion | Status | Notes |
|-----------|--------|-------|
| Data lost on error? | No | Uncontrolled inputs with `defaultValue`; parent handles submit |
| Inline validation? | No | Only HTML5 `required` |
| Unsaved-changes warning? | No | None |
| Required fields marked? | No | No visual indicator |
| Submit disabled while saving? | Yes | `Button loading={isSaving}` |
| Error messages inline? | No | None |
| Keyboard handling? | Native only | |
| State management? | None | Fully uncontrolled (defaultValue only) |

**Additional notes**: Simplest form in the app. Only 2 fields.

---

### 7. FixedExpenseForm.tsx

| Criterion | Status | Notes |
|-----------|--------|-------|
| Data lost on error? | No | Uses `defaultValue` (uncontrolled); state persists |
| Inline validation? | No | Only HTML5 `required`/`min` |
| Unsaved-changes warning? | No | None |
| Required fields marked? | No | No visual indicator |
| Submit disabled while saving? | Yes | `Button loading={isSaving}` |
| Error messages inline? | Partial | Has a top-level error banner (`error` state) but not per-field |
| Keyboard handling? | Native only | |
| State management? | Hybrid | `selectedPocketId` and `formValues` in useState; rest uncontrolled |

**Additional notes**: Has its own mutation logic inside the form (calls `createSubPocket`/`updateSubPocket` directly). This couples the form to the data layer — unusual pattern vs. other forms that delegate via `onSubmit` prop.

---

### 8. FixedExpenseGroupForm.tsx

| Criterion | Status | Notes |
|-----------|--------|-------|
| Data lost on error? | No | Uncontrolled inputs persist |
| Inline validation? | No | Only HTML5 `required` |
| Unsaved-changes warning? | No | None |
| Required fields marked? | No | No visual indicator |
| Submit disabled while saving? | Yes | `Button loading={isSaving}` |
| Error messages inline? | No | Relies on mutation's onError toast |
| Keyboard handling? | Native only | |
| State management? | Minimal | Only `isSaving` in useState; inputs uncontrolled |

**Additional notes**: Color selection uses radio buttons with `sr-only` class — accessible but no visible "required" indicator.

---

### 9. ReminderForm.tsx

| Criterion | Status | Notes |
|-----------|--------|-------|
| Data lost on error? | No | Full controlled state in `formData` persists |
| Inline validation? | No | Only HTML5 `required` |
| Unsaved-changes warning? | No | None |
| Required fields marked? | No | No visual indicator |
| Submit disabled while saving? | Partial | `disabled={isSaving}` on both buttons, but no `loading` spinner on submit |
| Error messages inline? | No | None |
| Keyboard handling? | Native only | |
| State management? | Manual useState | Single `formData` object with `setFormData` |

**Additional notes**: Complex form with conditional sections (recurrence type, end conditions). Uses `useEffect` to sync `initialData` into state — can cause stale state bugs if parent re-renders with new data.

---

### 10. ScenarioForm.tsx

| Criterion | Status | Notes |
|-----------|--------|-------|
| Data lost on error? | N/A | `onSave` is synchronous (no async/mutation) |
| Inline validation? | Minimal | Submit button `disabled={!name.trim()}` prevents empty name |
| Unsaved-changes warning? | No | None |
| Required fields marked? | No | No visual indicator |
| Submit disabled while saving? | N/A | Synchronous save |
| Error messages inline? | No | None |
| Keyboard handling? | Native only | |
| State management? | Manual useState | `name` + `selectedIds` Set |

**Additional notes**: This form is purely client-side (saves to local state/localStorage). No network call, so error handling is less critical.

---

### 11. LoginPage.tsx

| Criterion | Status | Notes |
|-----------|--------|-------|
| Data lost on error? | No | Controlled inputs persist; only `loading` resets on error |
| Inline validation? | No | Only HTML5 `required` + `type="email"` |
| Unsaved-changes warning? | N/A | Login forms don't need this |
| Required fields marked? | No | No visual indicator |
| Submit disabled while saving? | Yes | `Button loading={loading}` |
| Error messages inline? | Top-level only | Error banner above form, not per-field |
| Keyboard handling? | Native only | `autoComplete` attributes present |
| State management? | Manual useState | 4 useState calls |

---

### 12. SignUpPage.tsx

| Criterion | Status | Notes |
|-----------|--------|-------|
| Data lost on error? | No | Controlled inputs persist |
| Inline validation? | Minimal | Password match + length check before submit, but shown as top-level error |
| Unsaved-changes warning? | N/A | Signup forms don't need this |
| Required fields marked? | No | No visual indicator |
| Submit disabled while saving? | Yes | `Button loading={loading}` |
| Error messages inline? | Top-level only | Error banner above form, not per-field |
| Keyboard handling? | Native only | `autoComplete` attributes present |
| State management? | Manual useState | 5 useState calls |

**Additional notes**: Has `helperText` on password field ("At least 6 characters") — only form using this Input feature for guidance.

---

## Systemic Patterns

### What works well
1. **No data loss on error** — All forms keep state on failed submissions. None reset prematurely.
2. **Submit button disabled while saving** — Consistent use of `loading` prop on Button component (which also disables).
3. **Button component** — Well-designed with loading spinner + disabled state built in.
4. **Input component** — Supports `error`, `helperText`, `leftIcon`, `rightIcon` props — but almost nobody uses `error`.

### What's broken across the board
1. **No form library** — Every form manually manages state with useState. This leads to prop explosion (MovementForm has 20+ props) and inconsistent patterns (some controlled, some uncontrolled, some hybrid).
2. **No inline validation** — Only CDAccountForm validates on submit and shows per-field errors. Every other form relies solely on HTML5 validation (browser-native popups).
3. **No unsaved-changes warning** — Zero forms implement `beforeunload` or route-blocking. Users can navigate away and lose all input.
4. **No visual required-field indicators** — The Input component doesn't render an asterisk or other marker even when `required` is passed.
5. **Inconsistent error display** — Some forms show a top-level banner, some rely on parent toasts, CDAccountForm uses inline errors. No standard pattern.
6. **No keyboard enhancements** — All forms rely on native browser behavior. BatchMovementForm doesn't even use `<form>` submit, so Enter key doesn't work.

---

## Recommendations

### Priority 1: Add react-hook-form
- Eliminates manual useState management
- Built-in validation with per-field error messages
- Handles dirty-state tracking (enables unsaved-changes warnings)
- Reduces re-renders (uncontrolled by default)

### Priority 2: Standardize validation pattern
- Use CDAccountForm as the template
- Validate on blur (not just submit) for immediate feedback
- Always use Input's `error` prop for inline messages

### Priority 3: Add unsaved-changes guard
- Implement a `useUnsavedChanges` hook using `react-router`'s `useBlocker` or `beforeunload`
- Apply to all forms that make network calls

### Priority 4: Visual required-field indicators
- Update Input/Select components to show asterisk when `required` is true
- Single change propagates to all forms

### Priority 5: Fix BatchMovementForm keyboard
- Wrap in `<form>` element with `onSubmit`
- Or add `onKeyDown` handler for Enter key on the save button
