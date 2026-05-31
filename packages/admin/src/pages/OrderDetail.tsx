import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { t } from '../utils/i18n';

interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  comment: string | null;
  options: { id: string; name: string; value: string; priceModifier: number }[];
}

interface OrderAddress {
  id: string;
  label: string;
  line1: string;
  line2: string | null;
  city: string;
  state: string | null;
  zip: string;
  instructions: string | null;
}

interface OrderDetail {
  id: string;
  orderNumber: string;
  orderType: string;
  status: string;
  subtotal: number;
  tax: number;
  deliveryFee: number;
  discount: number;
  total: number;
  comment: string | null;
  scheduledAt: string | null;
  createdAt: string;
  paymentMethod: string | null;
  customer: { id: string; name: string; email: string; phone: string | null } | null;
  guestName: string | null;
  guestEmail: string | null;
  guestPhone: string | null;
  location: { id: string; name: string };
  address: OrderAddress | null;
  items: OrderItem[];
}

interface Settings {
  siteName: string;
  logo: string | null;
}

const STATUSES = [
  'PENDING', 'CONFIRMED', 'PREPARING', 'READY',
  'OUT_FOR_DELIVERY', 'DELIVERED', 'PICKED_UP', 'CANCELLED',
];

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  CONFIRMED: 'bg-blue-100 text-blue-800',
  PREPARING: 'bg-purple-100 text-purple-800',
  READY: 'bg-green-100 text-green-800',
  OUT_FOR_DELIVERY: 'bg-indigo-100 text-indigo-800',
  DELIVERED: 'bg-green-200 text-green-900',
  PICKED_UP: 'bg-green-200 text-green-900',
  CANCELLED: 'bg-red-100 text-red-800',
};

export default function OrderDetailPage() {
  const { id } = useParams();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updating, setUpdating] = useState(false);

  const token = localStorage.getItem('token') || '';
  const [settings, setSettings] = useState<Settings>({ siteName: 'KitchenAsty', logo: null });

  useEffect(() => {
    fetch('/api/settings')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data) {
          setSettings({ siteName: data.data.siteName, logo: data.data.logo });
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch(`/api/orders/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load order');
        return res.json();
      })
      .then((data) => setOrder(data.data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id, token]);

  async function updateStatus(newStatus: string) {
    setUpdating(true);
    try {
      const res = await fetch(`/api/orders/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setOrder((prev) => prev ? { ...prev, status: newStatus } : prev);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUpdating(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" role="status" aria-label="Loading" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div>
        <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-4">{error || 'Order not found'}</div>
        <Link to="/orders" className="text-primary-600 hover:text-primary-700 text-sm">
          Back to Orders
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <Link to="/orders" className="text-gray-400 hover:text-gray-600" aria-label="Back to orders">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Order {order.orderNumber}</h1>
          <p className="text-sm text-gray-500">
            {new Date(order.createdAt).toLocaleString()}
          </p>
        </div>
        <span className={`ml-auto text-sm px-3 py-1 rounded-full font-medium ${STATUS_COLORS[order.status] || 'bg-gray-100'}`}>
          {order.status.replace(/_/g, ' ')}
        </span>
        <button
          onClick={() => window.print()}
          className="ml-2 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          {t('printInvoice')}
        </button>
      </div>

      <style>{`
          @page {
            size: 80mm auto;
            margin: 0;
          }
          @media print {
            body * { visibility: hidden; }
            #print-invoice, #print-invoice * { visibility: visible; }
            #print-invoice { 
              position: absolute; 
              left: 0; 
              top: 0; 
              width: 80mm;
              padding: 2mm;
              font-size: 11px;
              line-height: 1.2;
            }
            .no-print { display: none !important; }
          }
        `}</style>

      {/* Print-only Invoice */}
      <div id="print-invoice" className="hidden print:block" style={{ width: '72mm', margin: '0 auto' }}>
        <div className="text-center mb-2">
          {settings.logo && <img src={settings.logo} alt="Logo" style={{ height: '20mm', marginBottom: '2mm', display: 'block', marginLeft: 'auto', marginRight: 'auto' }} />}
          <h1 style={{ fontSize: '14px', fontWeight: 'bold', margin: '2px 0' }}>{settings.siteName}</h1>
          <p style={{ fontSize: '10px', margin: '2px 0' }}>{t('orderInvoice')}</p>
        </div>

        <div style={{ borderTop: '1px dashed #000', borderBottom: '1px dashed #000', padding: '2mm 0', margin: '2mm 0' }}>
          <p style={{ fontSize: '10px', margin: '1px 0' }}><strong>{t('customer')}:</strong> {order.customer?.name || order.guestName || t('guest')}</p>
          {(order.customer?.phone || order.guestPhone) && <p style={{ fontSize: '10px', margin: '1px 0' }}>{order.customer?.phone || order.guestPhone}</p>}
          <p style={{ fontSize: '10px', margin: '1px 0' }}><strong>{t('orderType')}:</strong> {order.orderType} - {order.location.name}</p>
          <p style={{ fontSize: '10px', margin: '1px 0' }}>{new Date(order.createdAt).toLocaleString()}</p>
          {order.scheduledAt && <p style={{ fontSize: '10px', margin: '1px 0' }}><strong>{t('scheduledFor')}:</strong> {new Date(order.scheduledAt).toLocaleString()}</p>}
        </div>

        {order.orderType === 'DELIVERY' && order.address && (
          <div style={{ padding: '1mm 0' }}>
            <p style={{ fontSize: '10px', margin: '1px 0' }}><strong>{t('deliveryAddress')}:</strong></p>
            <p style={{ fontSize: '10px', margin: '1px 0' }}>{order.address.line1}</p>
            {order.address.line2 && <p style={{ fontSize: '10px', margin: '1px 0' }}>{order.address.line2}</p>}
            <p style={{ fontSize: '10px', margin: '1px 0' }}>{order.address.city}{order.address.state ? `, ${order.address.state}` : ''} {order.address.zip}</p>
            {order.address.instructions && <p style={{ fontSize: '10px', margin: '1px 0', fontStyle: 'italic' }}>{t('note')}: {order.address.instructions}</p>}
          </div>
        )}

        <div style={{ borderBottom: '1px dashed #000', paddingBottom: '1mm', marginBottom: '1mm' }}>
          <p style={{ fontSize: '10px', fontWeight: 'bold', margin: '2px 0', textAlign: 'center' }}>================</p>
        </div>

        <table style={{ width: '100%', fontSize: '10px', marginBottom: '2mm' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #000' }}>
              <th style={{ textAlign: 'left', padding: '1px 0' }}>{t('item')}</th>
              <th style={{ textAlign: 'center', width: '10mm' }}>{t('qty')}</th>
              <th style={{ textAlign: 'right', width: '18mm' }}>{t('total')}</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item) => (
              <tr key={item.id} style={{ verticalAlign: 'top' }}>
                <td style={{ padding: '1px 0' }}>
                  {item.quantity}x {item.name}
                  {item.options.length > 0 && (
                    <span style={{ display: 'block', fontSize: '9px', color: '#666' }}>
                      {item.options.map((o) => `${o.name}: ${o.value}`).join(', ')}
                    </span>
                  )}
                  {item.comment && <span style={{ display: 'block', fontSize: '9px', fontStyle: 'italic' }}>{t('note')}: {item.comment}</span>}
                </td>
                <td style={{ textAlign: 'center' }}>{item.quantity}</td>
                <td style={{ textAlign: 'right' }}>${item.subtotal.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ borderTop: '1px dashed #000', paddingTop: '1mm', marginTop: '1mm' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', margin: '1px 0' }}>
            <span>{t('subtotal')}</span>
            <span>${order.subtotal.toFixed(2)}</span>
          </div>
          {order.discount > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#008800', margin: '1px 0' }}>
              <span>{t('discount')}</span>
              <span>-${order.discount.toFixed(2)}</span>
            </div>
          )}
          {order.deliveryFee > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', margin: '1px 0' }}>
              <span>{t('deliveryFee')}</span>
              <span>${order.deliveryFee.toFixed(2)}</span>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', margin: '1px 0' }}>
            <span>{t('tax')}</span>
            <span>${order.tax.toFixed(2)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 'bold', margin: '2px 0', borderTop: '1px solid #000', paddingTop: '2px' }}>
            <span>{t('total')}</span>
            <span>${order.total.toFixed(2)}</span>
          </div>
        </div>

        {order.paymentMethod && (
          <div style={{ marginTop: '2mm', paddingTop: '1mm', borderTop: '1px dashed #000' }}>
            <p style={{ fontSize: '10px', margin: '1px 0' }}><strong>{t('paymentMethod')}:</strong> {order.paymentMethod}</p>
          </div>
        )}

        {order.comment && (
          <div style={{ marginTop: '1mm' }}>
            <p style={{ fontSize: '10px', margin: '1px 0' }}><strong>{t('orderNotes')}:</strong> {order.comment}</p>
          </div>
        )}

        <p style={{ fontSize: '10px', textAlign: 'center', marginTop: '3mm' }}>================</p>
        <p style={{ fontSize: '9px', textAlign: 'center', margin: '1px 0' }}>#{order.orderNumber}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 no-print">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Items */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Items</h2>
            <div className="space-y-3">
              {order.items.map((item) => (
                <div key={item.id} className="flex justify-between items-start py-2 border-b border-gray-100 last:border-0">
                  <div>
                    <div className="font-medium text-gray-900">
                      <span className="text-gray-400 mr-1">{item.quantity}x</span>
                      {item.name}
                    </div>
                    {item.options.length > 0 && (
                      <div className="text-xs text-gray-500 mt-0.5">
                        {item.options.map((o) => `${o.name}: ${o.value}`).join(', ')}
                      </div>
                    )}
                    {item.comment && (
                      <div className="text-xs text-gray-400 mt-0.5 italic">Note: {item.comment}</div>
                    )}
                  </div>
                  <span className="font-medium text-gray-900">${item.subtotal.toFixed(2)}</span>
                </div>
              ))}
            </div>

            <div className="border-t border-gray-200 mt-4 pt-4 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal</span>
                <span>${order.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Tax</span>
                <span>${order.tax.toFixed(2)}</span>
              </div>
              {order.deliveryFee > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Delivery Fee</span>
                  <span>${order.deliveryFee.toFixed(2)}</span>
                </div>
              )}
              {order.discount > 0 && (
                <div className="flex justify-between text-green-600">
<span>{t('discount')}</span>
                  <span>-${order.discount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-base pt-2 border-t border-gray-200">
<span>{t('total')}</span>
                <span className="text-primary-600">${order.total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          {order.comment && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Order Notes</h2>
              <p className="text-gray-600 text-sm">{order.comment}</p>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6 no-print">
          {/* Status update */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Update Status</h2>
            <div className="space-y-2">
              {STATUSES.map((status) => (
                <button
                  key={status}
                  disabled={updating || order.status === status}
                  onClick={() => updateStatus(status)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${order.status === status
                      ? STATUS_COLORS[status] + ' cursor-default'
                      : 'text-gray-600 hover:bg-gray-100 disabled:opacity-40'
                    }`}
                  aria-label={`Set status to ${status.replace(/_/g, ' ')}`}
                >
                  {status.replace(/_/g, ' ')}
                </button>
              ))}
            </div>
          </div>

          {/* Order info */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Details</h2>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-gray-500">Order Type</dt>
                <dd className="font-medium text-gray-900">{order.orderType}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Location</dt>
                <dd className="font-medium text-gray-900">{order.location.name}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Customer</dt>
                <dd className="font-medium text-gray-900">
                  {order.customer ? (
                    <>
                      {order.customer.name}
                      <span className="block text-xs text-gray-400">{order.customer.email}</span>
                      {order.customer.phone && (
                        <span className="block text-xs text-gray-400">{order.customer.phone}</span>
                      )}
                    </>
                  ) : order.guestName ? (
                    <>
                      {order.guestName}
                      {order.guestPhone && (
                        <span className="block text-xs text-gray-400">{order.guestPhone}</span>
                      )}
                      {order.guestEmail && (
                        <span className="block text-xs text-gray-400">{order.guestEmail}</span>
                      )}
                    </>
                  ) : (
                    <span className="text-gray-400">Guest</span>
                  )}
                </dd>
              </div>
              {order.orderType === 'DELIVERY' && order.address && (
                <div>
                  <dt className="text-gray-500">Delivery Address</dt>
                  <dd className="font-medium text-gray-900">
                    {order.address.line1}
                    {order.address.line2 && <>, {order.address.line2}</>}
                    <span className="block text-xs text-gray-400">
                      {order.address.city}{order.address.state ? `, ${order.address.state}` : ''} {order.address.zip}
                    </span>
                  </dd>
                </div>
              )}
              {order.scheduledAt && (
                <div>
                  <dt className="text-gray-500">Scheduled For</dt>
                  <dd className="font-medium text-gray-900">
                    {new Date(order.scheduledAt).toLocaleString()}
                  </dd>
                </div>
              )}
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}
