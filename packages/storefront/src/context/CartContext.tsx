import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

export interface CartItemOption {
  optionId: string;
  optionName: string;
  valueId: string;
  valueName: string;
  priceModifier: number;
}

export interface CartItem {
  id: string;
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  options: CartItemOption[];
  comment?: string;
}

interface CartContextType {
  items: CartItem[];
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  addItem: (item: Omit<CartItem, 'id'>) => void;
  updateQuantity: (id: string, quantity: number) => void;
  removeItem: (id: string) => void;
  clear: () => void;
  itemCount: number;
  subtotal: number;
}

const CartContext = createContext<CartContextType | null>(null);

const STORAGE_KEY = 'kitchenasty-cart';
let nextId = 1;

function generateId() {
  return String(nextId++);
}

function loadCartFromStorage(): CartItem[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const items = JSON.parse(stored) as CartItem[];
      const maxId = items.reduce((max, item) => {
        const idNum = parseInt(item.id);
        return idNum > max ? idNum : max;
      }, 0);
      nextId = maxId + 1;
      return items;
    }
  } catch {}
  return [];
}

function saveCartToStorage(items: CartItem[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {}
}

function clearCartStorage() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
}

interface ToastItem {
  id: string;
  message: string;
  type?: 'error' | 'info';
}

interface ToastContextType {
  showToast: (message: string, options?: Record<string, string | number>, type?: 'error' | 'info', duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback((messageKey: string, options?: Record<string, string | number>, type: 'error' | 'info' = 'error', duration: number = 10000) => {
    const id = generateId();
    setToasts((prev) => [...prev, { id, message: t(messageKey, options), type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, duration);
  }, [t]);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`${toast.type === 'info' ? 'bg-green-600' : 'bg-red-600'} text-white px-4 py-3 rounded-lg shadow-lg max-w-sm flex items-center gap-3`}
          >
            <span className="text-sm">{toast.message}</span>
            <button
              onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
              className={`${toast.type === 'info' ? 'text-green-200 hover:text-white' : 'text-red-200 hover:text-white'} text-lg leading-none`}
              aria-label="Dismiss"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const [items, setItems] = useState<CartItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [validated, setValidated] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    const stored = loadCartFromStorage();
    if (stored.length > 0) {
      setItems(stored);
    }
  }, []);

  useEffect(() => {
    if (items.length === 0 || validated) return;

    const validateCart = async () => {
      try {
        const payload = {
          items: items.map((item) => ({
            menuItemId: item.menuItemId,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            comment: item.comment,
            options: item.options.map((opt) => ({
              menuOptionValueId: opt.valueId,
              name: opt.optionName,
              value: opt.valueName,
              priceModifier: opt.priceModifier,
            })),
          })),
        };

        const res = await fetch('/api/orders/validate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        const data = await res.json();

        if (!data.valid && data.invalidItems?.length > 0) {
          clear();
          showToast('cart.invalidated');
        }

        setValidated(true);
      } catch {
        setValidated(true);
      }
    };

    validateCart();
  }, [items, validated, showToast]);

  const addItem = useCallback((item: Omit<CartItem, 'id'>) => {
    setItems((prev) => {
      const newItems = [...prev, { ...item, id: generateId() }];
      saveCartToStorage(newItems);
      return newItems;
    });
    setIsOpen(true);
  }, []);

  const updateQuantity = useCallback((id: string, quantity: number) => {
    setItems((prev) => {
      const newItems =
        quantity <= 0
          ? prev.filter((i) => i.id !== id)
          : prev.map((i) => (i.id === id ? { ...i, quantity } : i));
      saveCartToStorage(newItems);
      return newItems;
    });
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => {
      const newItems = prev.filter((i) => i.id !== id);
      saveCartToStorage(newItems);
      return newItems;
    });
  }, []);

  const clear = useCallback(() => {
    setItems([]);
    clearCartStorage();
  }, []);

  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);

  const subtotal = items.reduce((sum, item) => {
    const optionsTotal = item.options.reduce((s, o) => s + o.priceModifier, 0);
    return sum + (item.price + optionsTotal) * item.quantity;
  }, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        isOpen,
        setIsOpen,
        addItem,
        updateQuantity,
        removeItem,
        clear,
        itemCount,
        subtotal,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}