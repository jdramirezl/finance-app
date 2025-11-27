# Quality of Life Improvements

## � Higth Priority Issues (From Production Use)

### Currency Exchange Rate API Integration
- [ ] **Real-time currency exchange rates** - Implementation plan:
  - Use FreeCurrencyAPI: `https://api.freecurrencyapi.com/v1/latest?apikey=fca_live_0SYarl3kVk4ivey17UlqQfpMQnC6zg91FND7uVtc`
  - Rate limits: 5,000 requests/month, 10 req/min
  - Strategy to stay under limits:
    - Store exchange rates in Supabase `exchange_rates` table with timestamp
    - Update rates once per day (30 requests/month per currency pair)
    - Serverless function checks DB timestamp, only calls API if > 24 hours old
    - Client reads from DB (no direct API calls)
    - Client caches rates locally for session
    - Fallback to DB if cache lost
  - Benefits: Real exchange rates, minimal API usage (~150 requests/month for 5 currencies)

### Investment Price Storage & Caching
- [ ] **Store VOO/stock prices in database** - Current issue: prices only cached locally
  - Implementation:
    - Create `stock_prices` table in Supabase (symbol, price, timestamp)
    - Serverless function updates DB when timestamp > 15 minutes old
    - Client reads from DB first, falls back to API if stale
    - Local cache for performance (15 min TTL)
    - Benefits: Shared prices across devices, reduced API calls, persistent cache

### Batch Movements Improvements
- [ ] **Add "Mark as Pending" option to batch add** - Currently all batch movements are applied immediately
  - Add checkbox in BatchMovementForm: "Create as pending movements"
  - Pass `isPending` flag to all movements in batch
  - Allows bulk creation of future transactions without affecting balances

### Movement Templates
- [ ] **Payment templates for recurring transactions** - Save common transactions as templates
  - Implementation:
    - Create `movement_templates` table (name, type, account, pocket, amount, notes)
    - "Save as Template" button on movement form
    - Template picker dropdown in movement creation
    - Pre-fills all fields except amount (user can override)
    - Quick access to frequent transactions (groceries, gas, rent, etc.)
  - Benefits: Faster data entry, consistency, less typing

### Movement Sorting Options
- [ ] **Flexible movement sorting within months** - Currently only sorted by createdAt ascending
  - Add sorting dropdown with options:
    - Created Date (Ascending/Descending) - current default
    - Displayed Date (Ascending/Descending)
    - Amount (Ascending/Descending)
    - Type (Income first / Expense first)
  - Keep monthly grouping, apply sort within each month
  - Persist sort preference in localStorage

### Account Saving Error
- [ ] **"Error saving accounts" bug** - Investigate and fix
  - Reproduce: [Need more details on when this occurs]
  - Check: Supabase permissions, validation errors, network issues
  - Add better error messages to identify root cause

### Bulk Movement Actions
- [ ] **Mass operations on movements** - Select multiple movements and perform actions
  - Implementation:
    - Checkbox selection for movements (select all, select by filter)
    - Bulk action toolbar appears when items selected:
      - Apply Pending (convert multiple pending → applied)
      - Delete Selected (with confirmation)
      - Edit Attribute (change account/pocket/date for all selected)
      - Mark as Pending (convert applied → pending)
    - Preserve individual movement attributes during bulk edit
    - Use case: Move 5 pending transactions to different pocket without applying them
  - Benefits: Efficient management of multiple transactions, fix mistakes quickly

---

## 🐛 Critical Bugs & Features To Fix

### Balance Calculation Issues
- [x] **1. Account balances reset to 0 on page refresh (F5)** ✅ FIXED
  - Root cause: Account.balance in storage was stale
  - Fix: loadAccounts() now always recalculates balances from pockets (source of truth)
  - Commit: Recalculate account balances on load from pockets

- [x] **2. Account total balances inconsistent loading** ✅ FIXED
  - Root cause: Same as #1 - stale balance values in storage
  - Fix: Same as #1 - always recalculate from pockets
  - Commit: Recalculate account balances on load from pockets

- [x] **3. Fixed pocket not calculating total from sub-pockets** ✅ FIXED
  - Root cause: Fixed pocket.balance in storage was stale
  - Fix: loadPockets() now recalculates fixed pocket balances from sub-pockets (source of truth)
  - Commit: Recalculate fixed pocket balances on load from sub-pockets

- [x] **7. Investment account total excludes gains** ✅ FIXED
  - Root cause: Same as #1 - account balance wasn't recalculated from pocket with market value
  - Fix: Same as #1 - always recalculate account balance from pockets
  - Commit: Recalculate account balances on load from pockets

### UX Improvements
- [x] **4. Investment stock price - show last updated timestamp** ✅ FIXED
  - Added "Last updated: X ago" timestamp below current share price
  - Uses date-fns formatDistanceToNow for human-readable format (e.g., "2 hours ago")
  - Timestamp comes from investment price cache
  - Displayed in smaller, italic, gray text for subtle presentation
  - Users can now see if price data is fresh or stale
  - Commit: Add last updated timestamp for investment stock prices

- [x] **5. Bulk/batch movements** ✅ FIXED
  - Feature: Allow adding multiple movements at once
  - Implementation:
    - Added "Batch Add" button on MovementsPage
    - Opens modal with BatchMovementForm component
    - Each row has: Type, Account, Pocket, Amount, Notes, Date
    - "Add Row" button to add more movements
    - "Save All" button creates all movements at once
    - Validates all rows before saving
  - Benefits:
    - Much faster for entering multiple transactions (e.g., monthly bills)
    - Single transaction to database
    - Better UX for bulk data entry
  - Commit: Implement batch/bulk movements feature

- [x] **8. Visual indicator for disabled fixed expenses on Summary page** ✅ FIXED
  - Added visual indicators for disabled sub-pockets:
    - Reduced opacity (50%) for entire row
    - Strikethrough on expense name
    - "Disabled" badge next to name
  - Applied to both SummaryPage and FixedExpensesPage for consistency
  - Users can now see at a glance which fixed expenses are excluded from budget calculations
  - Commit: Add visual indicators for disabled fixed expenses

### API & External Services
- [x] **13. Switch from Alpha Vantage to Yahoo Finance API** ✅ FIXED
  - Problem: Alpha Vantage has strict rate limits (25 calls/day on free tier)
  - Solution: Created Vercel serverless function using yahoo-finance2 library
  - Implementation:
    - `/api/stock-price.ts` - Serverless function that fetches from Yahoo Finance (no CORS!)
    - Updated `investmentService.ts` to call our API instead of external APIs
    - Kept Supabase global rate limiting (15 min between calls across all devices)
    - Kept local caching (15 min) for performance
  - Benefits:
    - No CORS issues (server-side API calls)
    - More reliable than Alpha Vantage
    - Works on Vercel free tier (100GB bandwidth, 100 hours execution/month)
    - Better error handling and response formatting
  - Commit: Implement Yahoo Finance via Vercel serverless function

### Investment Movement Issues
- [x] **9-12. Investment movement refactor** ✅ FIXED
  - Removed special "InvestmentIngreso" and "InvestmentShares" movement types
  - Investment accounts now use standard "IngresoNormal" / "EgresoNormal" types
  - Pocket selection determines what gets updated:
    - "Invested Money" pocket → updates montoInvertido
    - "Shares" pocket → updates shares
  - Benefits:
    - Simpler, more consistent UX (same movement types for all accounts)
    - No special cases in movement type logic
    - Fixes all 4 issues (#9, #10, #11, #12) at once
    - Less code to maintain
  - Implementation:
    - Removed investment types from MovementType union
    - Updated movementService to sync investment account fields from pocket balances
    - Removed conditional movement type rendering in MovementsPage
    - Created migration utility in src/utils/migrateInvestmentMovements.ts
  - Migration: Run `window.migrateInvestmentMovements()` in console to convert existing movements
  - Commit: Refactor investment movements to use standard types

### Performance Issues
- [x] **6. Duplicate page reloads on CRUD operations** ✅ FIXED
  - Root cause: Pages were calling loadAccounts(), loadPockets(), and loadSubPockets() separately
  - Problem: loadAccounts() internally loads pockets and subPockets for balance calculation, causing 2-3x duplicate loads
  - Fix: Refactored loadAccounts() to load all three (accounts, pockets, subPockets) and update state in single set() call
  - Pages now only call loadAccounts() once instead of three separate load functions
  - Result: 66% reduction in load operations (3 loads → 1 load), much faster page loads
  - Commit: Consolidate data loading to eliminate duplicate reloads

---

## ✅ Completed

### 1. Loading Skeletons
- Added skeleton components for better perceived performance
- Implemented in all major pages (Summary, Accounts, Movements, Budget Planning, Fixed Expenses)
- Content-aware skeletons that match the actual layout
- ✅ All pages now have proper loading states

### 2. Enhanced Toast Notifications (IMPROVED!)
- **Smooth animations**: Enter/exit with cubic-bezier easing and scale effects
- **Better stacking**: Flexbox layout with proper gap spacing
- **Non-intrusive**: Top-right positioning with pointer-events management
- **Exit animations**: Toasts slide out smoothly instead of disappearing abruptly
- **Manual close**: X button with hover states
- **Auto-dismiss**: Configurable duration (default 5s)
- **Replaced all alerts**: Converted `alert()` calls in BudgetPlanningPage to toasts
- **No page reloads**: Fixed any issues causing page reloads on interaction

### 3. Empty States
- Created EmptyState component with helpful guidance
- Implemented across all pages
- Provides clear next steps for users

### 4. Auto-focus Inputs
- Added autoFocus prop support to Input component
- Implemented in all modal forms
- Better keyboard navigation UX

### 5. Performance Optimizations
- Single-record database operations (5-10x faster)
- Selective reloading (50-90% fewer queries)
- Fixed account balance calculation bug
- Optimized movement queries with composite indexes

### 6. SPA Routing Fix
- Added vercel.json configuration
- Fixed 404 errors on direct URL access
- Proper client-side routing support

### 7. Optimistic UI Updates ✨ NEW!
- **Immediate feedback**: Forms close instantly, UI updates before server confirms
- **Store-level optimistic updates**: All mutations update state immediately
- **Error recovery**: Automatic rollback on failure with error toasts
- **Implemented in**: MovementsPage, AccountsPage, FixedExpensesPage (all CRUD operations)
- **User experience**: App feels 10x faster and more responsive
- **Fixed**: FixedExpensesPage no longer reloads entire page on every operation
- **Batched updates**: Fixed double-reload issue by batching pocket + account updates into single state change

### 8. Loading Button States ✨ NEW!
- **Button-level loading**: Individual buttons show spinner during operations
- **Disabled states**: Prevent multiple clicks during async operations
- **Visual feedback**: Users know exactly which action is processing
- **Implemented in**: All form submit buttons, delete buttons, apply buttons, toggle buttons
- **Uses existing Button component**: Already had loading prop support
- **Per-item tracking**: Each button tracks its own loading state independently

---

## 🎯 Quick Wins (10-30 min each)

### UI/UX Improvements
- [ ] **Enter to submit forms** - Submit on Enter key press
- [ ] **ESC to close modals** - Keyboard shortcut for closing dialogs
- [ ] **Relative dates** - "2 hours ago" instead of full timestamps
- [ ] **Currency symbol shortcuts** - Quick buttons for common amounts ($10, $50, $100)
- [ ] **Copy to clipboard** - Copy account/pocket balances with one click
- [ ] **Hover tooltips** - Explain icons and buttons on hover
- [ ] **Focus visible states** - Better keyboard navigation indicators
- [x] **Loading button states** - Show spinner on buttons during async operations ✅
- [x] **Optimistic UI updates** - Show changes immediately before server confirms ✅

### Performance
- [ ] **Memoize expensive calculations** - useMemo for totalFijosMes, filteredMovements
- [ ] **Debounce search inputs** - Reduce re-renders on filter changes
- [ ] **Virtual scrolling** - For long movement lists (100+ items)
- [ ] **Lazy load modals** - Only render when opened
- [ ] **Image optimization** - Compress and lazy load any images

### Code Quality
- [ ] **Extract magic numbers** - Move hardcoded values to constants
- [ ] **Consistent error handling** - Standardize try/catch patterns
- [ ] **Remove console.logs** - Replace with proper logging service
- [ ] **Type safety improvements** - Remove any remaining `any` types
- [ ] **Extract repeated logic** - DRY up form validation, formatting

---

## 💡 Medium Features (30-90 min each)

### UI/UX
- [ ] **Recent movements widget** - Show last 5 on summary page with quick actions
- [ ] **Search/filter movements** - Full-text search with advanced filters
- [ ] **Bulk selection** - Select multiple movements to delete/edit
- [ ] **Inline editing** - Edit movement amounts without opening modal
- [ ] **Confirmation dialogs** - "Are you sure?" for all destructive actions
- [ ] **Undo deletions** - 5-second grace period with toast action
- [ ] **Movement templates** - Save common transactions as templates
- [ ] **Quick transfer** - Fast pocket-to-pocket transfers
- [ ] **Amount calculator** - Built-in calculator in amount inputs
- [ ] **Color picker presets** - Common colors for accounts
- [x] **Fixed expenses to movements** ✅ FIXED - Button to auto-populate batch movements modal with enabled monthly fixed expenses contributions (user can modify before saving)
- [ ] **Consistent spacing** - Standardize padding/margins across all components

### Performance
- [ ] **Pagination for movements** - Load 50 at a time instead of all
- [ ] **Background data sync** - Refresh data without blocking UI (currently loads block UI on page mount)
- [ ] **Request deduplication** - Prevent duplicate API calls
- [ ] **Optimistic locking** - Handle concurrent edits gracefully
- [ ] **Cache invalidation strategy** - Smart cache management

### Code Quality
- [ ] **Custom hooks extraction** - useMovementFilters, useAccountBalance
- [ ] **Component composition** - Break down large page components
- [ ] **Error boundaries** - Catch and display component errors gracefully
- [ ] **Prop validation** - Add runtime prop type checking
- [ ] **Accessibility audit** - ARIA labels, keyboard nav, screen readers

### Data & Logic
- [ ] **Export data** - CSV/JSON backup with date range selection
- [ ] **Import data** - CSV import with validation and preview
- [ ] **Data validation** - Prevent negative balances, invalid dates
- [ ] **Audit log** - Track all changes with timestamps and user
- [ ] **Multi-currency conversion display** - Show all amounts in primary currency
- [x] **Cascade delete for accounts** ✅ FIXED - "Delete All" button to delete account with all pockets and optionally orphan/delete related movements
- [x] **Orphaned movements handling** ✅ FIXED - Implemented comprehensive orphaned movements system:
  - Movements marked as "orphaned" when account/pocket deleted (safe, non-destructive)
  - Orphaned movements stored with original account/pocket names and currency for restoration
  - Dedicated "Orphaned Movements" section on MovementsPage with count badge
  - "Restore All" button automatically recreates account + pockets and links movements
  - "Delete All" button for permanent cleanup
  - Instant orphan detection using isOrphaned flag (no expensive lookups)
  - Detailed logging and error handling for restoration process
  - Movements properly linked to recreated entities with balance recalculation

---

## 🚀 Larger Features (2+ hours)

### Major UI/UX
- [ ] **Charts and visualizations** - Balance trends, spending by category
- [ ] **Budget vs actual tracking** - Compare planned vs spent with alerts
- [ ] **Dashboard customization** - Drag-and-drop widgets, custom layouts
- [ ] **Mobile-optimized views** - Improvements needed:
  - Collapsible/drawer sidebar (currently always visible)
  - Touch-friendly button sizes (44x44px minimum)
  - Swipe gestures for navigation
  - Bottom navigation bar for main actions
  - Responsive table layouts (cards on mobile)
  - Larger tap targets for form inputs
- [ ] **Dark mode improvements** - Better contrast ratios, smooth theme transitions, respect system preference
- [ ] **Keyboard shortcuts panel** - Help overlay showing all shortcuts
- [ ] **Onboarding flow** - Guided tour for new users
- [ ] **Settings page expansion** - More customization options:
  - Date format preferences
  - Number format (1,000.00 vs 1.000,00)
  - Default movement type
  - Auto-save preferences
  - Notification settings

### Advanced Features
- [ ] **Recurring movements** - Automation for fixed expenses and income
- [ ] **Budget alerts** - Notifications when approaching limits
- [ ] **Multi-user support** - Shared accounts with permissions
- [ ] **Tags and categories** - Organize movements with custom tags
- [ ] **Advanced reporting** - Monthly summaries, year-over-year comparisons
- [ ] **Investment tracking** - Real-time stock prices, portfolio performance (partially done)
- [ ] **Bill reminders & upcoming payments widget** - Implementation plan:
  - Add optional `dueDate` field to SubPocket (fixed expenses)
  - Add optional `recurringDay` field (1-31 for monthly bills)
  - Calculate next due date based on last payment + periodicity
  - Show "Upcoming Bills" widget on Summary page with:
    - Next 5 bills to pay (sorted by due date)
    - Days until due (color-coded: red <3 days, yellow <7 days, green >7 days)
    - Quick "Mark as Paid" button (creates movement + updates last payment date)
  - Browser notifications for bills due within 3 days (requires permission)
- [ ] **Savings goals** - Track progress toward financial goals
- [ ] **Migrate fixed expenses pocket to different account** - Implementation:
  - Button on FixedExpensesPage to change account
  - Select new account from dropdown
  - Auto-convert all sub-pocket amounts to new account currency
  - Update all related movements to new account/pocket
  - Preserve balance history and calculations

### Performance & Architecture
- [ ] **Offline support** - Service worker + IndexedDB sync
- [ ] **Real-time updates** - WebSocket for multi-device sync
- [ ] **Database migrations** - Version control for schema changes
- [ ] **Background jobs** - Scheduled tasks for data cleanup, reports
- [ ] **Performance monitoring** - Track load times, errors, user flows
- [ ] **Code splitting** - Lazy load routes and heavy components
- [ ] **PWA features** - Install prompt, push notifications

### Code Quality & Testing
- [ ] **E2E tests** - Playwright/Cypress for critical user flows
- [ ] **Visual regression tests** - Catch UI changes automatically
- [ ] **Performance tests** - Benchmark critical operations
- [ ] **Accessibility tests** - Automated a11y checks in CI
- [ ] **Documentation** - Component storybook, API docs
- [ ] **Refactor store** - Split into domain-specific stores
- [ ] **Error tracking** - Sentry or similar for production errors

---

## 🔍 Identified Issues to Fix

### Performance Bottlenecks
1. **MovementsPage filtering** - Runs on every render, should be memoized
2. **SummaryPage calculations** - Multiple reduce operations, needs optimization
3. **Unnecessary re-renders** - Missing React.memo on list items
4. **Large bundle size** - 595KB, needs code splitting
5. ~~**Multiple set() calls causing re-renders**~~ - ✅ FIXED: Batched SubPocket updates

### Logic Issues
1. **Investment data loading** - Runs on every accounts change, should debounce
2. **Form state management** - Too many useState, consider useReducer
3. **Error handling inconsistency** - Some use toast, some use local state
4. **Balance calculations** - Computed multiple times, should cache

### UI/UX Issues
1. **No loading states on buttons** - Users don't know if action is processing
2. **Modal backdrop click** - Should close modal (currently does)
3. **Long lists without pagination** - Performance degrades with 100+ movements
4. **No empty states in some places** - Blank screens are confusing
5. **Inconsistent spacing** - Some components use different padding/margins

### Code Quality Issues
1. **Duplicate code** - Form handling logic repeated across pages
2. **Magic numbers** - Hardcoded values like `5000` for toast duration
3. **Missing TypeScript types** - Some `any` types still present
4. **Console.logs in production** - Should use proper logging
5. **No error boundaries** - App crashes on component errors

---

## 🎯 Recommended Next Features

Based on current state and user value, here are the top priorities:

### 1. **Search/Filter Movements** (30-60 min) 🔥
- **Why**: With orphaned movements feature, users may have many movements to manage
- **What**: Full-text search + filters (date range, account, pocket, type, amount range)
- **Impact**: HIGH - Makes finding specific transactions much easier
- **Effort**: MEDIUM - Needs filter UI + memoized filtering logic

### 2. **Recurring Movements Automation** (2-3 hours) 🔥
- **Why**: Fixed expenses are tracked but not automated - users still manually create movements
- **What**: 
  - Add "Auto-create movement" toggle to SubPockets
  - Background job checks for due payments (based on periodicity)
  - Auto-creates movements on due date or shows "Create Now" button
  - Integrates with upcoming bills widget
- **Impact**: VERY HIGH - Eliminates repetitive data entry
- **Effort**: HIGH - Needs scheduling logic + UI updates

### 3. **Movement Templates** (30-45 min) 🔥
- **Why**: Users repeat common transactions (groceries, gas, etc.)
- **What**: 
  - "Save as Template" button on movement form
  - Template picker in movement creation
  - Pre-fills account, pocket, type, notes (user just enters amount)
- **Impact**: HIGH - Speeds up common data entry
- **Effort**: MEDIUM - Needs template storage + UI

### 4. **Charts & Visualizations** (3-4 hours) 💎
- **Why**: Users can't see spending trends or patterns
- **What**:
  - Balance over time line chart (last 30/90/365 days)
  - Spending by pocket pie chart
  - Income vs expenses bar chart
  - Monthly comparison chart
- **Impact**: VERY HIGH - Provides insights into financial health
- **Effort**: HIGH - Needs charting library (recharts) + data aggregation

### 5. **Export/Import Data** (1-2 hours) 💎
- **Why**: Users need backups and data portability
- **What**:
  - Export all data to JSON/CSV with date range filter
  - Import with validation and preview
  - Duplicate detection
- **Impact**: HIGH - Data safety and migration
- **Effort**: MEDIUM-HIGH - Needs file handling + validation

### 6. **Budget vs Actual Tracking** (2-3 hours) 💎
- **Why**: Budget planning exists but no comparison to actual spending
- **What**:
  - Show planned vs actual for each pocket
  - Visual indicators (green = under budget, red = over)
  - Monthly summary with variance
  - Alerts when approaching limits
- **Impact**: VERY HIGH - Core budgeting feature
- **Effort**: HIGH - Needs comparison logic + UI updates

### 7. **Mobile Optimizations** (2-3 hours) 📱
- **Why**: App is usable on mobile but not optimized
- **What**:
  - Collapsible sidebar/drawer
  - Bottom navigation bar
  - Touch-friendly buttons (44x44px)
  - Responsive tables → cards
  - Swipe gestures
- **Impact**: HIGH - Better mobile experience
- **Effort**: HIGH - Needs responsive redesign

### 8. **Keyboard Shortcuts** (1-2 hours) ⌨️
- **Why**: Power users want faster navigation
- **What**:
  - Enter to submit forms
  - ESC to close modals
  - Ctrl+N for new movement
  - Ctrl+F for search
  - Arrow keys for navigation
  - Help panel (Ctrl+?) showing all shortcuts
- **Impact**: MEDIUM - Power user feature
- **Effort**: MEDIUM - Needs keyboard event handling

### Quick Wins to Knock Out First (10-30 min each):
1. ✅ Enter to submit forms
2. ✅ ESC to close modals  
3. ✅ Memoize expensive calculations (MovementsPage filters, SummaryPage totals)
4. ✅ Extract magic numbers to constants
5. ✅ Relative dates ("2 hours ago")
6. ✅ Hover tooltips on icons/buttons

---

## 📊 Priority Matrix

### High Impact + Low Effort (Do First!)
1. Memoize expensive calculations
2. Add loading states to buttons
3. ESC to close modals
4. Extract magic numbers to constants
5. Remove console.logs

### High Impact + High Effort (Plan & Execute)
1. Charts and visualizations
2. Recurring movements automation
3. Offline support
4. Advanced reporting

### Low Impact + Low Effort (Fill Time)
1. Hover tooltips
2. Copy to clipboard
3. Color picker presets
4. Relative dates

### Low Impact + High Effort (Avoid)
1. Over-engineered abstractions
2. Premature optimizations
3. Features nobody asked for
