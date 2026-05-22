# Orphaned Movements: Subtle Display Proposals

## Current State

The movements page header contains a prominent `<Trash2>` icon button with an "Orphaned (175)" badge. Clicking it toggles a full `OrphanedMovementsPanel` card that appears between the header and the movement list, pushing content down. This is visually loud and distracting for something the user rarely interacts with.

**Current code location**: `MovementsPage.tsx` lines ~155-165 — the button lives in the header `flex gap-2` alongside "Batch Add" and "New Movement".

---

## Proposal A: Inline Footer Notice

### What It Looks Like

A single line of muted text at the very bottom of the movements list, after all regular movements and the "Load More" button (if present). No icon, no badge, no colored background — just small gray text with an underlined link.

```
────────────────────────────────────────────────────────
[... all your regular movements above ...]
[Load More button if applicable]

                                        175 movements from deleted accounts · Manage
```

### Exact UI Specification

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

### Where It Goes

- **Remove**: The `<Button variant="secondary">` with `<Trash2>` icon from the page header entirely.
- **Add**: Place the footer notice at the bottom of the `<div className="space-y-6">` container, after the "Load More" section and before `<MovementFormPanel>`.

### How the User Accesses Restore

1. User scrolls to the bottom of their movements list
2. Sees the muted text: "175 movements from deleted accounts · Manage"
3. Clicks "Manage" — this sets `showOrphaned = true`
4. The existing `OrphanedMovementsPanel` opens (same as today) with grouped restore buttons

### Why It's Subtle

- **No icon** — removes the trash can visual entirely
- **No badge/pill** — no colored count indicator
- **No header presence** — the header only shows action buttons the user actually uses daily
- **Tiny text** — `text-xs text-gray-500` is the smallest, most muted text in the design system
- **Bottom placement** — user only sees it if they scroll past all their real movements
- **No background/border** — blends into the page whitespace
- **Single line** — takes up minimal vertical space

---

## Proposal B: Collapsed Section at the Bottom

### What It Looks Like

A thin horizontal divider line with centered text, styled like a section separator. Collapsed by default. When expanded, shows orphaned movements grouped by their original account name with restore buttons.

```
────────────────────────────────────────────────────────
[... all your regular movements above ...]
[Load More button if applicable]

─────────── Deleted accounts · 175 movements ───────────
                    [click to expand]

[When expanded:]
─────────── Deleted accounts · 175 movements ───────────

  Bancolombia (COP) — 89 movements          [Restore]
  Nu Mexico (MXN) — 52 movements            [Restore]
  Old Savings (USD) — 34 movements           [Restore]
```

### Exact UI Specification

```tsx
{orphanedCount > 0 && (
  <div className="pt-6">
    <button
      onClick={() => setShowOrphaned((v) => !v)}
      className="w-full flex items-center gap-3 text-xs text-gray-500 dark:text-gray-600 hover:text-gray-600 dark:hover:text-gray-400 transition-colors"
      aria-expanded={showOrphaned}
    >
      <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
      <span>Deleted accounts · {orphanedCount} movements</span>
      <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
    </button>

    {showOrphaned && (
      <div className="mt-4 space-y-3">
        {groups.map((group) => (
          <div key={group.key} className="flex items-center justify-between px-4 py-2 rounded bg-gray-50 dark:bg-gray-800/50">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {group.accountName} ({group.currency}) — {group.movements.length} movements
            </span>
            <button
              onClick={() => restore.open({ movementIds: group.movements.map(m => m.id), sourceLabel: `${group.accountName} (${group.currency})` })}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
            >
              Restore
            </button>
          </div>
        ))}
      </div>
    )}
  </div>
)}
```

### Where It Goes

- **Remove**: The `<Button variant="secondary">` with `<Trash2>` icon from the page header.
- **Remove**: The separate `<OrphanedMovementsPanel>` component rendering (no longer needed as a standalone card).
- **Add**: Place the collapsed divider section at the bottom of the page, after "Load More", before `<MovementFormPanel>`.

### How the User Accesses Restore

1. User scrolls to the bottom of their movements list
2. Sees a thin divider line: `─── Deleted accounts · 175 movements ───`
3. Clicks the divider — it expands inline to show groups
4. Each group has a "Restore" text link that opens the `RestoreOrphanedModal`

### Why It's Subtle

- **Looks like a page-end divider** — visually reads as "end of content" separator, not a feature
- **No icon, no badge** — just a thin line with tiny centered text
- **Collapsed by default** — takes up only ~20px of vertical space
- **Bottom placement** — below all real content
- **Gray-on-gray** — `text-gray-500` on `bg-gray-200` line, nearly invisible
- **No card/panel** — when expanded, shows a flat list without heavy card styling
- **Inline expansion** — doesn't push content around or open modals until restore is clicked

---

## Comparison

| Aspect | Proposal A (Footer Notice) | Proposal B (Collapsed Section) |
|--------|---------------------------|-------------------------------|
| Visual weight | Near-zero (single line of text) | Very low (thin divider line) |
| Interaction steps to restore | 2 (click Manage → click Restore in panel) | 2 (click divider → click Restore) |
| Shows orphaned details | No (opens existing panel) | Yes (inline grouped list) |
| Extra component needed | No (reuses OrphanedMovementsPanel) | Minimal (inline JSX, can remove panel) |
| Discoverability | Lower (just text, easy to miss) | Slightly higher (divider draws the eye) |
| Header cleanup | Removes trash button | Removes trash button |
| Mobile friendliness | Excellent (single line) | Good (expandable section) |

## Recommendation

Both proposals achieve the goal of being 100x more subtle. The choice depends on preference:

- **Proposal A** if you want maximum minimalism — orphaned movements are truly "out of sight, out of mind" until you deliberately scroll down and look.
- **Proposal B** if you want a self-contained solution that doesn't require the separate `OrphanedMovementsPanel` card at all — everything lives inline at the bottom.
