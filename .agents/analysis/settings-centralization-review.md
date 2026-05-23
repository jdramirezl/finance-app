# Settings Centralization Review

## Executive Summary

The app currently has **6 persisted settings** in the database and **5+ implicit settings** scattered across localStorage and hardcoded constants. This review proposes consolidating everything into a unified settings model with clear categories, distinguishing between what belongs in the DB (user preferences that sync across devices) vs. what stays local (ephemeral UI state).

---

## Current State

### Database Settings (Supabase `settings` table)

| Column | Type | Purpose |
|--------|------|---------|
| `primary_currency` | text (enum) | Primary currency for totals |
| `alpha_vantage_api_key` | text | Stock price API key |
| `snapshot_frequency` | varchar (enum) | Net worth snapshot automation |
| `account_card_display` | jsonb | Per-account-type display mode (compact/detailed) |

### localStorage Settings (device-local, no sync)

| Key | Location | Purpose |
|-----|----------|---------|
| `finance-app-theme` | `useThemeStore` | Light/dark mode |
| `finance-app-last-used-pocket` | `useLastUsedPocket` | Last-used account/pocket per type (expense/income) |
| `movementSortField` | `useMovementsSort` | Sort field preference |
| `movementSortOrder` | `useMovementsSort` | Sort order preference |
| `finance_app_budget_planning` | `useBudgetPersistence` | Budget planning state (amounts, distributions, scenarios) |
| `investment_price_cache` | `investmentService` | Cached stock prices (not a setting, just cache) |

### Hardcoded Values That Could Be Settings

| Value | Location | Current Default |
|-------|----------|-----------------|
| Movements page size | `useMovementsQuery.ts` | 50 |
| Default currency for new accounts | `AccountForm.tsx` | `'USD'` (from `DEFAULT_CURRENCY`) |
| Date format | Scattered (28+ files) | `'MMM d, yyyy'` via date-fns |
| Number locale | `formatCurrency.ts` | `'en-US'` hardcoded |
| Reminder "this-week" window | `reminderProjections.ts` | 7 days |
| Spending card default period | `SpendingCard.tsx` | `'week'` |
| API request timeout | `apiClient.ts` | 30 seconds |
| Reminder projection months ahead | `reminderProjections.ts` | 2 months |

---

## Question 1: Default Account/Pocket Setting

### Current Behavior

The `useLastUsedPocket` store works as follows:
1. On movement creation, stores `{accountId, pocketId}` per type (expense/income) in localStorage
2. On quick-add, calls `resolveLastUsedPocket(type, accounts, pockets)`:
   - If stored ref exists AND both account/pocket still exist → use it
   - Otherwise → fallback to first account's first pocket

### Recommendation: Yes, Add a "Default Account" Setting

**Rationale**: The current fallback (first account's first pocket) is arbitrary. A user-configured default is better because:
- New devices have no last-used memory
- After clearing browser data, the fallback is random
- Users often have a "primary checking" account that should always be the default

### Proposed Behavior

```
Resolution order:
1. Last-used pocket (localStorage) — if valid
2. User-configured default (DB setting) — if set
3. First account's first pocket — final fallback
```

### Implementation Shape

Add to settings:
```typescript
interface DefaultAccountSettings {
  expense: { accountId: string; pocketId: string } | null;
  income: { accountId: string; pocketId: string } | null;
}
```

This is a **DB setting** (not localStorage) because:
- It's an explicit user preference, not ephemeral state
- It should sync across devices
- It rarely changes (unlike last-used which changes every transaction)

---

## Question 2: What Else Should Be Centralized?

### Category A: Move from localStorage to DB (sync-worthy preferences)

| Setting | Current Location | Why Move |
|---------|-----------------|----------|
| Theme (light/dark) | localStorage | Should sync across devices |
| Movement sort preference | localStorage | User expects same view everywhere |

### Category B: New settings (currently hardcoded)

| Setting | Current Value | Why Add |
|---------|--------------|---------|
| Default currency for new accounts | `'USD'` | Should match primary currency or be configurable |
| Movements per page | 50 | Power users want more/less |
| Date display format | `'MMM d, yyyy'` | Regional preference (DD/MM vs MM/DD) |
| Number format locale | `'en-US'` | Should follow user's locale |
| Spending card default period | `'week'` | Some users prefer monthly view |
| Reminder advance warning days | 7 | Some want 3 days, some want 14 |

### Category C: Keep in localStorage (ephemeral UI state)

| Setting | Reason to Keep Local |
|---------|---------------------|
| Budget planning data | Work-in-progress, device-specific |
| Investment price cache | Cache, not preference |
| Last-used pocket | Ephemeral convenience, not a preference |

---

## Proposed Complete Settings Structure

### Database Schema Addition

```sql
-- New columns on settings table (as JSONB for flexibility)
ALTER TABLE settings ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}';
```

### Domain Model

```typescript
interface Settings {
  // === Existing ===
  id: string;
  userId: string;
  primaryCurrency: Currency;
  alphaVantageApiKey?: string;
  accountCardDisplay?: AccountCardDisplaySettings;
  snapshotFrequency?: SnapshotFrequency;

  // === New: General Preferences ===
  theme: 'light' | 'dark' | 'system';
  locale: string;                    // BCP 47 tag, e.g. 'en-US', 'es-MX'
  dateFormat: DateFormatPreference;   // see below
  
  // === New: Default Selections ===
  defaultAccounts: DefaultAccountSettings;
  defaultCurrencyForNewAccounts: Currency; // defaults to primaryCurrency

  // === New: Display Preferences ===
  movementsPerPage: number;          // 25 | 50 | 100
  movementsSortField: SortField;     // 'displayedDate' | 'createdAt' | 'amount' | 'type'
  movementsSortOrder: SortOrder;     // 'asc' | 'desc'
  summaryDefaultPeriod: Period;      // 'today' | 'week' | 'month'
  
  // === New: Notifications & Reminders ===
  reminderAdvanceDays: number;       // days before due to show "this-week" status
}
```

### Type Definitions

```typescript
type DateFormatPreference = 'system' | 'iso' | 'us' | 'eu';
// system: browser locale decides
// iso: 2026-05-21
// us: May 21, 2026 (MMM d, yyyy)
// eu: 21 May 2026 (d MMM yyyy)

interface DefaultAccountSettings {
  expense: { accountId: string; pocketId: string } | null;
  income: { accountId: string; pocketId: string } | null;
}

type Period = 'today' | 'week' | 'month';
type SortField = 'displayedDate' | 'createdAt' | 'amount' | 'type';
type SortOrder = 'asc' | 'desc';
```

---

## Settings Page UI Structure (Proposed)

```
Settings
├── General Preferences
│   ├── Primary Currency (existing)
│   ├── Theme (light / dark / system) — moved from toggle
│   ├── Date Format (system / ISO / US / EU)
│   └── Number Locale (system / en-US / es-MX / etc.)
│
├── Default Selections
│   ├── Default Account for Expenses (account + pocket picker)
│   ├── Default Account for Income (account + pocket picker)
│   └── Default Currency for New Accounts
│
├── Display
│   ├── Account Card Display (existing, per-type)
│   ├── Movements Per Page (25 / 50 / 100)
│   ├── Default Sort (field + order)
│   └── Summary Spending Period (today / week / month)
│
├── Automation
│   ├── Net Worth Snapshot Frequency (existing)
│   └── Reminder Advance Warning (3 / 7 / 14 days)
│
├── Integrations
│   └── Alpha Vantage API Key (existing)
│
├── Data Management
│   ├── Export Backup (existing)
│   └── Import (future)
│
└── Debug Tools (existing)
    ├── Stock Price Checker
    └── Exchange Rate Checker
```

---

## Migration Strategy

### Phase 1: Schema Extension
- Add a `preferences` JSONB column to the `settings` table
- Backend reads from it with defaults for missing keys
- No breaking changes — all new fields are optional with sensible defaults

### Phase 2: Move localStorage Settings to DB
- Theme: On first load after migration, read from localStorage, write to DB, then delete localStorage key
- Sort preferences: Same one-time migration pattern
- Keep localStorage as a write-through cache for offline/instant access

### Phase 3: New Settings UI
- Restructure the Settings page with the proposed sections
- Add account/pocket pickers for default selections
- Add the new preference controls

### Phase 4: Wire Up Consumers
- `resolveLastUsedPocket` reads from settings as fallback
- `AccountForm` uses `defaultCurrencyForNewAccounts` instead of hardcoded `DEFAULT_CURRENCY`
- Date formatting utilities read from settings
- `useMovementsSort` initializes from settings instead of localStorage
- `SpendingCard` reads default period from settings
- `getReminderStatus` uses configurable advance days

---

## What NOT to Make a Setting

These should remain hardcoded:
- API timeout (30s) — operational, not user-facing
- Cache TTL / staleTime values — performance tuning, not preference
- Budget planning state — work-in-progress, not a preference
- Investment price cache — ephemeral data
- Toast max count (3) — UX constraint
- Debounce delays — implementation detail

---

## Priority Ranking

| Setting | Impact | Effort | Priority |
|---------|--------|--------|----------|
| Default account for expenses/income | High (daily use) | Medium | P1 |
| Theme sync to DB | Medium (multi-device) | Low | P1 |
| Default currency for new accounts | Medium (reduces clicks) | Low | P1 |
| Date format preference | Medium (regional) | Medium | P2 |
| Movements per page | Low-Medium | Low | P2 |
| Sort preference sync | Low (convenience) | Low | P2 |
| Spending card default period | Low | Low | P3 |
| Reminder advance days | Low | Low | P3 |
| Number locale | Low | Medium | P3 |

---

## Summary of Findings

1. **Yes, add a "Default Account" setting** — the current fallback (first account) is arbitrary and doesn't survive device changes. Store in DB, use as fallback between last-used and first-account.

2. **6 new settings are high-value additions**: default accounts (expense/income), theme sync, default currency for new accounts, date format, and movements per page.

3. **Theme and sort preferences should migrate from localStorage to DB** with a one-time migration on first load.

4. **Budget planning data should stay in localStorage** — it's ephemeral work-in-progress state, not a user preference.

5. **Use a JSONB `preferences` column** for new settings to avoid repeated schema migrations for each new preference.
