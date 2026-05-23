# Frontend Package Evaluation for UI Overhaul

> Target design: **Cyber-Minimalist Glassmorphism** — deep obsidian backgrounds, translucent glass layers, teal accents, dual-font strategy (Inter + JetBrains Mono).

## Summary

The current stack is lean and well-chosen. The major gaps are: **no font loading strategy**, **no animation library** (needed for panel transitions), and **components still use old gray/blue Tailwind defaults** instead of the design system tokens. No packages need removal. The biggest wins come from adding `@fontsource` packages and optionally Radix UI primitives for accessibility.

---

## 1. CSS/Styling Framework

### Current: Tailwind CSS v4 (via `@tailwindcss/postcss` ^4.1.17)

**Setup**: PostCSS plugin mode (`postcss.config.js` → `@tailwindcss/postcss`). No `tailwind.config.ts` file — Tailwind v4 uses CSS-first configuration via `@theme` directives in `index.css`.

**Assessment**: Tailwind v4 is the right choice. It natively supports:
- CSS custom properties (perfect for the design system color tokens)
- `backdrop-filter: blur()` via `backdrop-blur-*` utilities
- Arbitrary values for glass borders: `border-[rgba(255,255,255,0.08)]`
- `@theme` blocks for defining custom design tokens without a config file
- `@utility` for custom utilities (already used for safe-area insets)

### Recommendations

| Package | Action | Why | Bundle Impact | Priority |
|---------|--------|-----|---------------|----------|
| `@tailwindcss/postcss` | **Keep** (already v4.1.17) | Core styling engine | 0 (build-time) | — |
| `autoprefixer` | **Keep** | Still needed for vendor prefixes | 0 (build-time) | — |
| `tailwindcss-animate` | **Skip** | Tailwind v4 has native `@keyframes` + `@utility` support; you're already defining custom animations in `index.css` | N/A | — |
| `@tailwindcss/forms` | **Skip** | The design system uses custom-styled inputs (dark backgrounds, teal focus borders). The forms plugin resets to browser defaults which you'd override anyway. | N/A | — |
| Custom glass plugin | **Skip** | Not needed. Define glass utilities via `@utility` in CSS: `@utility glass-card { background: rgba(27,33,34,0.8); backdrop-filter: blur(12px); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; }` | 0 | — |

**Action needed**: Add design system tokens to `index.css` via `@theme` block:
```css
@theme {
  --color-surface-base: #0e1416;
  --color-surface-container-low: #171d1e;
  --color-surface-container: #1b2122;
  --color-surface-container-high: #252b2d;
  --color-surface-container-highest: #303638;
  --color-on-surface: #dee3e6;
  --color-on-surface-variant: #bcc9cd;
  --color-outline: #869397;
  --color-outline-variant: #3d494c;
  --color-primary: #4cd7f6;
  --color-primary-container: #06b6d4;
  --color-on-primary: #003640;
  --color-success: #34d399;
  --color-error: #ffb4ab;
  --color-error-container: #93000a;
  --color-tertiary: #ffb873;
  --font-display: 'Inter', sans-serif;
  --font-body: 'Inter', sans-serif;
  --font-mono: 'JetBrains Mono', monospace;
}
```

---

## 2. Component Library

### Current: Fully custom (24 UI primitives)

Existing components: Button, Card, Input, Select, Modal, FloatingPanel, CollapsibleSection, SortableList/Item, ProgressBar, Skeleton variants, EmptyState, PageHeader, ColorPicker, AnimatedCounter, AnimatedProgressBar, CurrencyAmount, InlineEditableAmount, SelectableValue, ActionButtons.

**Quality assessment**:
- **Modal**: Excellent accessibility (focus trap, escape handling, focus restoration, aria attributes)
- **FloatingPanel**: Basic — no focus trap, no backdrop, no aria-modal
- **Button**: Clean but uses old blue/gray colors (needs token update)
- **Card**: Uses `bg-white dark:bg-gray-800` — needs full glass rewrite

### Recommendations

| Option | Pros | Cons | Bundle | Verdict |
|--------|------|------|--------|---------|
| **Stay custom** | Full control over glass styling, no abstraction leaks, already have 24 components | Must manually handle accessibility edge cases (combobox, dropdown, tooltip) | 0 added | Viable |
| **Radix UI Primitives** | Headless (zero styling), WAI-ARIA compliant, composable, tree-shakeable | Learning curve, adds dependency layer | ~3-8KB per primitive (gzipped) | **Recommended** |
| **Headless UI** | Tailwind-native, simple API | Fewer primitives, less composable, tied to Tailwind Labs | ~5KB | Second choice |
| **Ark UI** | Newer, state-machine based | Smaller community, less battle-tested | ~10KB | Skip |

### Recommendation: **Add Radix UI selectively**

Don't replace everything. Add Radix only for components where accessibility is complex:

```
@radix-ui/react-dialog        → Replace Modal + FloatingPanel (focus trap, portal, animations)
@radix-ui/react-dropdown-menu → For context menus / action menus
@radix-ui/react-select         → Replace native <select> with styled dropdown
@radix-ui/react-tooltip        → Accessible tooltips (currently missing)
@radix-ui/react-popover        → For color picker, date picker overlays
@radix-ui/react-tabs           → For settings page sections
```

**Keep custom**: Button, Card, Input, ProgressBar, Skeleton, PageHeader, CurrencyAmount — these are simple enough that Radix adds no value.

**Bundle impact**: ~15-25KB total (gzipped) for the 6 primitives above. Tree-shakeable — only pay for what you import.

**Priority**: Nice-to-have for initial overhaul, critical before adding complex interactions (combobox search, nested menus).

---

## 3. Charts

### Current: Recharts v3.5.1

**Usage**: 5 files (NetWorthChart, SpendingByCategory, CategoryTrend, MonthlyTrend, useNetWorthChartData hook).

**Theming capability**: Recharts accepts inline styles and custom colors per component. The current NetWorthChart already uses custom color constants (`CURRENCY_LINE_COLORS`). Recharts supports:
- Custom `stroke`, `fill` colors on all elements
- Custom tooltip components (can be glass-styled)
- Transparent/dark backgrounds via `CartesianGrid` styling
- Custom dot renderers (already implemented)

### Alternatives Comparison

| Library | Dark theme support | Customization | Bundle (gzip) | SSR | Verdict |
|---------|-------------------|---------------|---------------|-----|---------|
| **Recharts 3** | Full (inline styles) | High (custom components) | ~45KB | Yes | **Keep** |
| Nivo | Excellent (theme object) | Very high | ~60-100KB | Yes | Overkill |
| Tremor | Built for dashboards | Limited (opinionated) | ~80KB | Yes | Too opinionated |
| Chart.js | Canvas-based, fast | Medium (imperative API) | ~35KB | No | Wrong paradigm for React |
| Victory | Good | High | ~50KB | Yes | No advantage over Recharts |

### Recommendation: **Keep Recharts**

- Already integrated in 5 files with custom hooks
- Fully themeable for the glassmorphism design (transparent backgrounds, teal/emerald lines, glass tooltip containers)
- v3 is actively maintained and React 19 compatible
- Switching would require rewriting all chart components for zero functional gain

**Theming approach**: Create a shared chart theme config:
```typescript
export const CHART_THEME = {
  grid: { stroke: 'rgba(255,255,255,0.06)' },
  axis: { stroke: '#869397', fontSize: 12, fontFamily: 'JetBrains Mono' },
  tooltip: { background: 'rgba(27,33,34,0.9)', border: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(12px)' },
};
```

---

## 4. Icons

### Current: Lucide React v0.468.0

**Assessment**: Lucide is excellent for this design:
- Consistent 24px grid, 2px stroke width
- 1500+ icons, actively maintained
- Tree-shakeable (only imported icons are bundled)
- Clean geometric style matches the cyber-minimalist aesthetic
- ~200 bytes per icon (gzipped)

### Alternatives

| Library | Icons | Style | Bundle per icon | Verdict |
|---------|-------|-------|-----------------|---------|
| **Lucide** | 1500+ | Clean geometric, 2px stroke | ~200B | **Keep** |
| Phosphor | 7000+ | Multiple weights (thin/light/regular/bold/fill/duotone) | ~250B | Overkill |
| Heroicons | 300+ | Tailwind-native | ~200B | Too few icons |
| Tabler | 5000+ | 1.5px stroke | ~200B | Thinner stroke doesn't match |

### Recommendation: **Keep Lucide React**

No change needed. The geometric 2px stroke style is perfect for the design system. Update to latest version for any new icons needed.

**Priority**: Non-issue.

---

## 5. Animation

### Current: CSS-only (custom `@keyframes` in `index.css`)

Existing animations:
- `toast-enter` / `toast-exit` (translateX + scale + opacity)
- `slide-in-right` / `slide-in-left` (panel slides)
- `backdrop-in` (opacity fade)
- `modal-in` (scale + opacity)
- Tailwind's built-in `animate-spin`, `transition-all`, `duration-200`

**Design system requirements**:
- 150-200ms micro-interactions
- 300ms panel slides
- `cubic-bezier(0.4, 0, 0.2, 1)` easing
- No bouncy/spring animations
- Hover: opacity change, subtle scale (1.01x)
- Panel: translateX from right

### Do we need Framer Motion?

| Scenario | CSS sufficient? | Framer Motion needed? |
|----------|----------------|----------------------|
| Panel slide in/out | Yes (already working) | No |
| Page transitions (route changes) | Difficult (exit animations) | Yes, if wanted |
| Staggered list animations | Possible but verbose | Cleaner with FM |
| Drag reorder animations | Handled by dnd-kit | No |
| Number counting (AnimatedCounter) | Already custom-built | No |
| Hover scale/opacity | Yes (Tailwind utilities) | No |
| Accordion expand/collapse | Tricky (height: auto) | Cleaner with FM |
| Layout animations (reflow) | Impossible in CSS | Yes |

### Recommendation: **Add Framer Motion as nice-to-have, not critical**

| Package | Bundle (gzip) | Use case | Priority |
|---------|---------------|----------|----------|
| `motion` (Framer Motion v11+) | ~33KB | Route transitions, staggered lists, layout animations, accordion height | Nice-to-have |

**If you skip it**: The current CSS animations cover 80% of the design system needs. The panel slide, modal, and toast animations already work. You'd miss smooth route transitions and staggered list reveals.

**If you add it**: Import only what you need via `motion/react` (tree-shakeable in v11+). Use for:
- `<AnimatePresence>` for exit animations on panels/modals
- `layout` prop for smooth reflow when items are added/removed
- Staggered children in account lists

**Verdict**: Skip for initial overhaul. Add later if the design feels static without route transitions.

---

## 6. Forms

### Current: react-hook-form v7.54.2

**Assessment**: Perfect choice. Uncontrolled form management, minimal re-renders, excellent TypeScript support, tiny bundle (~9KB gzip). Integrates cleanly with custom Input/Select components.

### Recommendation: **Keep as-is**

No changes needed. Already the best option for this use case.

---

## 7. Date Handling

### Current: date-fns v4.1.0

**Comparison**:

| Library | Bundle (full) | Tree-shakeable | Immutable | Verdict |
|---------|---------------|----------------|-----------|---------|
| **date-fns v4** | ~75KB full, but tree-shakes to ~5-15KB used | Yes (individual function imports) | Yes | **Keep** |
| dayjs | ~2KB core + plugins | Plugin-based | Yes | Smaller core but plugins add up |
| Temporal (native) | 0KB | N/A | Yes | Not yet stable across browsers |

### Recommendation: **Keep date-fns**

- Already v4 (latest)
- Tree-shakeable — you only pay for functions you import
- Used extensively across the app (reminders, calendar, reports)
- Switching to dayjs saves negligible bundle size after tree-shaking and costs migration effort

---

## 8. Drag & Drop

### Current: @dnd-kit/core ^6.3.1 + @dnd-kit/sortable ^10.0.0 + @dnd-kit/utilities ^3.2.2

**Usage**: `SortableList` and `SortableItem` UI primitives for account/pocket reordering.

**Assessment**: dnd-kit is the correct modern choice:
- Lightweight (~12KB gzip total)
- Accessible (keyboard support built-in)
- Framework-agnostic sensors
- Smooth animations during drag
- Actively maintained

### Recommendation: **Keep as-is**

No alternatives worth considering. react-beautiful-dnd is deprecated. dnd-kit is the standard.

---

## 9. Packages to REMOVE

### Analysis of all dependencies:

| Package | Status | Action |
|---------|--------|--------|
| `yahoo-finance2` | **Not imported in any frontend `src/` file** — only used in `frontend/api/stock-price.ts` (Vercel serverless function) | **Keep** — it's a backend dependency used by the API route, not dead code |
| `@tanstack/react-query-devtools` | Used in `main.tsx` | **Keep** — dev-only, tree-shaken in production builds |
| `zod` (devDependencies) | Used in 2 contract test files | **Keep** — test-only validation |
| `fast-check` (devDependencies) | Property-based testing | **Keep** — test infrastructure |

### MUI / Material UI

**Not present in `package.json`**. The only "Material" reference is a comment in `useBudgetActions.ts` using the word "materializes" (English verb, not the library). **No MUI dependency exists — nothing to remove.**

### Verdict: **No packages to remove**

The dependency list is already clean. Every package is actively used.

---

## 10. Font Loading

### Current: **No font loading at all**

- No Google Fonts `<link>` in `index.html`
- No `@fontsource` packages
- No `font-family` declarations in CSS
- The app currently uses system fonts (browser defaults)

This is a **critical gap** for the design system which requires Inter + JetBrains Mono.

### Options

| Approach | Performance | Reliability | Bundle Impact | Verdict |
|----------|-------------|-------------|---------------|---------|
| Google Fonts CDN `<link>` | FOUT risk, render-blocking, depends on Google CDN | External dependency | 0 (external) | Acceptable but suboptimal |
| **`@fontsource` self-hosted** | No FOUT (bundled), no external requests, preloaded | Self-contained | ~100KB (Inter 400,600,700) + ~50KB (JetBrains Mono 500,600) | **Recommended** |
| `@fontsource-variable` | Same as above but variable font (fewer files) | Self-contained | ~90KB (Inter Variable) + ~45KB (JBM Variable) | **Best option** |

### Recommendation: **Add `@fontsource-variable`**

```bash
npm install @fontsource-variable/inter @fontsource-variable/jetbrains-mono
```

Then in `main.tsx`:
```typescript
import '@fontsource-variable/inter';
import '@fontsource-variable/jetbrains-mono';
```

**Why variable fonts**: Single file covers all weights (400-700 for Inter, 500-600 for JetBrains Mono) instead of separate files per weight. Smaller total download, smoother weight transitions.

**Bundle impact**: ~135KB uncompressed, ~45KB gzipped. Loaded once, cached forever. Eliminates FOUT and external CDN dependency.

**Priority**: **Critical** — the entire design system depends on these two fonts. Must be added before any visual work begins.

---

## Additional Recommendations

### 11. Class Variance Authority (CVA)

| Package | Bundle | Purpose | Priority |
|---------|--------|---------|----------|
| `class-variance-authority` | ~1KB gzip | Type-safe component variant management | Nice-to-have |

**Why**: Your Button, Card, and Input components all have variant/size props with manual string concatenation. CVA provides a `cva()` function that makes variant definitions type-safe and composable:

```typescript
const button = cva('inline-flex items-center rounded-lg font-medium transition-all', {
  variants: {
    variant: { primary: 'bg-primary-container text-on-primary', ghost: 'text-on-surface-variant' },
    size: { sm: 'px-3 py-1.5 text-sm', md: 'px-4 py-2' },
  },
  defaultVariants: { variant: 'primary', size: 'md' },
});
```

**Priority**: Nice-to-have. Reduces boilerplate in component variants but not blocking.

### 12. `clsx` or `tailwind-merge`

| Package | Bundle | Purpose | Priority |
|---------|--------|---------|----------|
| `clsx` | ~0.3KB | Conditional class joining | Nice-to-have |
| `tailwind-merge` | ~3.5KB | Intelligent Tailwind class deduplication | Nice-to-have |

**Why**: Components currently use template literals for class concatenation (`${baseStyles} ${variants[variant]} ${className}`). This can produce conflicting classes when consumers pass overrides. `tailwind-merge` resolves conflicts intelligently.

**Priority**: Nice-to-have. Useful when the design system stabilizes and components need to accept className overrides cleanly.

---

## Final Recommendation Summary

### Must-add (Critical)

| Package | Purpose | Bundle |
|---------|---------|--------|
| `@fontsource-variable/inter` | Display + body font | ~30KB gzip |
| `@fontsource-variable/jetbrains-mono` | Monospace data font | ~15KB gzip |

### Should-add (High value)

| Package | Purpose | Bundle |
|---------|---------|--------|
| `@radix-ui/react-dialog` | Accessible modal/panel with AnimatePresence support | ~5KB |
| `@radix-ui/react-select` | Styled dropdown replacing native select | ~8KB |
| `@radix-ui/react-tooltip` | Accessible tooltips (currently missing) | ~3KB |
| `@radix-ui/react-popover` | Color picker, overlays | ~5KB |

### Nice-to-have (Add later)

| Package | Purpose | Bundle |
|---------|---------|--------|
| `motion` (Framer Motion 11) | Route transitions, layout animations, staggered lists | ~33KB |
| `class-variance-authority` | Type-safe component variants | ~1KB |
| `tailwind-merge` | Class conflict resolution | ~3.5KB |
| `@radix-ui/react-dropdown-menu` | Context menus | ~5KB |
| `@radix-ui/react-tabs` | Settings page tabs | ~3KB |

### Keep unchanged

| Package | Reason |
|---------|--------|
| Tailwind CSS v4 | Perfect for the design, already configured |
| Recharts v3 | Fully themeable, already integrated |
| Lucide React | Clean geometric style matches design |
| react-hook-form | Best-in-class form management |
| date-fns v4 | Tree-shakeable, already latest |
| @dnd-kit | Modern, accessible drag & drop |
| zustand | Minimal state management |
| @tanstack/react-query | Server state management |
| react-router-dom v7 | Routing |
| zod | Contract testing |

### Remove

**Nothing.** All current dependencies are actively used and aligned with the design direction.

### Skip (evaluated and rejected)

| Package | Reason to skip |
|---------|---------------|
| `tailwindcss-animate` | Tailwind v4 native `@utility` + `@keyframes` covers all needs |
| `@tailwindcss/forms` | Custom inputs override everything the plugin provides |
| Nivo / Tremor / Chart.js | Recharts already works, switching has zero ROI |
| Phosphor / Heroicons / Tabler | Lucide is sufficient and matches the aesthetic |
| dayjs | date-fns tree-shakes to similar size, migration cost not worth it |
| Headless UI | Radix is more composable and has more primitives |

---

## Migration Priority Order

1. **Fonts** — Add `@fontsource-variable` packages (blocks all visual work)
2. **Design tokens** — Add `@theme` block to `index.css` with full color palette
3. **Glass utilities** — Define `@utility glass-card`, `@utility glass-panel` in CSS
4. **Component reskin** — Update Card, Button, Input, Select to use new tokens
5. **Radix primitives** — Replace Modal/FloatingPanel with Radix Dialog (better animations, portals)
6. **Chart theming** — Apply dark glass theme to all Recharts components
7. **Animation** — Add Framer Motion if route transitions feel needed

## Sources

- [Tailwind CSS v4 Documentation](https://tailwindcss.com/docs) — accessed 2026-05-21
- [Radix UI Primitives](https://www.radix-ui.com/primitives) — accessed 2026-05-21
- [Fontsource Documentation](https://fontsource.org/) — accessed 2026-05-21
- [Recharts API](https://recharts.org/en-US/api) — accessed 2026-05-21
- [Framer Motion (motion)](https://motion.dev/) — accessed 2026-05-21
- [dnd-kit Documentation](https://dndkit.com/) — accessed 2026-05-21
- [Lucide Icons](https://lucide.dev/) — accessed 2026-05-21
- [Class Variance Authority](https://cva.style/docs) — accessed 2026-05-21
