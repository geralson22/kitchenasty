import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Toast, ToastContainer } from '../components/Toast.js';

interface ToastAction {
  label: string;
  onClick: () => void;
}

interface ToastItem {
  id: string;
  message: string;
  type?: 'error' | 'info' | 'prompt';
  action?: ToastAction;
}

interface ToastContextType {
  showToast: (message: string, type?: 'error' | 'info' | 'prompt', duration?: number, action?: ToastAction) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

function generateId() {
  return Math.random().toString(36).slice(2);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback((message: string, type: 'error' | 'info' | 'prompt' = 'info', duration: number = 5000, action?: ToastAction) => {
    const id = generateId();
    setToasts((prev) => [...prev, { id, message, type, action }]);
    if (duration > 0 && !action) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    }
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
