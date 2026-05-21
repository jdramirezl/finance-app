# Remember Last-Used Account/Pocket — Task Breakdown

## Summary

After a successful movement creation, persist the selected `{ accountId, pocketId }` keyed by movement type. When opening the form for a new movement, auto-fill the last-used selection for that type. Skip when editing or loading from a template.

## Architecture Decision

**Per-type memory** is the correct approach. Expenses and income almost always go to different pockets (e.g., expenses from "Checking/Daily", income into "Checking/Savings"). Storing a single last-used pair would be wrong 80% of the time for the secondary type.

**Storage**: localStorage with key `finance-app-last-movement-target`. Value is a JSON object mapping movement type to `{ accountId, pocketId }`:

```json
{
  "EgresoNormal": { "accountId": "uuid-1", "pocketId": "uuid-2" },
  "IngresoNormal": { "accountId": "uuid-3", "pocketId": "uuid-4" },
  "EgresoFijo": { "accountId": "uuid-1", "pocketId": "uuid-5" }
}
```

**No Zustand store needed** — this is a simple read-on-mount / write-on-success pattern with no reactive subscribers. A plain utility module is sufficient and avoids unnecessary re-renders.

## Integration Points

### Where to save (after successful submit)

In `useMovementSubmit.ts` → `handleSubmit`, after a successful `createMovement` or `createTransfer` call (not on update). Save `{ accountId, pocketId }` keyed by the movement `type`.

### Where to read (form initialization)

In `MovementForm.tsx` → `useForm` `defaultValues` computation. Conditions for applying saved values:
1. `initialData` is null (not editing)
2. `prefillValues?.templateId` is not set (not loading from template)
3. `prefillValues?.fixedExpenseId` is not set (not coming from fixed expense shortcut)
4. The saved accountId/pocketId still exist in the accounts/pockets query data

### Validation on read

Before applying saved values, verify:
- The saved `accountId` exists in the `accounts` array
- The saved `pocketId` exists in the `pockets` array AND belongs to that account
- If both checks fail, fall back to empty selection (no error shown)

## File Changes

| File | Change |
|------|--------|
| `frontend/src/utils/lastMovementTarget.ts` | **NEW** — persistence utility (read/write/clear) |
| `frontend/src/hooks/actions/useMovementSubmit.ts` | Save after successful create/transfer |
| `frontend/src/components/movements/MovementForm.tsx` | Read saved values into `useForm` defaultValues |

## Task Breakdown

### Task 1: Implement full feature (single task — small scope)

**Scope**: Create utility + wire save + wire read. This is ~40 lines of new code across 3 files.

**Instructions**:

1. **Create `frontend/src/utils/lastMovementTarget.ts`**:
   ```typescript
   const STORAGE_KEY = 'finance-app-last-movement-target';

   interface MovementTarget {
     accountId: string;
     pocketId: string;
   }

   type TargetMap = Record<string, MovementTarget>;

   export function saveLastMovementTarget(type: string, accountId: string, pocketId: string): void {
     try {
       const existing: TargetMap = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
       existing[type] = { accountId, pocketId };
       localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
     } catch { /* localStorage unavailable */ }
   }

   export function getLastMovementTarget(type: string): MovementTarget | null {
     try {
       const data: TargetMap = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
       return data[type] ?? null;
     } catch {
       return null;
     }
   }
   ```

2. **Modify `useMovementSubmit.ts`** — after successful `createMovement.mutateAsync` and `createTransfer.mutateAsync`, call:
   ```typescript
   saveLastMovementTarget(type, accountId, pocketId);
   ```
   For transfers, also save the source account/pocket (the "from" side is what the user selects most often).

3. **Modify `MovementForm.tsx`** — in the component body, before `useForm`, compute the initial accountId/pocketId:
   - Only apply when `!initialData && !prefillValues?.templateId && !prefillValues?.fixedExpenseId`
   - Read `getLastMovementTarget(initialType)` where `initialType = prefillValues?.type ?? 'EgresoNormal'`
   - Validate that the returned accountId exists in `accounts` and pocketId exists in `pockets` for that account
   - Pass validated values as `defaultValues.accountId` and `defaultValues.pocketId` to `useForm`

   **Important**: The `accounts` and `pockets` queries may not be loaded yet on first render. Use a `useEffect` to set values via `setValue` once data arrives, rather than relying on synchronous defaultValues. Pattern:
   ```typescript
   const lastTarget = !initialData && !prefillValues?.templateId && !prefillValues?.fixedExpenseId
     ? getLastMovementTarget(prefillValues?.type ?? 'EgresoNormal')
     : null;

   // After useForm declaration:
   const appliedLastTarget = useRef(false);
   useEffect(() => {
     if (appliedLastTarget.current || !lastTarget || initialData) return;
     if (accounts.length === 0 || pockets.length === 0) return;
     const accountExists = accounts.some(a => a.id === lastTarget.accountId);
     const pocketExists = pockets.some(p => p.id === lastTarget.pocketId && p.accountId === lastTarget.accountId);
     if (accountExists && pocketExists) {
       setValue('accountId', lastTarget.accountId);
       setValue('pocketId', lastTarget.pocketId);
     }
     appliedLastTarget.current = true;
   }, [accounts, pockets, lastTarget, initialData, setValue]);
   ```

**Acceptance criteria**:
- Creating a movement saves the type→account/pocket mapping
- Opening a new movement form pre-selects the last-used account+pocket for the default type
- Changing the type dropdown updates the pre-selection to match that type's last-used target
- Editing an existing movement does NOT apply saved values
- Loading from a template does NOT apply saved values
- If saved account/pocket was deleted, form opens with empty selection (no crash)

## Complexity Assessment

**Effort**: Small (1 task, ~40 lines new code, 3 files touched)
**Risk**: Low — localStorage-only, no backend changes, graceful fallback on missing data
**Testing**: Manual — create a movement, close form, reopen, verify pre-selection
