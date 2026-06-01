type TranslationKey = 'orderInvoice' | 'customer' | 'guest' | 'phone' | 'address' | 'zone' | 'orderType' | 'deliveryAddress' | 'scheduledFor' | 'item' | 'qty' | 'price' | 'total' | 'subtotal' | 'discount' | 'deliveryFee' | 'tax' | 'paymentMethod' | 'orderNotes' | 'note' | 'printInvoice' | 'CASH' | 'STRIPE' | 'PAYPAL' | 'TRANSFER';

import { t, translatePaymentMethod } from '../utils/i18n';

interface PrintInvoiceProps {
  order: {
    orderNumber: string;
    orderType: string;
    subtotal: number;
    tax: number;
    deliveryFee: number;
    deliveryZoneName: string | null;
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
    address: { line1: string; line2: string | null; city: string; state: string | null; zip: string; instructions: string | null } | null;
    items: {
      id: string;
      name: string;
      quantity: number;
      subtotal: number;
      comment: string | null;
      options: { name: string; value: string }[];
    }[];
  };
  settings: {
    siteName: string;
    logo: string | null;
  };
  t: (key: TranslationKey) => string;
}

export default function PrintInvoice({ order, settings, t }: PrintInvoiceProps) {
  return (
    <>
      <style>{`
        @page {
          size: 105mm auto;
          margin: 0;
        }
        @media print {
          body * { visibility: hidden; }
          #print-invoice, #print-invoice * { visibility: visible; }
          #print-invoice {
            position: absolute;
            left: 0;
            top: 0;
            width: 100mm;
            padding: 2mm;
            font-size: 13px;
            line-height: 1.3;
          }
          .no-print { display: none !important; }
        }
      `}</style>

      <div id="print-invoice" className="hidden print:block" style={{ width: '100mm', margin: '0 auto' }}>
        <div className="text-center mb-2">
          {settings.logo && <img src={settings.logo} alt="Logo" style={{ height: '20mm', marginBottom: '2mm', display: 'block', marginLeft: 'auto', marginRight: 'auto' }} />}
          <h1 style={{ fontSize: '16px', fontWeight: 'bold', margin: '2px 0' }}>{settings.siteName}</h1>
          <p style={{ fontSize: '12px', margin: '2px 0' }}>{t('orderInvoice')}</p>
        </div>

        <div style={{ borderTop: '1px dashed #000', borderBottom: '1px dashed #000', padding: '2mm 0', margin: '2mm 0' }}>
          <p style={{ fontSize: '12px', margin: '1px 0' }}>{t('customer')}: {order.customer?.name || order.guestName || t('guest')}</p>
          {(order.customer?.phone || order.guestPhone) && (
            <p style={{ fontSize: '12px', margin: '1px 0' }}>{t('phone')}: {order.customer?.phone || order.guestPhone}</p>
          )}
          {order.orderType === 'DELIVERY' && order.address && (
            <>
              <p style={{ fontSize: '12px', margin: '1px 0' }}>{t('address')}: {order.address.line1}</p>
              {order.address.line2 && <p style={{ fontSize: '12px', margin: '1px 0' }}>{order.address.line2}</p>}
              <p style={{ fontSize: '12px', margin: '1px 0' }}>
                {order.address.city}{order.address.state ? `, ${order.address.state}` : ''} {order.address.zip}
              </p>
              {order.deliveryZoneName && (
                <p style={{ fontSize: '12px', margin: '1px 0' }}>{t('zone')}: {order.deliveryZoneName} (${order.deliveryFee.toFixed(2)})</p>
              )}
            </>
          )}
          <p style={{ fontSize: '12px', margin: '1px 0' }}>{t('orderType')}: {order.orderType} - {order.location.name}</p>
          <p style={{ fontSize: '12px', margin: '1px 0' }}>{new Date(order.createdAt).toLocaleString()}</p>
          {order.scheduledAt && (
            <p style={{ fontSize: '12px', margin: '1px 0' }}>{t('scheduledFor')}: {new Date(order.scheduledAt).toLocaleString()}</p>
          )}
        </div>

        <div style={{ borderBottom: '1px dashed #000', paddingBottom: '1mm', marginBottom: '1mm' }}>
          <p style={{ fontSize: '12px', fontWeight: 'bold', margin: '2px 0', textAlign: 'center' }}>================</p>
        </div>

        <table style={{ width: '100%', fontSize: '12px', marginBottom: '2mm' }}>
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
                    <span style={{ display: 'block', fontSize: '10px' }}>
                      {item.options.map((o) => `${o.name}: ${o.value}`).join(', ')}
                    </span>
                  )}
                  {item.comment && (
                    <span style={{ display: 'block', fontSize: '10px', fontStyle: 'italic' }}>{t('note')}: {item.comment}</span>
                  )}
                </td>
                <td style={{ textAlign: 'center' }}>{item.quantity}</td>
                <td style={{ textAlign: 'right' }}>${item.subtotal.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ borderTop: '1px dashed #000', paddingTop: '1mm', marginTop: '1mm' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', margin: '1px 0' }}>
            <span>{t('subtotal')}</span>
            <span>${order.subtotal.toFixed(2)}</span>
          </div>
          {order.discount > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#008800', margin: '1px 0' }}>
              <span>{t('discount')}</span>
              <span>-${order.discount.toFixed(2)}</span>
            </div>
          )}
          {order.deliveryFee > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', margin: '1px 0' }}>
              <span>{t('deliveryFee')}</span>
              <span>${order.deliveryFee.toFixed(2)}</span>
            </div>
          )}
          {order.tax > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', margin: '1px 0' }}>
              <span>{t('tax')}</span>
              <span>${order.tax.toFixed(2)}</span>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 'bold', margin: '2px 0', borderTop: '1px solid #000', paddingTop: '2px' }}>
            <span>{t('total')}</span>
            <span>${order.total.toFixed(2)}</span>
          </div>
        </div>

        {order.paymentMethod && (
          <div style={{ marginTop: '2mm', paddingTop: '1mm', borderTop: '1px dashed #000' }}>
            <p style={{ fontSize: '12px', margin: '1px 0' }}>{t('paymentMethod')}: {translatePaymentMethod(order.paymentMethod)}</p>
          </div>
        )}

        {order.comment && (
          <div style={{ marginTop: '1mm' }}>
            <p style={{ fontSize: '12px', margin: '1px 0' }}><strong>{t('orderNotes')}:</strong> {order.comment}</p>
          </div>
        )}

        <p style={{ fontSize: '12px', textAlign: 'center', marginTop: '3mm' }}>================</p>
        <p style={{ fontSize: '11px', textAlign: 'center', margin: '1px 0' }}>#{order.orderNumber}</p>
      </div>
    </>
  );
}