import { useState, useCallback, useEffect } from 'react';
import { useToast } from '../context/CartContext.js';

const STORAGE_KEY = 'notifications_enabled';

interface UseBrowserNotificationsReturn {
  isSupported: boolean;
  permission: NotificationPermission | 'unsupported';
  notificationsEnabled: boolean;
  requestPermission: (orderNumber?: string) => Promise<boolean>;
  showNotification: (title: string, options?: NotificationOptions) => void;
}

export function useBrowserNotifications(): UseBrowserNotificationsReturn {
  const { showToast } = useToast();
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('unsupported');
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  const isSupported = typeof window !== 'undefined' && 'Notification' in window;

  useEffect(() => {
    if (!isSupported) return;
    setPermission(Notification.permission);
    const stored = localStorage.getItem(STORAGE_KEY);
    setNotificationsEnabled(stored === 'true' && Notification.permission === 'granted');
  }, [isSupported]);

  const requestPermission = useCallback((orderNumber?: string): Promise<boolean> => {
    if (!isSupported) return Promise.resolve(false);

    if (Notification.permission === 'denied') {
      return Promise.resolve(false);
    }

    if (Notification.permission === 'granted') {
      if (localStorage.getItem(STORAGE_KEY) !== 'true') {
        localStorage.setItem(STORAGE_KEY, 'true');
        setNotificationsEnabled(true);
      }
      return Promise.resolve(true);
    }

    return new Promise((resolve) => {
      const handleEnable = async () => {
        const result = await Notification.requestPermission();
        setPermission(result);
        if (result === 'granted') {
          localStorage.setItem(STORAGE_KEY, 'true');
          setNotificationsEnabled(true);
          resolve(true);
        } else {
          resolve(false);
        }
      };

      showToast(
        'notifications.enablePrompt',
        orderNumber ? { orderNumber } : undefined,
        'prompt',
        { labelKey: 'notifications.enable', onClick: handleEnable },
        15000
      );
    });
  }, [isSupported, showToast]);

  const showNotification = useCallback((title: string, options?: NotificationOptions) => {
    if (!isSupported || !notificationsEnabled || permission !== 'granted') return;
    new Notification(title, options);
  }, [isSupported, notificationsEnabled, permission]);

  return {
    isSupported,
    permission,
    notificationsEnabled,
    requestPermission,
    showNotification,
  };
}
