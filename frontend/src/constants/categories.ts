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

export const CATEGORY_COLORS: Record<string, string> = {
  Food: '#ef4444',
  Transport: '#3b82f6',
  Bills: '#f59e0b',
  Entertainment: '#8b5cf6',
  Shopping: '#ec4899',
  Health: '#10b981',
  Education: '#06b6d4',
  Salary: '#22c55e',
  Investment: '#6366f1',
  Gifts: '#f97316',
  Subscriptions: '#a855f7',
  Transfer: '#64748b',
  Other: '#9ca3af',
};

export function getCategoryColor(category: string): string {
  return CATEGORY_COLORS[category] ?? '#6b7280';
}
