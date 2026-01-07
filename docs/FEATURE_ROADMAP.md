# Feature Roadmap

This document outlines planned features, improvements, and bug fixes for the personal finance management application, organized by priority and implementation complexity.

## Priority Levels
- **P0 (Critical)**: Core functionality fixes and essential features
- **P1 (High)**: Important features that significantly improve user experience
- **P2 (Medium)**: Nice-to-have features that add value
- **P3 (Low)**: Future enhancements and optimizations

---

## P0 - Critical Priority

### 🐛 Fix Budget Planning Template Configuration
**Status**: Bug Fix  
**Description**: The budget planning modal shows incorrect/weird accounts and pockets when opened. Users should be able to modify the template that determines where auto-batch movements are allocated.

**Acceptance Criteria**:
- Modal displays correct current accounts and pockets
- Users can modify destination mappings for each budget category
- Changes persist and are applied to future auto-batch operations
- Clear validation for invalid account/pocket combinations

**Technical Notes**: Likely issue with state initialization or stale data in budget planning store.

---

### 🔄 Enhanced SubPocket Transfers
**Status**: Feature Enhancement  
**Description**: Enable transfers between subpockets when either the origin or destination (or both) belongs to the fixed expenses pocket+account. This could potentially require a reinvention/remake of the UI for the transfer type modal

**Current Limitation**: Transfer functionality may be restricted for fixed expense subpockets.

**Acceptance Criteria**:
- Allow transfers FROM any subpocket TO fixed expense subpockets
- Allow transfers FROM fixed expense subpockets TO any subpocket
- Allow transfers BETWEEN fixed expense subpockets
- Maintain proper balance calculations and movement history
- Validate transfer amounts against available balances

**Technical Notes**: Update transfer validation logic in `movementService.ts` and transfer components.

---

## P1 - High Priority

### 🌍 Spanish Translation (i18n)
**Status**: Feature Addition  
**Description**: Implement complete Spanish localization for the entire application interface.

**Scope**:
- All UI text, labels, and messages
- Error messages and validation text
- Date and currency formatting
- Navigation and menu items
- Form placeholders and help text

**Acceptance Criteria**:
- Language toggle in settings
- Persistent language preference
- Complete Spanish translation coverage
- Proper pluralization and context handling
- Currency and date formatting respect locale

**Technical Implementation**:
- Use React i18n library (react-i18next recommended)
- Create translation files for EN/ES
- Update all components to use translation keys
- Add language selector to SettingsPage

---

## P2 - Medium Priority

### 🏠 Property Account Type
**Status**: Feature Addition  
**Description**: Add support for property/asset accounts to track net worth including real estate, vehicles, and other valuable assets.

**Features**:
- New account type: "Property" alongside existing types
- Support for assets like cars, real estate, jewelry, etc.
- Manual value updates (no automatic price tracking initially)
- Include in net worth calculations
- Depreciation tracking (optional)

**Acceptance Criteria**:
- New "Property" account type in account creation
- Property accounts don't support pockets (single balance)
- Manual balance adjustments with movement history
- Net worth summary includes property values
- Optional depreciation schedule configuration

**Technical Implementation**:
- Extend `AccountType` enum to include "Property"
- Update account creation and management flows
- Modify net worth calculations
- Add property-specific UI components
- Consider future integration with property value APIs

---

### 💰 Certificate of Deposit (CD/CDT) Investment Type
**Status**: Feature Addition  
**Description**: Support for Certificate of Deposit investments with fixed terms and interest rates.

**Features**:
- CD-specific investment account type
- Fixed term duration and interest rate
- Maturity date tracking
- Interest calculation and compounding
- Early withdrawal penalties (optional)

**Proposed Implementation**:
1. **Option A**: Extend existing investment accounts with CD-specific metadata
2. **Option B**: Create separate CD account type with specialized features
3. **Option C**: Add CD as a subtype of investment accounts

**Acceptance Criteria**:
- CD creation with principal, rate, and term
- Automatic interest calculation
- Maturity date notifications
- Integration with net worth calculations
- Historical performance tracking

**Technical Considerations**:
- Decide on data model approach
- Interest calculation frequency (daily, monthly, quarterly)
- Integration with existing investment infrastructure
- Future API integration for current CD rates

---

## P3 - Low Priority

### 📱 Mobile App Preparation
**Status**: Future Enhancement  
**Description**: Prepare codebase for React Native mobile app development with shared business logic.

**Scope**:
- Extract business logic to shared packages
- Create platform-agnostic service layer
- Design responsive components
- Optimize for mobile performance

---

### 🔗 External API Integrations
**Status**: Future Enhancement  
**Description**: Integrate with external services for real-time data.

**Features**:
- Exchange rate APIs for currency conversion
- Stock price APIs for investment tracking
- Bank account integration (Open Banking)
- Automated transaction import

---

### 📈 Advanced Analytics
**Status**: Future Enhancement  
**Description**: Enhanced reporting and analytics features.

**Features**:
- Spending trends and patterns
- Budget vs actual analysis
- Investment performance metrics
- Export capabilities (PDF, CSV)
- Custom date range reporting

---

## Implementation Notes

### Development Workflow
1. Create feature branches for each item
2. Write tests for new functionality
3. Update documentation
4. Code review and testing
5. Gradual rollout for major features

### Technical Debt
- Consider refactoring large components during feature development
- Improve test coverage for new features
- Update TypeScript types as needed
- Maintain consistent code style and patterns

### User Experience
- Gather user feedback on new features
- A/B test major UI changes
- Maintain backward compatibility where possible
- Provide migration paths for data changes

---

*Last Updated: January 2026*