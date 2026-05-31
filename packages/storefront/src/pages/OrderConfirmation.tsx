import { useState, useEffect, useCallback } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { io } from 'socket.io-client';
import { getWhatsAppUrl } from '../utils/whatsapp.js';
import { useAuth } from '../context/AuthContext.js';

interface OrderData {
  id: string;
  orderNumber: string;
  orderType: string;
  status?: string;
  subtotal?: number;
  total: number;
  items: Array<{ quantity: number; name: string; options?: Array<{ name: string; value: string }> }>;
  comment?: string;
  [key: string]: unknown;
}

export default function OrderConfirmation() {
  const { t } = useTranslation();
  const { id } = useParams();
  const location = useLocation();
  const { token } = useAuth();
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load order');
    } finally {
      setLoading(false);
    }
  }, [id, token]);

  useEffect(() => {
    fetchOrder();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!id) return;

    const socket = io({ path: '/socket.io', transports: ['websocket', 'polling'] });

    socket.emit('join:order', id);

    socket.on('order:statusUpdate', (data: { id: string; status: string }) => {
      if (data.id === id) {
        setOrder((prev) => prev ? { ...prev, status: data.status } : prev);
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
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">{t('checkout.orderType')}</span>
              <p className="font-medium text-gray-900">{order.orderType}</p>
            </div>
            <div>
              <span className="text-gray-500">{t('orders.status')}</span>
              <p className="font-medium text-gray-900">{order.status}</p>
            </div>
            <div>
              <span className="text-gray-500">{t('checkout.subtotal')}</span>
              <p className="font-medium text-gray-900">${order.subtotal?.toFixed(2)}</p>
            </div>
            <div>
              <span className="text-gray-500">{t('checkout.total')}</span>
              <p className="font-bold text-primary-600">${order.total?.toFixed(2)}</p>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-center gap-4 flex-wrap">
        <button
          onClick={handleWhatsApp}
          className="bg-green-500 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-green-600 transition-colors flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
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
