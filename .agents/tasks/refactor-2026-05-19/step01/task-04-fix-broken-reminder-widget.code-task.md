# Task: Fix Broken Reminder Widget

## Description
The reminder widget has multiple bugs that make it non-functional for recurring reminders: custom recurrence selection overwrites the type back to non-custom (making it impossible to save), projected reminders share React keys (causing wrong items to be acted upon), date handling inconsistencies cause off-by-one bugs, and error handling is missing on mutations.

## Background
Root causes identified:
1. **ReminderForm.tsx ~L130-145**: The "Period" dropdown in custom recurrence mode has `name="recurrenceType"` which overwrites the parent `recurrenceType` field back to `'daily'`/`'weekly'`/etc., immediately hiding the custom interval UI.
2. **MonthSection.tsx ~L50**: Projected recurring reminders use `reminder.id` as the React key. Multiple projections of the same reminder in one month share the same key, causing React reconciliation bugs.
3. **RemindersWidget.tsx ~L85-130**: `dueDate.split('T')[0]` is used inconsistently — some dates are ISO strings with `T`, others are date-only strings. Exception matching fails when formats don't match.
4. **RemindersWidget.tsx ~L88-130**: `handleRecurrenceAction` calls `mutateAsync` without try/catch. Failures propagate unhandled.
5. **ReminderForm.tsx ~L55-70**: When `initialData` becomes null (switching from edit to create mode), the form retains previous reminder's data.

## Technical Requirements
1. Fix the custom recurrence "Period" dropdown to use a separate field name (e.g., `customPeriod`) instead of overwriting `recurrenceType`
2. Use composite keys for projected reminders: `key={`${reminder.id}-${reminder.dueDate}`}`
3. Normalize all dates to consistent format using `format(parseISO(date), 'yyyy-MM-dd')` from date-fns
4. Add try/catch with toast error feedback to all mutation calls in RemindersWidget
5. Reset form state to defaults when `initialData` becomes null/undefined
6. Fix the `useEffect` scroll dependency to use a stable flag instead of `monthGroups.length`

## Dependencies
- `frontend/src/components/reminders/ReminderForm.tsx`
- `frontend/src/components/reminders/RemindersWidget.tsx`
- `frontend/src/components/reminders/MonthSection.tsx`
- `frontend/src/components/reminders/ReminderCard.tsx`
- `frontend/src/components/reminders/MarkAsPaidModal.tsx`
- `frontend/src/hooks/queries/useReminderQueries.ts`

## Implementation Approach
1. Fix the custom recurrence form field naming (separate `customPeriod` from `recurrenceType`)
2. On form submit, combine `recurrenceInterval` + `customPeriod` into the final recurrence object
3. Add composite keys to MonthSection's reminder list
4. Create a `normalizeDate(date: string): string` utility and use it consistently
5. Wrap all `mutateAsync` calls in try/catch with toast notifications
6. Add `else { resetFormToDefaults() }` in the initialData useEffect

## Acceptance Criteria

1. **Custom Recurrence Saves Correctly**
   - Given a user selects "Custom" recurrence type
   - When they set interval to 3 and period to "weeks"
   - Then the reminder saves with `recurrenceInterval: 3, recurrenceType: 'custom', customPeriod: 'weekly'`

2. **Projected Reminders Have Unique Keys**
   - Given a weekly reminder with 4 projections in one month
   - When the month section renders
   - Then each projection has a unique React key and actions target the correct one

3. **Date Matching Works Across Formats**
   - Given an exception for date "2025-03-15"
   - When checking if a projected reminder on that date should be skipped
   - Then the exception matches regardless of whether the date was stored as ISO or date-only

4. **Error Feedback on Mutation Failure**
   - Given a network error during reminder deletion
   - When the mutation fails
   - Then a toast error is shown and the modal remains open

5. **Form Resets on Mode Switch**
   - Given the user was editing a reminder
   - When they close the edit and click "Add New"
   - Then the form shows empty/default values, not the previous reminder's data

## Metadata
- **Complexity**: Medium
- **Labels**: Critical Bug, Components, Reminders, Forms
- **Required Skills**: React, date-fns, TanStack Query mutations, form state management
