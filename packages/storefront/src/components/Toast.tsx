import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

export interface ToastAction {
  labelKey: string;
  onClick: () => void;
}

export interface ToastItem {
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
  const { t } = useTranslation();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const bgColor = toast.type === 'info' ? 'bg-primary-600' : toast.type === 'prompt' ? 'bg-blue-600' : 'bg-red-600';
  const textMuted = toast.type === 'info' ? 'text-primary-200' : toast.type === 'prompt' ? 'text-blue-200' : 'text-red-200';

  return (
    <div
      className={`${bgColor} text-white px-4 py-3 rounded-lg shadow-lg max-w-sm flex items-center gap-3 transition-all duration-300 ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4'}`}
    >
      <span className="text-sm flex-1">{toast.message}</span>
      {toast.action && (
        <button
          onClick={() => {
            toast.action!.onClick();
            onDismiss(toast.id);
          }}
          className="bg-white text-blue-600 px-3 py-1 rounded font-medium text-sm hover:bg-gray-100"
        >
          {toast.action.label}
        </button>
      )}
      <button
        onClick={() => onDismiss(toast.id)}
        className={`${textMuted} hover:text-white text-lg leading-none`}
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
    <div className="fixed top-16 left-4 right-4 z-50 flex flex-col gap-2 md:top-4 md:right-4 md:left-auto md:max-w-sm md:mx-auto">
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
}
