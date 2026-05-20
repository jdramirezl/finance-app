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
