# Mobile Responsiveness Audit

**Date**: 2026-05-21  
**Scope**: `frontend/src/` — Layout, navigation, modals, forms, lists, and fixed elements

## Summary

The app has a **solid mobile-first foundation** with dedicated mobile navigation (header + bottom bar + drawer), responsive breakpoints via Tailwind (`md:` at 768px), and proper viewport meta. However, there are notable gaps: touch targets are undersized, floating stats bars overflow on narrow screens, the `pb-safe` utility is undefined, and the MovementFormPanel is unusable on mobile due to fixed height constraints.

**Overall Grade**: B- (Good structure, needs targeted fixes)

---

## 1. Responsive Layout

**Verdict: GOOD**

| Component | Behavior |
|-----------|----------|
| `Layout.tsx` | `pb-20 md:pb-0` for bottom nav clearance; `md:ml-64` for sidebar offset; `overflow-x-hidden` on root |
| `Sidebar.tsx` | `hidden md:block fixed left-0 w-64` — desktop only |
| `BottomNav.tsx` | `md:hidden` — mobile only; fixed header (h-16) + fixed bottom bar + slide-down drawer |
| `QuickActionsFAB.tsx` | `md:hidden` — mobile-only FAB at `bottom-20 right-4` |

The layout correctly switches between sidebar (desktop) and bottom nav + header (mobile) at the `md` breakpoint. Content area adjusts padding accordingly.

**Issues**:
- None structural. The breakpoint strategy is consistent.

---

## 2. Modal Usability on Small Screens

**Verdict: MOSTLY GOOD, one critical issue**

### Generic `Modal.tsx`
- Uses `p-4 sm:p-6` padding on the wrapper — good mobile spacing
- `max-h-[calc(100vh-3rem)] overflow-y-auto` — scrollable, respects viewport
- Sticky header with `backdrop-blur-md` — stays accessible while scrolling
- Size classes go up to `full: max-w-[calc(100vw-2rem)]`
- Focus trap and Escape key handling implemented

### `MovementFormPanel.tsx` — CRITICAL ISSUE
- Uses `fixed inset-0` with `p-4 sm:p-6 pt-12`
- Form container: `min-h-[calc(100vh-6rem)] max-h-[calc(100vh-6rem)]` — forces exact height
- Right side panels: `hidden lg:flex` — correctly hidden on mobile
- **Problem**: On mobile, the form takes full viewport minus 6rem but starts at `pt-12`, leaving very little scrollable area. The `min-h` constraint prevents the form from being shorter than the viewport, which can push content below the fold on short screens (landscape, split-screen).

**Recommendation**: Replace `min-h-[calc(100vh-6rem)]` with just `max-h-[calc(100vh-6rem)]` so the form can be shorter than the viewport when content is minimal.

---

## 3. Touch Targets

**Verdict: NEEDS IMPROVEMENT**

| Element | Actual Size | Meets 44x44px? |
|---------|-------------|-----------------|
| Bottom nav links | `p-2` (~32x32px content area) + icon `w-6 h-6` | NO — ~40px total |
| Header buttons (theme, menu) | `p-2` (~32x32px) | NO |
| FAB button | `w-14 h-14` (56px) | YES |
| Sort buttons (MovementList) | `size="sm"` → `px-3 py-1.5` | NO — ~30px height |
| Movement row action buttons | `size="sm" variant="ghost"` with `w-4 h-4` icons | NO — ~28px |
| Checkbox in MovementRow | `w-4 h-4` (16px) | NO — critically small |
| Modal close button | `p-2` with `w-5 h-5` icon | BORDERLINE — ~36px |
| Sidebar nav links | `px-4 py-2.5` | YES — ~44px height |
| Drawer nav links | `px-4 py-3` | YES — ~48px height |

**Critical offenders**:
1. Checkboxes at 16px are extremely hard to tap on mobile
2. Movement row action buttons (edit/delete) are too small
3. Bottom nav items are slightly below the 44px minimum

---

## 4. Tables/Lists Scrollability

**Verdict: ADEQUATE**

| Component | Handling |
|-----------|----------|
| `Layout.tsx` root | `overflow-x-hidden` — prevents horizontal page scroll |
| `MovementList.tsx` sort controls | `overflow-x-auto pb-2` — horizontally scrollable |
| `FixedExpensesSummary.tsx` table | `overflow-x-auto` wrapper — correct |
| `BudgetDistribution.tsx` | `overflow-x-auto pb-2` — correct |
| Movement rows | Flex-wrap with `flex-col sm:flex-row` — stacks on mobile |

**Issues**:
- The `FixedExpensesSummary` table has no `min-width` set, so columns can compress to unreadable widths before horizontal scroll kicks in.
- No `<table>` elements use `table-layout: fixed` or explicit column widths.

---

## 5. Text Readability

**Verdict: MOSTLY GOOD, some concerns**

**Good practices**:
- Body text uses default Tailwind sizes (`text-sm`, `text-base`)
- Headings scale appropriately (`text-xl`, `text-2xl`, `text-3xl`)
- Dark mode contrast is well-handled throughout

**Concerns**:
- `text-[10px]` used in 17 instances across 7 files — this is below the 12px minimum for readability on mobile:
  - `BottomNav.tsx`: nav labels (2 instances)
  - `AccountCard.tsx`: badge labels (3 instances)
  - `FixedExpensesSummary.tsx`: table data (7 instances)
  - `MarkAsPaidModal.tsx`, `CDAccountCard.tsx`, `FixedExpenseGroupCard.tsx`, `AccountContextPanel.tsx`
- Line lengths are not constrained — on tablets in landscape, text can span very wide

**Recommendation**: Replace `text-[10px]` with `text-xs` (12px) minimum. Add `max-w-prose` or similar constraints for long-form text.

---

## 6. Desktop-Only Features That Break on Mobile

**Verdict: ONE ISSUE**

| Feature | Mobile Behavior |
|---------|-----------------|
| Sidebar | Hidden, replaced by bottom nav + drawer |
| QuickActionsFAB | Mobile-only, hidden on desktop |
| MovementFormPanel right panels | `hidden lg:flex` — correctly hidden |
| FloatingPanel | Uses `fixed top-20 right-4 w-80` — **PROBLEM** |

**FloatingPanel issue**: This component renders at a fixed `w-80` (320px) positioned `right-4`. On a 375px-wide phone, it would overflow the viewport or leave only 39px of visible page. There's no responsive width or mobile-specific behavior.

**Recommendation**: Add `max-w-[calc(100vw-2rem)]` or convert to a full-screen modal on mobile.

---

## 7. Navigation Usability on Mobile

**Verdict: GOOD**

- Fixed top header (h-16) with logo, theme toggle, hamburger
- Slide-down drawer with full nav list + sign-out
- Fixed bottom bar with 4 shortcuts + Menu button
- Drawer auto-closes on route change
- `aria-expanded`, `aria-label` attributes present
- Menu button toggles between hamburger and X icon

**Minor issues**:
- No swipe-to-close gesture on the drawer
- Drawer backdrop uses `bg-gray-900/50` which may not be opaque enough to indicate modality on bright screens

---

## 8. Form Usability on Mobile

**Verdict: GOOD**

| Element | Mobile Behavior |
|---------|-----------------|
| `Input.tsx` | `w-full px-4 py-3` — full width, adequate height (~44px with padding) |
| `Select.tsx` | `w-full px-4 py-3` — full width, native dropdown on mobile |
| `MovementFilters` | `flex-col sm:flex-row` for search + filter button; grid `grid-cols-1 md:grid-cols-2 lg:grid-cols-4` |
| Date inputs | Native `type="date"` — uses OS date picker on mobile |

**Good practices**:
- Inputs use `py-3` which gives ~44px touch height
- Selects use native `<select>` elements (not custom dropdowns) — mobile OS handles them
- Filter grid stacks to single column on mobile
- `rounded-xl` and `shadow-sm` provide clear visual boundaries

**No issues found** with form usability.

---

## 9. Fixed-Position Element Overlap

**Verdict: POTENTIAL ISSUES**

Fixed elements on mobile (stacking from bottom):

```
z-50: Sidebar (desktop only — hidden on mobile)
z-40: Mobile header (top: 0, h-16)
z-40: Bottom nav bar (bottom: 0)
z-50: QuickActionsFAB (bottom-20 right-4)
z-50: FloatingStatsBar (bottom-6, centered)
z-50: MovementList stats bar (bottom-24 md:bottom-6, centered)
z-50: Toast container (top-4 right-4)
z-30: Mobile drawer overlay (inset-0, pt-16)
z-[60]: FloatingPanel (top-20)
```

**Overlap risks**:
1. **FloatingStatsBar** (`bottom-6`) overlaps with the **bottom nav** (`bottom-0`, ~56px tall). On mobile, the stats bar sits directly on top of the nav bar.
2. **MovementList stats bar** uses `bottom-24 md:bottom-6` — correctly offset on mobile (96px from bottom clears the nav), but the `FloatingStatsBar` in SummaryPage does NOT have this mobile offset.
3. **QuickActionsFAB** at `bottom-20` (80px) is positioned above the bottom nav (~56px) — correct, but tight.
4. **Toast container** at `top-4 right-4` could overlap with the mobile header (`h-16`, top-0) — toasts start at 16px from top, header is 64px tall. First toast would be hidden behind the header.

**Recommendations**:
- `FloatingStatsBar`: Add `bottom-24 md:bottom-6` (same pattern as MovementList)
- `ToastContainer`: Change to `top-20` on mobile to clear the fixed header

---

## 10. Viewport Meta Tag

**Verdict: CORRECT**

```html
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
```

Present in `frontend/index.html`. Standard and correct.

**Missing but recommended**:
- No `viewport-fit=cover` for notched devices (iPhone X+)
- The `pb-safe` class used in `BottomNav.tsx` is **not defined** anywhere in the codebase (no Tailwind config, no CSS file). This means the bottom nav has NO safe-area padding on notched devices.

---

## Responsive Class Usage Statistics

- **33 files** use responsive breakpoint classes (`sm:`, `md:`, `lg:`, `xl:`)
- **80 total instances** of responsive classes
- Primary breakpoint: `md:` (768px) — used for sidebar/bottom-nav switch
- Secondary: `sm:` — used for flex direction changes and text visibility
- Tertiary: `lg:` — used for MovementFormPanel side panels

---

## Priority Fixes

### Critical (Breaks functionality)
1. **`pb-safe` is undefined** — bottom nav content is clipped on notched iPhones
2. **FloatingStatsBar overlaps bottom nav** on mobile — content is unreachable
3. **MovementFormPanel `min-h`** — forces unusable layout on short mobile viewports

### High (Poor UX)
4. **Touch targets too small** — checkboxes (16px), action buttons (~28px), bottom nav items (~40px)
5. **`text-[10px]` usage** — 17 instances of unreadable text on mobile
6. **FloatingPanel overflows** on mobile — no max-width constraint
7. **Toast container hidden behind header** on mobile

### Medium (Polish)
8. **FixedExpensesSummary table** — no min-width, columns compress too much
9. **No swipe gesture** on mobile drawer
10. **No `viewport-fit=cover`** in meta tag for notched devices

---

## App.css Conflict

The `App.css` file contains legacy Vite boilerplate:
```css
#root {
  max-width: 1280px;
  margin: 0 auto;
  padding: 2rem;
  text-align: center;
}
```

This `max-width: 1280px` and `padding: 2rem` on `#root` constrains the entire app and adds unnecessary padding. The `text-align: center` is also problematic. This file appears to be leftover from the Vite template and should be cleaned up — the Layout component handles all spacing.

---

## Sources

- Direct code inspection of `frontend/src/` components, pages, and styles — accessed 2026-05-21
