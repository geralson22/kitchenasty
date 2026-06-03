import { useState, useEffect, useCallback } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { io } from 'socket.io-client';
import { getWhatsAppUrl } from '../utils/whatsapp.js';
import { useAuth } from '../context/AuthContext.js';
import { useToast } from '../context/CartContext.js';
import { useBrowserNotifications } from '../hooks/useBrowserNotifications.js';

const STATUS_TRANSLATION_KEYS: Record<string, string> = {
  PENDING: 'placed',
  CONFIRMED: 'confirmed',
  PREPARING: 'preparing',
  READY: 'ready',
  OUT_FOR_DELIVERY: 'outForDelivery',
  DELIVERED: 'delivered',
  READY_FOR_PICKUP: 'readyForPickup',
  PICKED_UP: 'pickedUp',
  CANCELLED: 'cancelled',
};

function translateStatus(t: (key: string) => string, status: string | undefined): string {
  if (!status) return '';
  const translationKey = STATUS_TRANSLATION_KEYS[status];
  return translationKey ? t(`orderStatus.${translationKey}`) : status.replace(/_/g, ' ');
}

interface OrderItem {
  quantity: number;
  name: string;
  unitPrice?: number;
  subtotal?: number;
  options?: Array<{ name: string; value: string }>;
  comment?: string;
}

interface OrderData {
  id: string;
  orderNumber: string;
  orderType: string;
  status?: string;
  paymentMethod?: string;
  subtotal?: number;
  deliveryFee?: number;
  tax?: number;
  discount?: number;
  total: number;
  items: OrderItem[];
  comment?: string;
  freeDelivery?: boolean;
  guestName?: string;
  guestPhone?: string;
  guestEmail?: string;
  address?: {
    line1: string;
    line2: string;
    city: string;
    state: string;
    zip: string;
    zoneName?: string;
  };
  location?: { id: string; name: string };
  customer?: { id: string; name: string; email: string; phone: string };
  createdAt?: string;
  [key: string]: unknown;
}

export default function OrderConfirmation() {
  const { t } = useTranslation();
  const { id } = useParams();
  const location = useLocation();
  const { token } = useAuth();
  const { showToast } = useToast();
  const { requestPermission, showNotification } = useBrowserNotifications();
  const [order, setOrder] = useState<OrderData | null>(location.state?.order);
  const [loading, setLoading] = useState(!location.state?.order);
  const [error, setError] = useState('');

  const fetchOrder = useCallback(async () => {
    if (!id) return;
    try {
      const headers: Record<string, string> = {};
      if (token) headers.Authorization = `Bearer ${token}`;
      const res = await fetch(`/api/orders/${id}`, { headers });
      if (!res.ok) throw new Error('Failed to load order');
      const data = await res.json();
      setOrder(data.data);
      setError('');
      if (data.data?.orderNumber) {
        requestPermission(data.data.orderNumber);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load order');
    } finally {
      setLoading(false);
    }
  }, [id, token, requestPermission]);

  useEffect(() => {
    fetchOrder();
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    if (!id) return;

    const socket = io({ path: '/socket.io', transports: ['websocket', 'polling'] });

    socket.emit('join:order', id);

    socket.on('order:statusUpdate', (data: { id: string; status: string }) => {
      if (data.id === id) {
        const translatedStatus = translateStatus(t, data.status);
        setOrder((prev) => prev ? { ...prev, status: data.status } : prev);
        showToast('orderStatus.statusUpdated', { status: translatedStatus }, 'info');
        showNotification(`Order #${order?.orderNumber}`, {
          body: `${t('orderStatus.statusUpdated', { status: translatedStatus })}`,
        });
      }
    });

    return () => {
      socket.emit('leave:order', id);
      socket.disconnect();
    };
  }, [id]);

  const handleWhatsApp = () => {
    if (order) {
      const orderType = order.orderType === 'DELIVERY' ? 'delivery' : 'pickup';
      const url = getWhatsAppUrl(order, orderType, t, window.location.origin);
      window.open(url, '_blank');
    }
  };

  const getPaymentLabel = (method?: string) => {
    if (method === 'STRIPE') return t('checkout.creditCard');
    if (method === 'PAYPAL') return t('checkout.paypal');
    if (method === 'TRANSFER') return t('checkout.transfer');
    return t('checkout.cashOnDelivery');
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (error && !order) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-4">{error}</div>
        <button onClick={fetchOrder} className="text-primary-600 hover:text-primary-700 text-sm font-medium">
          {t('orders.retry')}
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-2">{t('orderConfirmation.title')}</h1>
        <p className="text-gray-600 mb-2">{t('orderConfirmation.thankYou')}</p>

        {(order?.orderNumber || id) && (
          <p className="text-sm text-gray-500 mb-6">
            {t('orderConfirmation.orderNumber')} {order?.orderNumber ? `#${order.orderNumber}` : `ID: ${id}`}
          </p>
        )}

        {order && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 text-left mb-8">
            <div className="grid grid-cols-2 gap-4 text-sm mb-6">
              <div>
                <span className="text-gray-500">{t('checkout.orderType')}</span>
                <p className="font-medium text-gray-900">{order.orderType === 'DELIVERY' ? t('whatsapp.delivery') : order.orderType === 'PICKUP' ? t('whatsapp.pickup') : order.orderType}</p>
              </div>
              <div>
                <span className="text-gray-500">{t('orders.status')}</span>
                <p className="font-medium text-gray-900">{translateStatus(t, order.status)}</p>
              </div>
              <div>
                <span className="text-gray-500">{t('checkout.paymentMethod')}</span>
                <p className="font-medium text-gray-900">{getPaymentLabel(order.paymentMethod)}</p>
              </div>
              <div>
                <span className="text-gray-500">{t('checkout.total')}</span>
                <p className="font-bold text-primary-600">${order.total?.toFixed(2)}</p>
              </div>
            </div>

            <h3 className="text-sm font-semibold text-gray-700 mb-3">{t('whatsapp.items')}</h3>
            <div className="border-t border-gray-100 pt-3 space-y-3">
              {order.items.map((item, idx) => (
                <div key={idx} className="flex justify-between items-start text-sm">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">
                      <span className="text-gray-400 mr-1">{item.quantity}x</span>
                      {item.name}
                    </p>
                    {item.options && item.options.length > 0 && (
                      <p className="text-xs text-gray-500 ml-2">{item.options.map(o => `${o.name}: ${o.value}`).join(', ')}</p>
                    )}
                    {item.comment && <p className="text-xs text-gray-400 italic ml-2">📝 {item.comment}</p>}
                  </div>
                  <span className="font-medium text-gray-900 ml-2">${(item.subtotal ?? 0).toFixed(2)}</span>
                </div>
              ))}
            </div>

            <div className="border-t border-gray-100 mt-4 pt-4 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">{t('checkout.subtotal')}</span>
                <span className="text-gray-900">${order.subtotal?.toFixed(2)}</span>
              </div>
              {order.orderType === 'DELIVERY' && (
                <div className="flex justify-between">
                  <span className="text-gray-500">{t('checkout.deliveryFee')}</span>
                  <span className="text-gray-900">{order.freeDelivery ? t('whatsapp.free') : `$${order.deliveryFee?.toFixed(2)}`}</span>
                </div>
              )}
              {(order.tax ?? 0) > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-500">{t('checkout.tax')}</span>
                  <span className="text-gray-900">${order.tax?.toFixed(2)}</span>
                </div>
              )}
              {(order.discount ?? 0) > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-500">{t('checkout.discount')}</span>
                  <span className="text-green-600">-${order.discount?.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-base pt-1 border-t border-gray-100">
                <span className="text-gray-900">{t('checkout.total')}</span>
                <span className="text-primary-600">${order.total?.toFixed(2)}</span>
              </div>
            </div>

            {(order.guestName || order.guestPhone || order.guestEmail) && (
              <>
                <h3 className="text-sm font-semibold text-gray-700 mb-3 mt-4">{t('whatsapp.customer')}</h3>
                <div className="border-t border-gray-100 pt-3 space-y-1 text-sm">
                  {order.guestName && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">{t('checkout.fullName')}</span>
                      <span className="text-gray-900">{order.guestName}</span>
                    </div>
                  )}
                  {order.guestPhone && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">{t('whatsapp.phone')}</span>
                      <span className="text-gray-900">{order.guestPhone}</span>
                    </div>
                  )}
                  {order.guestEmail && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">{t('whatsapp.email')}</span>
                      <span className="text-gray-900">{order.guestEmail}</span>
                    </div>
                  )}
                </div>
              </>
            )}

            {order.orderType === 'DELIVERY' && order.address && (
              <>
                <h3 className="text-sm font-semibold text-gray-700 mb-3 mt-4">{t('whatsapp.address')}</h3>
                <div className="border-t border-gray-100 pt-3 text-sm">
                  <p className="text-gray-900">{order.address.line1}</p>
                  <p className="text-gray-500">{t('checkout.between')}: {order.address.line2}</p>
                  <p className="text-gray-500">{order.address.city}, {order.address.state} {order.address.zip}</p>
                  {order.address.zoneName && <p className="text-gray-500 mt-1">{t('whatsapp.zone')}: {order.address.zoneName}</p>}
                </div>
              </>
            )}

            {order.comment && (
              <>
                <h3 className="text-sm font-semibold text-gray-700 mb-3 mt-4">{t('whatsapp.note')}</h3>
                <div className="border-t border-gray-100 pt-3 text-sm">
                  <p className="text-gray-900 italic">{order.comment}</p>
                </div>
              </>
            )}

            {order.location && (
              <div className="mt-4 text-sm">
                <span className="text-gray-500">{t('whatsapp.pickup')}: </span>
                <span className="font-medium text-gray-900">{order.location.name}</span>
              </div>
            )}
          </div>
        )}

        <div className="flex justify-center gap-4 flex-wrap">
          <button
            onClick={handleWhatsApp}
            className="bg-green-500 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-green-600 transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 448 512">
              <path d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 68.1 27 106.1 27H380.9c45.5 0 82.6-35.5 82.6-79C463.5 145.7 426 97.1 380.9 97.1zM223.9 386c-54.2 0-104.1-21-141.7-57.7L57 463.9 76.3 387c48.7 40.8 114.1 65.6 184.8 65.6h.1c70.7 0 128.6-57.8 128.6-129.1 0-35.2-14.4-68.3-40-93.4c-25.2-25.1-59-40-93.9-40zM223.9 338c28.3 0 56.4-11.7 76.9-33.1l-5.1-18.5L256 263.1l-18.5-5.1C214 224.7 208 198.3 208 172c0-3.4-.6-6.8-.9-10.1C218.9 165.5 223.9 174.5 223.9 183c0 57.4-44.6 104.3-100.2 104.3H96.9C109.8 260.8 162 302 223.9 302z"/>
            </svg>
            {t('orderConfirmation.contactOnWhatsApp') || 'Contactar por WhatsApp'}
          </button>
          <Link
            to="/menu"
            className="bg-primary-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-primary-700 transition-colors"
          >
            {t('orderConfirmation.orderMore')}
          </Link>
          <Link
            to="/"
            className="border border-gray-300 text-gray-700 px-6 py-2.5 rounded-lg font-medium hover:bg-gray-50 transition-colors"
          >
            {t('notFound.backHome')}
          </Link>
        </div>
      </div>
  );
}
