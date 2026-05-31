const WHATSAPP_NUMBER = '5492213145362';
const DEFAULT_BASE_URL = 'https://kitchenasty.com';

interface OrderItem {
  quantity: number;
  name: string;
  options?: Array<{ name: string; value: string }>;
}

interface OrderData {
  id: string;
  orderNumber: string;
  orderType: string;
  paymentMethod?: string;
  total: number;
  items: OrderItem[];
  comment?: string;
  guestName?: string;
  guestPhone?: string;
  guestEmail?: string;
  address?: {
    line1: string;
    city: string;
    state: string;
    zip: string;
  };
}

type TranslateFunction = (key: string) => string;

export function buildWhatsAppMessage(
  order: OrderData,
  orderType: 'delivery' | 'pickup',
  t: TranslateFunction,
  baseUrl: string = DEFAULT_BASE_URL
): string {
  const itemsText = order.items.map((item) => {
    const optionsText = item.options?.map((o) => `${o.name}: ${o.value}`).join(', ') || '';
    return `${item.quantity}x ${item.name}${optionsText ? ` (${optionsText})` : ''}`;
  }).join('\n');

  const paymentLabel = order.paymentMethod === 'STRIPE' ? t('whatsapp.stripe') :
    order.paymentMethod === 'PAYPAL' ? t('whatsapp.paypal') : t('whatsapp.cash');

  const orderUrl = `${baseUrl}/orders/${order.orderNumber}`;

  const message =
    `🛒 *${t('whatsapp.title')}*\n\n` +
    `📦 *${t('whatsapp.order')}:* ${order.orderNumber}\n` +
    `📍 *${t('whatsapp.type')}:* ${orderType === 'delivery' ? t('whatsapp.delivery') : t('whatsapp.pickup')}\n` +
    `💳 *${t('whatsapp.payment')}:* ${paymentLabel}\n` +
    `💰 *${t('whatsapp.total')}:* $${order.total.toFixed(2)}\n\n` +
    `🍽️ *${t('whatsapp.items')}:*\n${itemsText}\n\n` +
    (order.comment ? `📝 *${t('whatsapp.note')}:* ${order.comment}\n\n` : '') +
    `👤 *${t('whatsapp.customer')}:* ${order.guestName || t('whatsapp.na')}\n` +
    `📞 *${t('whatsapp.phone')}:* ${order.guestPhone || t('whatsapp.na')}\n` +
    (order.guestEmail ? `📧 *${t('whatsapp.email')}:* ${order.guestEmail}\n\n` : '\n') +
    (orderType === 'delivery' && order.address ? `📍 *${t('whatsapp.address')}:* ${order.address.line1}, ${order.address.city}, ${order.address.state} ${order.address.zip}\n\n` : '\n') +
    `🔗 *${t('whatsapp.viewOrder')}:* ${orderUrl}`;

  return message;
}

export function getWhatsAppUrl(
  order: OrderData,
  orderType: 'delivery' | 'pickup',
  t: TranslateFunction,
  baseUrl: string = DEFAULT_BASE_URL
): string {
  const message = buildWhatsAppMessage(order, orderType, t, baseUrl);
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

export { WHATSAPP_NUMBER };