import { create } from 'zustand';
import type { ToastType } from '../components/Toast';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface ToastStore {
  toasts: Toast[];
  addToast: (message: string, type?: ToastType, duration?: number) => void;
  removeToast: (id: string) => void;
  success: (message: string, duration?: number) => void;
  error: (message: string, duration?: number) => void;
  info: (message: string, duration?: number) => void;
  warning: (message: string, duration?: number) => void;
}

export const useToast = create<ToastStore>((set) => ({
  toasts: [],
  
  addToast: (message, type = 'info', duration = 5000) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    set((state) => ({
      toasts: [...state.toasts, { id, message, type, duration }],
    }));
  },
  
  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((toast) => toast.id !== id),
    }));
  },
  
  success: (message, duration) => {
    useToast.getState().addToast(message, 'success', duration);
  },
  
  error: (message, duration) => {
    useToast.getState().addToast(message, 'error', duration);
  },
  
  info: (message, duration) => {
    useToast.getState().addToast(message, 'info', duration);
  },
  
  warning: (message, duration) => {
    useToast.getState().addToast(message, 'warning', duration);
  },
}));
