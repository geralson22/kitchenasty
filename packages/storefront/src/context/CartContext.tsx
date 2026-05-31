import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ToastContainer, ToastItem, ToastAction } from '../components/Toast.js';

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

interface ToastContextType {
  showToast: (message: string, options?: Record<string, string | number>, type?: 'error' | 'info' | 'prompt', action?: ToastAction, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback((messageKey: string, options?: Record<string, string | number>, type: 'error' | 'info' | 'prompt' = 'error', action?: ToastAction, duration: number = 10000) => {
    const id = generateId();
    setToasts((prev) => [...prev, { id, message: t(messageKey, options), type, action: action ? { ...action, label: t(action.labelKey) } : undefined }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, duration);
  }, [t]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
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