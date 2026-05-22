# UI Revert: Foundation + Summary + Accounts

## Summary

Revert the "Luminous Ledger" design system visual styling back to standard Tailwind dark/light mode while **keeping all structural layouts** intact. The overhaul was introduced in commit `22b12e5` ("Foundation — Tailwind theme, CSS variables, Inter + JetBrains Mono fonts").

**Key principle**: Keep new structural layouts (grid arrangements, split panels, widget placement). Revert all visual tokens (colors, fonts, glass effects, custom theme) back to standard Tailwind `dark:` prefix pattern with `bg-gray-800`, `text-gray-100`, `border-gray-700`, etc.

---

## Task 1: Foundation Revert (index.css, main.tsx, index.html, package.json)

### Files to modify:
- `frontend/index.html`
- `frontend/src/index.css`
- `frontend/src/main.tsx`
- `frontend/package.json`

### Changes:

#### `frontend/index.html`
Remove `class="dark"` from `<html>` tag. The ThemeProvider already handles adding/removing the `dark` class dynamically via `useThemeStore`.

**Current:**
```html
<html lang="en" class="dark">
```
**Target:**
```html
<html lang="en">
```

#### `frontend/src/main.tsx`
Remove font imports (lines 1-2):

**Remove:**
```tsx
import '@fontsource-variable/inter';
import '@fontsource-variable/jetbrains-mono';
```

Rest of the file stays the same (ThemeProvider, QueryClient, etc. are structural).

#### `frontend/src/index.css`
Replace the entire file with the original pre-overhaul version. Key differences:

**Remove:**
- The entire `@theme { ... }` block with surface/primary/secondary/tertiary/font tokens
- `body { ... }` hardcoded styles
- `.glass-card` and `.glass-card-elevated` utilities
- `.font-data` utility
- `.range-slider` styles
- Custom scrollbar using `rgba(61, 73, 76, ...)` colors

**Restore:**
- `@media (prefers-color-scheme: dark)` block
- Minimal `@theme { --color-scheme: light dark; }`
- `.dark .custom-scrollbar` variant with `rgba(75, 85, 99, ...)` colors
- Original animation easing (`cubic-bezier(0.16, 1, 0.3, 1)` instead of `0.4, 0, 0.2, 1`)

**Full target content for `index.css`:**
```css
@import "tailwindcss";

@source "../**/*.{js,ts,jsx,tsx,html}";

/* Safe-area inset utilities for notched devices */
@utility pb-safe {
  padding-bottom: env(safe-area-inset-bottom, 0px);
}
@utility pt-safe {
  padding-top: env(safe-area-inset-top, 0px);
}
@utility pl-safe {
  padding-left: env(safe-area-inset-left, 0px);
}
@utility pr-safe {
  padding-right: env(safe-area-inset-right, 0px);
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  :root {
    color-scheme: dark;
  }
}

/* Enable dark mode class strategy */
@theme {
  --color-scheme: light dark;
}

/* Custom animations */
@keyframes toast-enter {
  from { transform: translateX(100%) scale(0.95); opacity: 0; }
  to { transform: translateX(0) scale(1); opacity: 1; }
}

@keyframes toast-exit {
  from { transform: translateX(0) scale(1); opacity: 1; }
  to { transform: translateX(100%) scale(0.95); opacity: 0; }
}

.animate-toast-enter {
  animation: toast-enter 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.animate-toast-exit {
  animation: toast-exit 0.3s cubic-bezier(0.7, 0, 0.84, 0);
}

/* Floating panel animations */
@keyframes slide-in-right {
  from { transform: translateX(100%); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}

@keyframes slide-in-left {
  from { transform: translateX(-100%); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}

.animate-slide-in-right {
  animation: slide-in-right 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.animate-slide-in-left {
  animation: slide-in-left 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

/* Modal backdrop animation */
@keyframes backdrop-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

.animate-backdrop-in {
  animation: backdrop-in 0.2s ease-out;
}

/* Modal content animation */
@keyframes modal-in {
  from { transform: scale(0.95); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}

.animate-modal-in {
  animation: modal-in 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

/* Custom scrollbar */
.custom-scrollbar::-webkit-scrollbar {
  width: 8px;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(156, 163, 175, 0.5);
  border-radius: 4px;
}

.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: rgba(156, 163, 175, 0.7);
}

.dark .custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(75, 85, 99, 0.5);
}

.dark .custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: rgba(75, 85, 99, 0.7);
}
```

#### `frontend/package.json`
Remove font dependencies:
```
"@fontsource-variable/inter": "^5.2.8",
"@fontsource-variable/jetbrains-mono": "^5.2.8",
```

---

## Task 2: UI Primitives Revert (Button, Card, Input, Select, Modal, Skeleton, EmptyState, PageHeader)

### Color mapping reference (new → old):
| Luminous Ledger Token | Standard Tailwind Equivalent |
|---|---|
| `bg-surface-container` | `bg-white dark:bg-gray-800` |
| `bg-surface-container-high` | `bg-gray-50 dark:bg-gray-700` |
| `bg-surface-container-highest` | `bg-gray-100 dark:bg-gray-700` |
| `bg-surface-container-low` | `bg-gray-50 dark:bg-gray-800` |
| `bg-surface-base` | `bg-gray-100 dark:bg-gray-900` |
| `text-on-surface` | `text-gray-900 dark:text-gray-100` |
| `text-on-surface-variant` | `text-gray-600 dark:text-gray-400` (or `text-gray-500 dark:text-gray-400`) |
| `border-outline-variant` | `border-gray-200 dark:border-gray-700` |
| `border-white/[0.08]` | `border-gray-200 dark:border-gray-700` |
| `border-white/[0.06]` | `border-gray-200 dark:border-gray-700` |
| `text-primary` | `text-blue-600 dark:text-blue-400` |
| `bg-primary/10` | `bg-blue-50 dark:bg-blue-900/20` |
| `border-primary/30` | `border-blue-500 dark:border-blue-400` |
| `text-error` | `text-red-600 dark:text-red-400` |
| `bg-error/10` | `bg-red-50 dark:bg-red-900/20` |
| `ring-primary/20` | `ring-blue-500/20 dark:ring-blue-400/20` |
| `backdrop-blur-*` | Remove entirely |
| `bg-*/80` (opacity on surface) | Use solid colors |

### Files and their target states:

#### `Button.tsx`
**Remove:** gradient backgrounds, glow shadows, scale transforms on hover, `ring-primary/30`
**Restore:** Standard `bg-blue-600 dark:bg-blue-500 text-white` for primary, `bg-gray-200 dark:bg-gray-700` for secondary, etc.

Full original variants:
```tsx
const variants = {
  primary: 'bg-blue-600 dark:bg-blue-500 text-white hover:bg-blue-700 dark:hover:bg-blue-600 focus:ring-blue-500 dark:focus:ring-blue-400',
  secondary: 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 focus:ring-gray-500 dark:focus:ring-gray-400',
  danger: 'bg-red-600 dark:bg-red-500 text-white hover:bg-red-700 dark:hover:bg-red-600 focus:ring-red-500 dark:focus:ring-red-400',
  ghost: 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 focus:ring-gray-500 dark:focus:ring-gray-400',
};
```
Also restore `focus:ring-offset-2` in baseStyles and remove `active:scale-[0.98]`.

#### `Card.tsx`
**Remove:** `backdrop-blur-[12px]`, `border-white/[0.08]`, opacity backgrounds
**Restore:**
```tsx
const baseStyles = 'bg-white dark:bg-gray-800 rounded-lg shadow-sm transition-all duration-200';
const variantStyles = {
  default: 'border border-gray-200 dark:border-gray-700',
  interactive: 'border border-gray-200 dark:border-gray-700 cursor-pointer hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-md hover:scale-[1.01]',
  highlighted: 'border-2 border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20',
  danger: 'border-2 border-red-500 dark:border-red-400 bg-red-50 dark:bg-red-900/20',
};
```
Also restore `md` padding to `p-6` (currently `p-5`).

#### `Input.tsx`
**Remove:** `bg-surface-container-highest`, `text-on-surface`, `border-outline-variant`, `text-on-surface-variant`, `font-mono` for numeric, uppercase label styling
**Restore:**
```tsx
const baseStyles = 'w-full px-4 py-3 border rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-0 shadow-sm';
const normalStyles = 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-blue-500/20 dark:focus:ring-blue-400/20 focus:ring-4';
const errorStyles = 'border-red-500 dark:border-red-400 bg-red-50 dark:bg-red-900/20 text-gray-900 dark:text-gray-100 focus:border-red-500 dark:focus:border-red-400 focus:ring-red-500/20 dark:focus:ring-red-400/20 focus:ring-4';
```
Label: `block text-sm font-medium text-gray-700 dark:text-gray-300` (not uppercase/tracking-wider)
Icons: `text-gray-400 dark:text-gray-500`
Remove `type` prop usage for font-mono conditional.

#### `Select.tsx`
Same pattern as Input. Restore `shadow-sm`, `rounded-xl`, standard gray/blue colors.
Arrow icon: `text-gray-400 dark:text-gray-500` (not `text-primary`)

#### `Modal.tsx`
**Remove:** `bg-surface-container-high/90 backdrop-blur-[20px]`, `border-primary/10`, `border-white/[0.06]`
**Restore:**
- Backdrop: `bg-gray-900/40 dark:bg-black/60 backdrop-blur-sm`
- Content: `bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700`
- Header: `border-b border-gray-100 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 backdrop-blur-md`
- Title: `text-xl font-bold text-gray-900 dark:text-gray-100`
- Close button: `text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50`

#### `Skeleton.tsx`
Replace `bg-surface-container-high` with `bg-gray-200 dark:bg-gray-700`.
Replace `bg-surface-container` with `bg-white dark:bg-gray-800`.

#### `EmptyState.tsx`
Replace `bg-surface-container-highest` with `bg-gray-100 dark:bg-gray-800`.
Replace `text-on-surface-variant` with `text-gray-400 dark:text-gray-500`.
Replace `text-on-surface` with `text-gray-900 dark:text-gray-100`.

#### `PageHeader.tsx`
Replace `text-on-surface` with `text-gray-900 dark:text-gray-100`.
Replace `text-on-surface-variant` with `text-gray-600 dark:text-gray-400`.

---

## Task 3: Layout Revert (Sidebar, BottomNav)

### Files:
- `frontend/src/components/layout/Sidebar.tsx`
- `frontend/src/components/layout/BottomNav.tsx`

### Sidebar.tsx
**Keep:** Fixed left sidebar structure, nav items, user profile section
**Revert styling to:**
- Container: `bg-white dark:bg-gray-800 shadow-lg border-r border-gray-200 dark:border-gray-700`
- Remove `backdrop-blur-xl`, `bg-surface-container/80`, `border-white/10`
- Logo: green gradient (`from-green-500 to-emerald-600`) instead of teal/primary
- Title: `from-green-600 to-emerald-600 dark:from-green-400 dark:to-emerald-400` gradient text
- Nav items active: `bg-gradient-to-r from-blue-500 to-slate-600 text-white shadow-lg` (not `border-l-4 border-primary`)
- Nav items inactive: `text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700`
- Restore theme toggle button (Sun/Moon) and sign-out button
- Restore `useThemeStore` import and `toggleTheme` usage
- Restore `useNavigate` and sign-out handler

### BottomNav.tsx
**Keep:** Mobile header + bottom bar + drawer overlay structure
**Revert styling to:**
- Header: `bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700`
- Remove `backdrop-blur-xl`, `bg-surface-container-low/95`, `border-white/[0.06]`
- Logo icon: green gradient (not primary-container)
- Title: `text-gray-900 dark:text-gray-100` (not `text-primary`)
- Bottom bar: `bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700`
- Active nav: `text-blue-600 dark:text-blue-400` (not `text-primary`)
- Inactive nav: `text-gray-600 dark:text-gray-400`
- Restore theme toggle (Sun/Moon) in header
- Restore `useThemeStore` import

---

## Task 4: Summary Page Styling Revert

### File: `frontend/src/pages/SummaryPage.tsx`

**KEEP (structural):**
- 12-column grid layout (`grid grid-cols-12 gap-6`)
- Left column (col-span-7): NetWorthHero + SpendingDensityCard + CapitalBreakdown
- Right column (col-span-5): NetWorthTimelineWidget + RemindersWidget + FixedObligationsWidget
- FloatingActionBar and FloatingStatsBar
- SelectionProvider wrapper
- All data fetching, hooks, error handling logic

**REVERT (styling):**
The SummaryPage itself uses minimal direct styling (mostly structural classes). The visual revert happens in its child components. However, any `text-on-surface`, `bg-surface-*` classes in this file should become standard Tailwind.

### Child components that need styling revert (separate sub-tasks or included):
- `NetWorthHero` — revert any custom token colors
- `SpendingDensityCard` — revert surface/primary tokens
- `CapitalBreakdown` — revert to old detailed account cards (not minimal rows)
- `FixedObligationsWidget` — revert tokens
- `FloatingActionBar` — revert glass/blur effects
- `FloatingStatsBar` — revert glass/blur effects
- `RemindersWidget` — revert tokens
- `NetWorthTimelineWidget` — revert tokens

**Important**: The CapitalBreakdown component currently shows accounts as minimal rows. The user wants the **old detailed account cards** restored in the summary view.

---

## Task 5: Accounts Page Full Visual Revert

### File: `frontend/src/pages/AccountsPage.tsx`

**KEEP (structural):**
- Split layout: accounts list (left, `lg:col-span-2`) + pocket panel (right, `lg:col-span-1`)
- Search input + filter chips row
- Account selection → pocket management panel
- All hooks, mutations, handlers, form logic
- Modal forms (AccountForm, CDAccountForm, CascadeDeleteDialog)

**REVERT (visual):**

1. **Header section:**
   - `text-on-surface` → `text-gray-900 dark:text-gray-100`
   - `text-on-surface-variant` → `text-gray-600 dark:text-gray-400`
   - Button: restore standard `variant="primary"` or use old outline style with gray/blue colors

2. **Search input:**
   - `bg-surface-container-low` → `bg-white dark:bg-gray-800`
   - `text-on-surface` → `text-gray-900 dark:text-gray-100`
   - `text-on-surface-variant/40` → `text-gray-400 dark:text-gray-500`
   - Add `border border-gray-200 dark:border-gray-700`

3. **Filter chips:**
   - Active: `bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-500/20` (not `bg-primary/10 text-primary border-primary/20`)
   - Inactive: `bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-600` (not `bg-white/5 text-on-surface-variant border-white/5`)

4. **Account list items:**
   - Selected: `bg-blue-50 dark:bg-blue-900/20 border-blue-500 dark:border-blue-400`
   - Default: `bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700`
   - Icon container: `bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400`
   - Name: `text-gray-900 dark:text-gray-100`
   - Subtitle: `text-gray-500 dark:text-gray-400`
   - Currency badge: `bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400`
   - Balance: `text-gray-900 dark:text-gray-100`
   - Edit/delete buttons: standard gray hover states

5. **Pocket panel (right side):**
   - Remove `glass-card` class
   - Use `bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5`

6. **FULL REVERT consideration**: The user wants the **old visual style with colored gradients and special account styling**. The original AccountsPage used:
   - `AccountCard` component (colored gradient cards per account)
   - `CDAccountCard` component
   - `SortableList` / `SortableItem` for drag-and-drop reordering
   - `AccountDetailPanel` for the right side
   - `PageHeader` component

   The coder should check if these old components still exist and restore their usage if the user wants the full old card-based look. If they've been deleted, the current list layout is acceptable but with standard Tailwind colors (no custom tokens).

---

## Global Search-and-Replace Patterns

For any file touched by these tasks, apply these replacements throughout:

```
text-on-surface         → text-gray-900 dark:text-gray-100
text-on-surface-variant → text-gray-600 dark:text-gray-400  (or text-gray-500 dark:text-gray-400)
bg-surface-container-highest → bg-gray-100 dark:bg-gray-700
bg-surface-container-high    → bg-gray-50 dark:bg-gray-700
bg-surface-container-low     → bg-gray-50 dark:bg-gray-800
bg-surface-container         → bg-white dark:bg-gray-800
bg-surface-base              → bg-gray-100 dark:bg-gray-900
border-outline-variant       → border-gray-200 dark:border-gray-700
border-white/[0.08]          → border-gray-200 dark:border-gray-700
border-white/[0.06]          → border-gray-200 dark:border-gray-700
border-white/10              → border-gray-200 dark:border-gray-700
text-primary                 → text-blue-600 dark:text-blue-400
bg-primary/10                → bg-blue-50 dark:bg-blue-900/20
bg-primary/5                 → bg-blue-50/50 dark:bg-blue-900/10
border-primary/30            → border-blue-300 dark:border-blue-600
border-primary/20            → border-blue-200 dark:border-blue-700
ring-primary/30              → ring-blue-500/30 dark:ring-blue-400/30
ring-primary/20              → ring-blue-500/20 dark:ring-blue-400/20
text-error                   → text-red-600 dark:text-red-400
bg-error/10                  → bg-red-50 dark:bg-red-900/20
border-error/20              → border-red-300 dark:border-red-600
bg-white/5                   → bg-gray-50 dark:bg-gray-700/50
bg-white/10                  → bg-gray-100 dark:bg-gray-700
hover:bg-white/5             → hover:bg-gray-50 dark:hover:bg-gray-700/50
hover:bg-white/10            → hover:bg-gray-100 dark:hover:bg-gray-700
text-on-primary              → text-white
bg-primary-container         → bg-blue-600 dark:bg-blue-500
from-primary-container       → from-blue-600
font-display                 → (remove, use default sans)
font-mono (for data)         → (remove unless actual code)
backdrop-blur-*              → (remove entirely)
glass-card                   → (replace with Card or standard bg + border)
```

---

## Execution Notes

- **Do NOT remove** the `ThemeProvider` or `useThemeStore` — they handle the `dark` class toggle correctly
- **Do NOT remove** the safe-area utilities (`pb-safe`, `pt-safe`, etc.)
- **Do NOT remove** animation keyframes (toast, slide, modal, backdrop)
- After Task 1, run `npm install` to remove font packages from node_modules
- After all tasks, run `npm run build` to verify no broken class references
- The `font-data` class and `font-mono` usage for numbers can be removed (go back to default font for everything)
