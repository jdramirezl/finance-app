# Product Context

## What It Does

Finance App is a comprehensive personal finance management system that enables users to:

- **Track Financial Accounts**: Manage multiple bank accounts, cash, and investment accounts across different currencies
- **Organize Money with Pockets**: Create sub-containers within accounts for specific purposes (savings, travel, emergency fund, etc.)
- **Record Transactions**: Log all income and expenses with detailed categorization and notes
- **Plan Budgets**: Distribute income across different categories with percentage-based allocation
- **Manage Fixed Expenses**: Track recurring bills and expenses with automatic monthly contribution calculations
- **Set Reminders**: Never miss bill payments with recurring reminders (daily, weekly, monthly, yearly)
- **Track Net Worth**: Visualize wealth over time with historical snapshots and currency breakdowns
- **Monitor Investments**: Track stock holdings with real-time pricing and gain/loss calculations
- **Handle Multiple Currencies**: Support for USD, MXN, COP, EUR, GBP with automatic exchange rate conversion
- **Plan Future Transactions**: Register pending movements that don't affect current balances

## Why It Exists

### Problem Statement

Personal finance management is challenging due to:
- **Fragmentation**: Financial data scattered across multiple banks, apps, and spreadsheets
- **Lack of Visibility**: Difficulty seeing the complete financial picture across accounts and currencies
- **Manual Tracking**: Time-consuming manual calculations for budgets and fixed expenses
- **No Centralization**: Existing solutions often lock users into proprietary ecosystems or charge subscription fees
- **Limited Customization**: Generic finance apps don't accommodate personal organizational preferences

### Solution Approach

Finance App addresses these challenges by providing:
- **Unified Dashboard**: Single view of all financial accounts and their balances
- **Flexible Organization**: Custom pockets and sub-pockets for personalized money management
- **Automated Calculations**: Automatic balance updates, budget distributions, and fixed expense tracking
- **Multi-Currency Support**: Seamless handling of multiple currencies with real-time conversion
- **Cloud Sync**: Access financial data from any device with secure cloud synchronization
- **Zero Cost**: Free to use, leveraging free tiers of modern cloud services
- **Privacy First**: Row-level security ensures complete data isolation between users

## Business Value

### For Individual Users

1. **Financial Clarity**: Complete visibility into financial status across all accounts and currencies
2. **Time Savings**: Automated calculations eliminate manual spreadsheet work
3. **Better Planning**: Budget planning tools help optimize income distribution
4. **Expense Control**: Fixed expense tracking ensures bills are always covered
5. **Investment Tracking**: Monitor investment performance without switching apps
6. **Peace of Mind**: Reminders prevent missed payments and late fees
7. **Historical Insights**: Net worth timeline shows financial progress over time

### Key Metrics

- **Cost Efficiency**: $0/month vs typical $5-15/month for competing services
- **Time Savings**: Estimated 2-3 hours/month saved on manual financial tracking
- **Accessibility**: Available on any device with a web browser
- **Security**: Bank-grade security with encrypted data and row-level access control

## Ecosystem Position

### Category

Personal Finance Management (PFM) / Money Management Application

### Market Position

- **Target Audience**: Individuals seeking comprehensive, free personal finance tracking
- **Differentiation**: 
  - Zero cost (free tier hosting)
  - Highly customizable pocket system
  - Multi-currency native support
  - Investment tracking integrated
  - Open source potential

### Relationship to Other Systems

**Complementary Services:**
- **Banking Apps**: Finance App aggregates data from multiple banks
- **Investment Platforms**: Tracks investments but doesn't execute trades
- **Spreadsheets**: Replaces manual Excel/Google Sheets tracking
- **Calendar Apps**: Integrates with reminder systems for bill payments

**Data Sources:**
- Exchange rate APIs for currency conversion
- Stock price APIs for investment valuation
- User manual input for transactions

**Future Integrations (Planned):**
- Bank API connections for automatic transaction import
- Email notifications for reminders
- Export to CSV/Excel for external analysis
- Mobile app (React Native) for on-the-go access

## Key Use Cases

### 1. Monthly Budget Management
**Actor**: Individual user with regular income

**Scenario**: User receives monthly salary and needs to distribute it across savings, expenses, and discretionary spending

**Flow**:
1. Register salary as income movement
2. Use budget planning to allocate percentages to different pockets
3. Track spending throughout the month
4. Review net worth at month end

### 2. Multi-Currency Expense Tracking
**Actor**: User with accounts in multiple currencies (e.g., expat, frequent traveler)

**Scenario**: User has bank accounts in USD, MXN, and EUR and needs consolidated view

**Flow**:
1. Create accounts for each currency
2. Record transactions in native currencies
3. View consolidated total in preferred currency
4. Track exchange rate impact on net worth

### 3. Fixed Expense Management
**Actor**: User with recurring bills (rent, utilities, subscriptions)

**Scenario**: User wants to ensure money is always available for fixed expenses

**Flow**:
1. Create fixed expense pocket with sub-pockets for each bill
2. Set target amounts and payment frequencies
3. Make monthly contributions automatically calculated
4. Track progress toward each expense target
5. Receive reminders before payment due dates

### 4. Investment Portfolio Tracking
**Actor**: Investor with stock holdings

**Scenario**: User owns shares of VOO and wants to track performance

**Flow**:
1. Create investment account
2. Register share purchases
3. View real-time valuation and gains/losses
4. Track investment as part of total net worth

### 5. Future Transaction Planning
**Actor**: User planning upcoming expenses

**Scenario**: User knows about future expenses but doesn't want them affecting current balance

**Flow**:
1. Register movements as "pending"
2. View pending transactions separately
3. Convert to actual movements when they occur
4. Plan cash flow with visibility into future obligations

## Customers

### Primary Users

**Individual Finance Managers**
- People who actively manage their personal finances
- Users comfortable with technology and web applications
- Individuals seeking alternatives to paid finance apps
- Users with multiple accounts or currencies

**Characteristics**:
- Age: 25-45 (tech-savvy demographic)
- Income: Variable (students to professionals)
- Geography: International (multi-currency support)
- Tech Proficiency: Moderate to high

### User Personas

**1. The Organized Professional**
- Has multiple bank accounts and investment accounts
- Wants detailed tracking and historical analysis
- Values automation and time savings
- Uses budget planning extensively

**2. The Multi-Currency User**
- Lives/works across borders or travels frequently
- Needs to track finances in multiple currencies
- Requires consolidated view in preferred currency
- Values accurate exchange rate conversion

**3. The Investment Tracker**
- Actively invests in stocks and wants integrated tracking
- Monitors portfolio performance regularly
- Appreciates real-time pricing updates
- Uses net worth timeline to track investment growth

**4. The Budget-Conscious Saver**
- Focuses on saving for specific goals
- Uses pockets to organize savings by purpose
- Relies on fixed expense tracking for bill management
- Appreciates visual progress indicators

### How Customers Use It

**Daily Usage**:
- Quick balance checks across accounts
- Recording daily transactions
- Checking pending movements

**Weekly Usage**:
- Reviewing spending patterns
- Updating investment valuations
- Managing reminders

**Monthly Usage**:
- Budget planning and distribution
- Fixed expense contributions
- Net worth snapshot review
- Month-end reconciliation

**Occasional Usage**:
- Creating new accounts or pockets
- Adjusting budget allocations
- Setting up new reminders
- Reviewing historical trends
