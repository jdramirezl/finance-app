# Future Features

To be addressed ONLY after the full refactor is complete.

## 1. Unified Budget & Fixed Expenses Page
Merge fixed expenses and budget planning into a single visual flow:
- Input: initial income (support multiple inputs for quincenas/bi-weekly pay)
- Fixed expenses column/group (could have sub-groups: recurring, installments, non-fixed)
- Budget split with percentages showing money flow per category
- Visual structure ideas: kanban-style, node graph (n8n-like), flow diagram
- Could use Google's "Stitch" UI proposal tool to generate mocks
- Priority: design the idea and functionalities first, then UI
- **UI constraint: must match the current app's visual style (dark theme, card-based, Tailwind)**

## 2. Export Functionality
- Export to spreadsheet (Excel/CSV)
- Export to local format (JSON backup already exists, but proper formatted export)
- Stretch: Google Sheets sync (complex but high value)

## 3. Telegram Bot + AI Automation
- n8n workflow: user writes to Telegram bot
- AI processes message into structured format (amount, type, account, pocket, notes)
- Endpoint receives the structured data and creates movements
- Could support natural language: "spent 500 pesos on groceries from BBVA checking"

## 4. More QOL Ideas (brainstorm later)
- Smart categorization suggestions based on notes
- Recurring movement auto-creation
- Monthly summary email/notification
- Goal tracking (save X by date Y)
- Bill splitting with other users
- Receipt photo → movement creation (OCR)

## 5. Orphaned Movements Redesign — Soft-Delete/Archive Accounts

Replace the current orphan system with account archiving.

**Core rule: Movements from archived accounts still count toward totals and still appear in history.** Archiving an account only hides it from the accounts list and dashboard — it does NOT exclude its movements from calculations.

Example: if movements are -100 and +120, total = 20. Archiving the account that did -100 does NOT change the total to +120. The -100 movement still counts, it just shows a visual indicator that its account is archived.

Behavior:
- "Delete Account" becomes "Archive Account" (soft-delete via `isArchived` boolean)
- Archived accounts disappear from the accounts page and summary cards
- Movements from archived accounts STILL appear in the movements list and STILL affect balances
- Movements from archived accounts are visually marked (muted color, small "archived" badge, or strikethrough account name)
- "Unarchive" is just flipping the boolean — account reappears with all its data intact
- An "Archived Accounts" section in Settings lets users see/restore archived accounts
- The entire current orphan system is removed: `isOrphaned` flag, `orphanedAccountName`, `orphanedPocketName`, `orphanedAccountCurrency` columns, RestoreOrphanedModal, orphaned movements panel

Why this is better:
- No data loss or state corruption on "delete"
- Movements always count (no surprise balance changes)
- Reversible in one click
- No complex restore flow
- Matches the Excel mental model

Implementation:
- Add `is_archived BOOLEAN DEFAULT FALSE` to accounts table
- Filter archived accounts from accounts page (but NOT from movement queries or balance calculations)
- Visual indicator on movements whose account is archived
- "Archived Accounts" management UI in Settings
- Remove all orphan-related code
- Migration to convert existing orphaned movements back to normal

## 6. Settings Page Redesign

Current problems: flat list mixing preferences/data management/debug tools, no hierarchy, debug tools shouldn't be user-facing.

Proposed structure:
- Preferences: primary currency, theme, date format, number format, default account for new movements
- Accounts & Data: export backup, import backup, archive management (ties into feature 5)
- Notifications: reminder notifications, budget alerts
- About: version, clear local cache

Remove from settings entirely: exchange rate debug, stock price debug, recalculate balances (developer tools, not user features).

## 7. More QOL Ideas (brainstorm later)
- Smart categorization suggestions based on notes
- Recurring movement auto-creation
- Monthly summary email/notification
- Goal tracking (save X by date Y)
- Bill splitting with other users
- Receipt photo → movement creation (OCR)
- Quick inline edit for movement amounts (without opening modal)
- Budget auto-generation should let user pick target account
