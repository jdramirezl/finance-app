# Task: Orphaned Movements — Subtle Footer Notice (Proposal A)

## Objective

Replace the prominent Trash2 icon button in the movements page header with a muted footer notice at the bottom of the list.

## File

`frontend/src/pages/MovementsPage.tsx`

## Changes

### 1. Remove the orphaned button from the header

Delete this block (around line 155-165 in the header's `<div className="flex gap-2">`):

```tsx
{orphanedCount > 0 && (
  <Button
    variant="secondary"
    onClick={() => setShowOrphaned((v) => !v)}
    className="px-2 sm:px-4"
    aria-label={`${showOrphaned ? 'Hide' : 'Show'} orphaned movements (${orphanedCount})`}
    aria-expanded={showOrphaned}
  >
    <Trash2 className="w-5 h-5" aria-hidden="true" />
    <span className="hidden sm:inline ml-2">Orphaned ({orphanedCount})</span>
  </Button>
)}
```

Also remove the `Trash2` import from the `lucide-react` import line (keep `Plus`).

### 2. Add subtle footer after the Load More section

After the `{hasMoreMovements && (...)}` block and before `<MovementFormPanel`, add:

```tsx
{orphanedCount > 0 && (
  <p className="text-center text-xs text-gray-500 dark:text-gray-500 pt-6 pb-2">
    {orphanedCount} movements from deleted accounts
    {' · '}
    <button
      onClick={() => setShowOrphaned(true)}
      className="underline hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
    >
      Manage
    </button>
  </p>
)}
```

### 3. Keep existing behavior

- `showOrphaned` state stays as-is
- `OrphanedMovementsPanel` still renders when `showOrphaned` is true (no changes)
- `RestoreOrphanedModal` unchanged
- `useOrphanedMovementsQuery` and `orphanedCount` unchanged

## Verification

- Build passes (`npm run build` from `frontend/`)
- No TypeScript errors
- The header only shows "Batch Add" and "New Movement" buttons
- Footer text appears at the bottom when orphaned movements exist
- Clicking "Manage" opens the OrphanedMovementsPanel
