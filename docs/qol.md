# Quality of Life Improvements

## 📋 PENDING

### 🎯 User-Requested Features & Fixes
> **Priority: HIGH** - These are user-driven needs and bug fixes, regardless of difficulty

#### Critical Bugs
- [ ] **Data validation** - Prevent negative balances, invalid dates
- [ ] **Concurrent edits handling** - Optimistic locking for simultaneous updates

#### High-Priority Features

- [ ] **Search/filter movements** - Full-text search with advanced filters
  - Date range, account, pocket, type, amount range
  - Memoized filtering logic
  - Impact: HIGH - Makes finding specific transactions much easier

- [ ] **Recurring movements automation** - Auto-create movements for fixed expenses
  - Add "Auto-create movement" toggle to SubPockets
  - Background job checks for due payments (based on periodicity)
  - Auto-creates movements on due date or shows "Create Now" button
  - Impact: VERY HIGH - Eliminates repetitive data entry

- [ ] **Charts and visualizations** - Balance trends, spending by category
  - Balance over time line chart (last 30/90/365 days)
  - Spending by pocket pie chart
  - Income vs expenses bar chart
  - Monthly comparison chart
  - Impact: VERY HIGH - Provides insights into financial health

- [ ] **Budget vs actual tracking** - Compare planned vs spent with alerts
  - Show planned vs actual for each pocket
  - Visual indicators (green = under budget, red = over)
  - Monthly summary with variance
  - Alerts when approaching limits
  - Impact: VERY HIGH - Core budgeting feature

- [ ] **Export/Import data** - CSV/JSON backup with date range selection
  - Export all data with date range filter
  - Import with validation and preview
  - Duplicate detection
  - Impact: HIGH - Data safety and migration

- [ ] **Bill reminders & upcoming payments widget** - Never miss a payment
  - Add optional `dueDate` and `recurringDay` fields to SubPocket
  - Calculate next due date based on last payment + periodicity
  - Show "Upcoming Bills" widget on Summary page
  - Days until due (color-coded: red <3 days, yellow <7 days, green >7 days)
  - Quick "Mark as Paid" button
  - Browser notifications for bills due within 3 days

- [ ] **Savings goals** - Track progress toward financial goals

- [ ] **Migrate fixed expenses pocket to different account** - Change account for fixed expenses
  - Button on FixedExpensesPage to change account
  - Auto-convert all sub-pocket amounts to new account currency
  - Update all related movements to new account/pocket

#### Medium-Priority Features
- [ ] **Recent movements widget** - Show last 5 on summary page with quick actions
- [ ] **Inline editing** - Edit movement amounts without opening modal
- [ ] **Undo deletions** - 5-second grace period with toast action
- [ ] **Quick transfer** - Fast pocket-to-pocket transfers
- [ ] **Amount calculator** - Built-in calculator in amount inputs
- [ ] **Tags and categories** - Organize movements with custom tags
- [ ] **Advanced reporting** - Monthly summaries, year-over-year comparisons
- [ ] **Multi-user support** - Shared accounts with permissions

---

### 🎨 UI/UX Improvements

- [ ] **Mobile optimizations** - Better mobile experience
  - Collapsible/drawer sidebar (currently always visible)
  - Touch-friendly button sizes (44x44px minimum)
  - Swipe gestures for navigation
  - Bottom navigation bar for main actions
  - Responsive table layouts (cards on mobile)
  - Larger tap targets for form inputs

- [ ] **Dark mode improvements** - Better contrast ratios, smooth theme transitions, respect system preference

- [ ] **Keyboard shortcuts panel** - Help overlay showing all shortcuts (Ctrl+?)

- [ ] **Settings page expansion** - More customization options
  - Date format preferences
  - Number format (1,000.00 vs 1.000,00)
  - Default movement type
  - Auto-save preferences
  - Notification settings

- [ ] **Onboarding flow** - Guided tour for new users

- [ ] **Dashboard customization** - Drag-and-drop widgets, custom layouts

- [ ] **Enter to submit forms** - Submit on Enter key press

- [ ] **ESC to close modals** - Keyboard shortcut for closing dialogs

- [ ] **Relative dates** - "2 hours ago" instead of full timestamps

- [ ] **Currency symbol shortcuts** - Quick buttons for common amounts ($10, $50, $100)

- [ ] **Copy to clipboard** - Copy account/pocket balances with one click

- [ ] **Hover tooltips** - Explain icons and buttons on hover

- [ ] **Focus visible states** - Better keyboard navigation indicators

- [ ] **Confirmation dialogs** - "Are you sure?" for all destructive actions

- [ ] **Color picker presets** - Common colors for accounts

- [ ] **Consistent spacing** - Standardize padding/margins across all components

---

### ⚡ Performance Improvements

- [ ] **Pagination for movements** - Load 50 at a time instead of all

- [ ] **Background data sync** - Refresh data without blocking UI (currently loads block UI on page mount)

- [ ] **Memoize expensive calculations** - useMemo for totalFijosMes, filteredMovements

- [ ] **Debounce search inputs** - Reduce re-renders on filter changes

- [ ] **Virtual scrolling** - For long movement lists (100+ items)

- [ ] **Lazy load modals** - Only render when opened

- [ ] **Image optimization** - Compress and lazy load any images

- [ ] **Request deduplication** - Prevent duplicate API calls

- [ ] **Cache invalidation strategy** - Smart cache management

- [ ] **Offline support** - Service worker + IndexedDB sync

- [ ] **Real-time updates** - WebSocket for multi-device sync

- [ ] **Code splitting** - Lazy load routes and heavy components

- [ ] **PWA features** - Install prompt, push notifications

---

### 🧹 Code Quality Improvements

- [ ] **Extract magic numbers** - Move hardcoded values to constants

- [ ] **Consistent error handling** - Standardize try/catch patterns

- [ ] **Remove console.logs** - Replace with proper logging service

- [ ] **Type safety improvements** - Remove any remaining `any` types

- [ ] **Extract repeated logic** - DRY up form validation, formatting

- [ ] **Custom hooks extraction** - useMovementFilters, useAccountBalance

- [ ] **Component composition** - Break down large page components

- [ ] **Error boundaries** - Catch and display component errors gracefully

- [ ] **Prop validation** - Add runtime prop type checking

- [ ] **Accessibility audit** - ARIA labels, keyboard nav, screen readers

- [ ] **E2E tests** - Playwright/Cypress for critical user flows

- [ ] **Visual regression tests** - Catch UI changes automatically

- [ ] **Performance tests** - Benchmark critical operations

- [ ] **Accessibility tests** - Automated a11y checks in CI

- [ ] **Documentation** - Component storybook, API docs

- [ ] **Refactor store** - Split into domain-specific stores

- [ ] **Error tracking** - Sentry or similar for production errors

- [ ] **Database migrations** - Version control for schema changes

- [ ] **Background jobs** - Scheduled tasks for data cleanup, reports

- [ ] **Performance monitoring** - Track load times, errors, user flows

---

## ✅ DONE

### 🎯 User-Requested Features & Fixes

- [x] **Fixed Expense Groups** ✅ - Group fixed expenses for batch enable/disable
  - **Use Case**: Bi-weekly salary payments with different expense sets
    - Payment 1: Gas, light, water, rent
    - Payment 2: All other expenses
  - **Implementation**:
    - Created `fixed_expense_groups` table with RLS policies
    - Added `group_id` column to `sub_pockets` table
    - Created fixedExpenseGroupService for CRUD operations
    - Built FixedExpenseGroupCard component with collapsible groups
    - Group management UI on FixedExpensesPage:
      - Create/Edit/Delete groups with color picker
      - Group toggle switches (enable/disable all expenses)
      - Dropdown selector to move expenses between groups
      - Individual expense toggles within groups
      - Color-coded group cards with statistics
    - Default group for ungrouped expenses (cannot be deleted)
    - Confirmation when deleting group (moves expenses to Default)
  - **Benefits**:
    - Quick toggle between payment scenarios
    - Better organization of fixed expenses
    - Visual clarity with color-coded categories
    - Faster budget planning workflow
  - **Commits**: 
    - feat: implement fixed expense groups
    - fix: map group_id field in SubPocket database operations
    - feat: add group selector to move expenses between groups

- [x] **Currency Exchange Rate API Integration** ✅ - Real-time currency exchange rates
  - Switched to fawazahmed0/exchange-api (no API key required!)
  - Full support for all currencies including COP as base currency
  - Vercel serverless function `/api/exchange-rates.ts`
  - 3-tier caching: local cache (24h) → DB (24h) → API
  - SummaryPage consolidated total now uses real-time rates
  - Commit: Switch to free exchange API with COP support

- [x] **Investment Price Storage & Caching** ✅ - Store VOO/stock prices in database
  - Created `stock_prices` table in Supabase
  - 3-tier caching: local (15 min) → database (15 min) → API
  - Shared prices across devices
  - Persistent cache survives page refresh
  - Automatic cleanup of old prices (30+ days)
  - Commit: Implement database caching for stock prices

- [x] **Batch movements with "Mark as Pending" option** ✅ - Create multiple movements at once
  - Added "Batch Add" button on MovementsPage
  - Opens modal with BatchMovementForm component
  - Each row has: Type, Account, Pocket, Amount, Notes, Date
  - Checkbox: "Create as pending movements"
  - Validates all rows before saving
  - Commit: Implement batch/bulk movements feature

- [x] **Payment templates for recurring transactions** ✅ - Save common transactions as templates
  - Created `movement_templates` table
  - "Save as Template" button on movement form
  - Template picker dropdown in movement creation
  - Pre-fills all fields except amount (user can override)
  - Commit: Implement movement templates feature

- [x] **Flexible movement sorting within months** ✅ - Sort movements by different criteria
  - Added sorting dropdown with options:
    - Created Date (Ascending/Descending)
    - Displayed Date (Ascending/Descending)
    - Amount (Ascending/Descending)
    - Type (Income first / Expense first)
  - Keep monthly grouping, apply sort within each month
  - Persist sort preference in localStorage
  - Commit: Add flexible movement sorting options

- [x] **Account saving error bug** ✅ - Fixed "Error saving accounts"
  - Root cause: Missing await on SupabaseStorageService.updateAccount()
  - Added await to ensure account updates complete
  - Commit: Fix account saving error

- [x] **Bulk movement actions** ✅ - Mass operations on movements
  - Checkbox selection for movements (select all, select by filter)
  - Bulk action toolbar:
    - Apply Pending (convert multiple pending → applied)
    - Delete Selected (with confirmation)
    - Edit Attribute (change account/pocket/date for all selected)
    - Mark as Pending (convert applied → pending)
  - Promise.all for parallel processing
  - Commit: Implement bulk movement actions

- [x] **Balance calculation issues** ✅ - Fixed multiple balance bugs
  - Account balances reset to 0 on page refresh
  - Account total balances inconsistent loading
  - Fixed pocket not calculating total from sub-pockets
  - Investment account total excludes gains
  - Root cause: Stale balance values in storage
  - Fix: Always recalculate balances from source of truth (pockets/sub-pockets)
  - Commit: Recalculate balances on load from source of truth

- [x] **Investment stock price - show last updated timestamp** ✅
  - Added "Last updated: X ago" timestamp below current share price
  - Uses date-fns formatDistanceToNow for human-readable format
  - Commit: Add last updated timestamp for investment stock prices

- [x] **Visual indicator for disabled fixed expenses** ✅
  - Reduced opacity (50%) for entire row
  - Strikethrough on expense name
  - "Disabled" badge next to name
  - Applied to both SummaryPage and FixedExpensesPage
  - Commit: Add visual indicators for disabled fixed expenses

- [x] **Switch from Alpha Vantage to Yahoo Finance API** ✅
  - Created Vercel serverless function using yahoo-finance2 library
  - `/api/stock-price.ts` - no CORS issues!
  - Kept Supabase global rate limiting (15 min between calls)
  - Kept local caching (15 min) for performance
  - Commit: Implement Yahoo Finance via Vercel serverless function

- [x] **Investment movement refactor** ✅ - Simplified investment movements
  - Removed special "InvestmentIngreso" and "InvestmentShares" types
  - Investment accounts now use standard "IngresoNormal" / "EgresoNormal" types
  - Pocket selection determines what gets updated:
    - "Invested Money" pocket → updates montoInvertido
    - "Shares" pocket → updates shares
  - Migration utility in src/utils/migrateInvestmentMovements.ts
  - Commit: Refactor investment movements to use standard types

- [x] **Cascade delete for accounts** ✅ - Delete account with all related data
  - "Delete All" button to delete account with all pockets
  - Option to orphan or delete related movements
  - Commit: Implement cascade delete for accounts

- [x] **Orphaned movements handling** ✅ - Comprehensive orphaned movements system
  - Movements marked as "orphaned" when account/pocket deleted
  - Stored with original account/pocket names and currency for restoration
  - Dedicated "Orphaned Movements" section on MovementsPage
  - "Restore All" button recreates account + pockets and links movements
  - "Delete All" button for permanent cleanup
  - Instant orphan detection using isOrphaned flag
  - Commit: Implement orphaned movements system

- [x] **Fixed expenses to movements** ✅ - Auto-populate batch movements
  - Button to auto-populate batch movements modal with enabled monthly fixed expenses
  - User can modify before saving
  - Commit: Add fixed expenses to batch movements feature

---

### 🎨 UI/UX Improvements

- [x] **Loading skeletons** ✅ - Better perceived performance
  - Implemented in all major pages (Summary, Accounts, Movements, Budget Planning, Fixed Expenses)
  - Content-aware skeletons that match actual layout
  - Commit: Add loading skeletons to all pages

- [x] **Enhanced toast notifications** ✅ - Smooth animations and better UX
  - Smooth animations with cubic-bezier easing and scale effects
  - Better stacking with flexbox layout
  - Non-intrusive top-right positioning
  - Exit animations (slide out smoothly)
  - Manual close with X button
  - Auto-dismiss with configurable duration (default 5s)
  - Replaced all alerts with toasts
  - Commit: Enhance toast notifications

- [x] **Empty states** ✅ - Helpful guidance for empty pages
  - Created EmptyState component
  - Implemented across all pages
  - Provides clear next steps for users
  - Commit: Add empty states to all pages

- [x] **Auto-focus inputs** ✅ - Better keyboard navigation
  - Added autoFocus prop support to Input component
  - Implemented in all modal forms
  - Commit: Add auto-focus to form inputs

- [x] **Optimistic UI updates** ✅ - Immediate feedback
  - Forms close instantly, UI updates before server confirms
  - Store-level optimistic updates for all mutations
  - Automatic rollback on failure with error toasts
  - Implemented in MovementsPage, AccountsPage, FixedExpensesPage
  - Batched updates to prevent double-reloads
  - Commit: Implement optimistic UI updates

- [x] **Loading button states** ✅ - Visual feedback during operations
  - Individual buttons show spinner during operations
  - Disabled states prevent multiple clicks
  - Per-item tracking for independent loading states
  - Implemented in all form submit buttons, delete buttons, apply buttons
  - Commit: Add loading button states

---

### ⚡ Performance Improvements

- [x] **Single-record database operations** ✅ - 5-10x faster
  - Optimized database queries
  - Commit: Optimize database operations

- [x] **Selective reloading** ✅ - 50-90% fewer queries
  - Only reload affected data after mutations
  - Commit: Implement selective reloading

- [x] **Fixed account balance calculation bug** ✅
  - Always recalculate from source of truth
  - Commit: Fix account balance calculation

- [x] **Optimized movement queries with composite indexes** ✅
  - Added database indexes for faster queries
  - Commit: Add composite indexes for movements

- [x] **Duplicate page reloads on CRUD operations** ✅ - 66% reduction
  - Root cause: Pages calling loadAccounts(), loadPockets(), loadSubPockets() separately
  - Fix: Refactored loadAccounts() to load all three in single set() call
  - Result: 3 loads → 1 load
  - Commit: Consolidate data loading to eliminate duplicate reloads

---

### 🧹 Code Quality Improvements

- [x] **SPA routing fix** ✅ - Fixed 404 errors on direct URL access
  - Added vercel.json configuration
  - Proper client-side routing support
  - Commit: Fix SPA routing with vercel.json

---

## 📊 Notes

### Priority Guidelines
- **User-Requested Features & Fixes**: Always highest priority, regardless of difficulty
- **UI/UX**: Focus on user experience and accessibility
- **Performance**: Optimize for speed and scalability
- **Code Quality**: Maintain clean, testable, documented code

### Effort Estimates
- Quick wins: 10-30 minutes
- Medium features: 30-90 minutes
- Large features: 2+ hours

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

