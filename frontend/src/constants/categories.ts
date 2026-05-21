export const PREDEFINED_CATEGORIES = [
  'Food',
  'Transport',
  'Bills',
  'Entertainment',
  'Shopping',
  'Health',
  'Education',
  'Salary',
  'Investment',
  'Gifts',
  'Subscriptions',
  'Transfer',
  'Other',
] as const;

export type PredefinedCategory = typeof PREDEFINED_CATEGORIES[number];
