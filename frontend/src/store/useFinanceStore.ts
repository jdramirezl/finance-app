import { create } from 'zustand';

// Store is now deprecated and replaced by TanStack Query hooks.
// Keeping this file temporarily as a placeholder or for any remaining global client-only state.
// If no client-only state remains, this can be deleted entirely.

interface FinanceStore {
  // Add client-only state here if needed
}

export const useFinanceStore = create<FinanceStore>(() => ({
  // Initial state
}));

