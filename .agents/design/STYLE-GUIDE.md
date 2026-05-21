# Frontend Style Guide — "Luminous Ledger" Design System

> This document defines the visual rules for all frontend development. Every component, page, and UI element must follow these guidelines. Reference this before creating or modifying any frontend code.

---

## Core Philosophy

**Cyber-Minimalist Glassmorphism** — Professional terminal rigor meets futuristic premium aesthetic. Deep obsidian backgrounds with translucent glass layers create depth. High-precision typography and teal accents convey technological mastery and calm control.

**Key principles:**
1. Data density over whitespace — pack information tightly but organize through glass boundaries
2. Numbers are sacred — always monospace, always aligned, always precise
3. Glass creates hierarchy — depth through blur and opacity, not shadows
4. Teal means action — the primary accent is reserved for interactive elements and positive states
5. Desktop-first — optimize for wide screens, adapt for mobile

---

## Colors

### Base Palette (Tailwind CSS custom values)

```css
/* Surface layers (darkest to lightest) */
--surface-base: #0e1416;        /* Page background */
--surface-container-low: #171d1e; /* Sidebar, secondary areas */
--surface-container: #1b2122;    /* Card backgrounds */
--surface-container-high: #252b2d; /* Elevated cards, hover states */
--surface-container-highest: #303638; /* Inputs, active states */

/* Text */
--on-surface: #dee3e6;          /* Primary text */
--on-surface-variant: #bcc9cd;  /* Secondary text, labels */
--outline: #869397;             /* Borders, dividers */
--outline-variant: #3d494c;     /* Subtle borders */

/* Accent — Primary (Teal/Cyan) */
--primary: #4cd7f6;             /* Primary actions, active states, growth */
--primary-container: #06b6d4;   /* Button backgrounds */
--on-primary: #003640;          /* Text on primary buttons */

/* Accent — Secondary (Blue) */
--secondary: #adc6ff;           /* Informational, structural */
--secondary-container: #0566d9;

/* Accent — Tertiary (Amber/Orange) */
--tertiary: #ffb873;            /* Warnings, pending states */
--tertiary-container: #e89337;

/* Semantic */
--success: #34d399;             /* Income, positive trends (emerald green) */
--error: #ffb4ab;               /* Expenses, negative trends, errors */
--error-container: #93000a;
```

### Usage Rules

- **Income/positive**: Use `--success` (emerald green)
- **Expense/negative**: Use `--error` (soft red)
- **Pending/warning**: Use `--tertiary` (amber)
- **Interactive/active**: Use `--primary` (teal)
- **Glass borders**: `border: 1px solid rgba(255, 255, 255, 0.08)` on top/left, `0.04` on bottom/right
- **Never use pure black** (`#000000`) — always use the surface palette
- **Never use pure white** (`#ffffff`) for text — use `--on-surface`

---

## Typography

### Dual-Font Strategy

| Use case | Font | Weight | Size |
|----------|------|--------|------|
| Headings, UI labels | Inter | 600-700 | 20-36px |
| Body text, descriptions | Inter | 400 | 14-16px |
| **All numbers, amounts, dates** | JetBrains Mono | 500-600 | 12-18px |
| Uppercase labels/badges | Inter | 700 | 11px, letter-spacing 0.06em |

### Rules

- **ALL financial numbers** must use JetBrains Mono — no exceptions
- Currency symbols use JetBrains Mono alongside their numbers
- Percentages use JetBrains Mono
- Dates and timestamps use JetBrains Mono
- Headlines: tight letter-spacing (-0.02em to -0.01em)
- Labels/badges: uppercase, wide letter-spacing (0.06em)

### Tailwind Classes

```
font-display = Inter (headings)
font-body = Inter (body)
font-mono = JetBrains Mono (data)
```

---

## Layout

### Structure

```
┌─────────────────────────────────────────────────────┐
│ Fixed Sidebar (240px)  │  Fluid Main Content Area   │
│                        │  (12-column grid, 16px gap) │
│  Logo                  │                             │
│  Nav items             │  ┌─────────┐ ┌──────────┐  │
│  (icon + label)        │  │ Content │ │ Side     │  │
│                        │  │ Area    │ │ Panel    │  │
│                        │  │         │ │ (400px)  │  │
│                        │  │         │ │ forms/   │  │
│  User avatar           │  │         │ │ details  │  │
│  Theme toggle          │  └─────────┘ └──────────┘  │
└─────────────────────────────────────────────────────┘
```

### Spacing (4px base unit)

- Card padding: 20px
- Gutter between cards: 16px
- Desktop margin: 32px
- Mobile margin: 16px
- All spacing in multiples of 4: 4, 8, 12, 16, 20, 24, 32px

### Breakpoints

- Mobile: < 768px (single column, no sidebar, bottom nav)
- Tablet: 768px - 1280px (collapsed icon-only sidebar)
- Desktop: > 1280px (full sidebar + side panel)

### Side Panel Pattern

Instead of modals, use a **slide-in right panel** (400px) for:
- Creating/editing accounts, movements, pockets, reminders
- Settings sections (list on left, content in panel)
- Detail views

On mobile: panel becomes a full-screen bottom sheet.

---

## Elevation & Glass Effects

### Layers

| Level | Background | Effect | Use |
|-------|-----------|--------|-----|
| 0 (Base) | `#0e1416` | None | Page background |
| 1 (Cards) | `#1b2122` | `backdrop-filter: blur(12px)` + glass border | Cards, containers |
| 2 (Panels) | `#252b2d` | `backdrop-filter: blur(20px)` + teal glow (5-10% opacity) | Side panel, modals |

### Glass Card CSS

```css
.glass-card {
  background: rgba(27, 33, 34, 0.8);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  padding: 20px;
}
```

### Rules

- **No black drop shadows** — use high-spread, low-opacity tinted shadows if needed
- Glass borders: brighter on top/left (light source simulation)
- Hover states: slightly brighten the glass background (+5% opacity)

---

## Shapes & Borders

| Element | Border Radius |
|---------|--------------|
| Cards, containers | 12-16px |
| Buttons, inputs | 8px |
| Navigation indicators, badges | Full (pill) |
| Progress bars | Full (rounded caps) |

---

## Components

### Buttons

- **Primary**: Teal gradient (`#06b6d4` → `#22d3ee`), dark text, cyan glow on hover
- **Secondary/Ghost**: Transparent with outline, teal text
- **Destructive**: Soft red background (10% opacity), red text

### Cards

- Glass effect (blur + border)
- Thin bottom separator in headers (1px, 6% white)
- Collapsible sections with chevron

### Navigation

- Active item: vertical teal pill on left + 10% teal background tint
- Inactive: `--on-surface-variant` color
- Icons: 20px, consistent stroke width

### Inputs

- Darker than card background (`--surface-container-highest`)
- 1px border (`--outline-variant`), turns teal on focus
- JetBrains Mono for number inputs
- 8px border-radius

### Data Tables / Lists

- No vertical lines
- 1px horizontal dividers (6% white)
- JetBrains Mono for all cell data
- Hover: brighten row background

### Badges / Chips

- Pill-shaped
- Low-opacity background of semantic color (10%)
- High-opacity text of same color
- Examples: currency badge (teal), category badge (category color), status badge (green/red/amber)

### Progress Bars

- 4-6px height, fully rounded
- Background: dark grey-blue
- Fill: teal gradient (normal) or red gradient (danger)

---

## Animation & Transitions

- **Duration**: 150-200ms for micro-interactions, 300ms for panel slides
- **Easing**: `cubic-bezier(0.4, 0, 0.2, 1)` (Material standard)
- **Hover effects**: background opacity change, subtle scale (1.01x on cards)
- **Panel slide**: translateX from right, 300ms
- **No bouncy/spring animations** — keep it professional

---

## Do's and Don'ts

### Do
- Use JetBrains Mono for ALL numbers
- Use glass cards for grouping related content
- Use teal for primary actions and positive indicators
- Keep information dense but organized
- Use the side panel instead of modals
- Show loading skeletons (not spinners)

### Don't
- Use pure black or pure white
- Use drop shadows (use glass/blur instead)
- Use modals for forms (use side panel)
- Mix fonts for numbers (always monospace)
- Use more than 3 accent colors on one screen
- Add decorative elements that don't serve data
