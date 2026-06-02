import { useState, useEffect } from 'react';

interface ToastItem {
  id: string;
  message: string;
  type?: 'error' | 'info' | 'prompt';
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ToastProps {
  toast: ToastItem;
  onDismiss: (id: string) => void;
}

export function Toast({ toast, onDismiss }: ToastProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const bgStyle = toast.type === 'info'
    ? { backgroundColor: 'var(--color-primary-600, #ea580c)' }
    : toast.type === 'prompt'
    ? { backgroundColor: '#16a34a' }
    : { backgroundColor: '#dc2626' };

  const textMuted = toast.type === 'info'
    ? { color: 'var(--color-primary-200, #fed7aa)' }
    : toast.type === 'prompt'
    ? { color: '#bbf7d0' }
    : { color: '#fecaca' };

  return (
    <div
      style={bgStyle}
      className={`text-white px-4 py-3 rounded-lg shadow-lg max-w-sm flex items-center gap-3 transition-all duration-300 ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4'}`}
    >
      <span className="text-sm flex-1">{toast.message}</span>
      {toast.action && (
        <button
          onClick={() => { toast.action!.onClick(); onDismiss(toast.id); }}
          className="bg-white text-gray-900 px-3 py-1 rounded font-medium text-sm hover:bg-gray-100"
        >
          {toast.action.label}
        </button>
      )}
      <button
        onClick={() => onDismiss(toast.id)}
        style={textMuted}
        className="hover:text-white text-lg leading-none"
        aria-label="Dismiss"
      >
        ×
      </button>
    </div>
  );
}

interface ToastContainerProps {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
}
