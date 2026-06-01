const WHATSAPP_NUMBER = '5492213145362';
const DEFAULT_BASE_URL = 'https://kitchenasty.com';

interface OrderItem {
  quantity: number;
  name: string;
  options?: Array<{ name: string; value: string }>;
  comment?: string;
}

interface OrderData {
  id: string;
  orderNumber: string;
  orderType: string;
  paymentMethod?: string;
  subtotal?: number;
  deliveryFee?: number;
  tax?: number;
  discount?: number;
  total: number;
  items: OrderItem[];
  comment?: string;
  guestName?: string;
  guestPhone?: string;
  guestEmail?: string;
  freeDelivery?: boolean;
  address?: {
    line1: string;
    city: string;
    state: string;
    zip: string;
    zoneName?: string;
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
    const lines: string[] = [];
    lines.push(`${item.quantity}x ${item.name}`);
    if (optionsText) lines.push(`   ${optionsText}`);
    if (item.comment) lines.push(`   \u{1F4DD} ${item.comment}`);
    return lines.join('\n');
  }).join('\n');

  const paymentLabel = order.paymentMethod === 'STRIPE' ? t('whatsapp.stripe') :
    order.paymentMethod === 'PAYPAL' ? t('whatsapp.paypal') :
    order.paymentMethod === 'TRANSFER' ? t('whatsapp.transfer') : t('whatsapp.cash');

  const orderUrl = `${baseUrl}/order/${order.id}`;

  const lines: string[] = [];
  lines.push(`\u{1F6D2} *${t('whatsapp.title')}*`);
  lines.push(`\u{1F4E6} *${t('whatsapp.order')}:* ${order.orderNumber}`);
  lines.push(`\u{1F4CD} *${t('whatsapp.type')}:* ${orderType === 'delivery' ? t('whatsapp.delivery') : t('whatsapp.pickup')}`);
  lines.push(`\u{1F4B3} *${t('whatsapp.payment')}:* ${paymentLabel}`);

  lines.push('');
  lines.push(`\u{1F37D} *${t('whatsapp.items')}:*`);
  lines.push(itemsText);

  if (order.comment) {
    lines.push('');
    lines.push(`\u{1F4DD} *${t('whatsapp.note')}:* ${order.comment}`);
  }

  lines.push('');
  lines.push(`\u{1F4B0} *${t('whatsapp.subtotal')}:* $${(order.subtotal ?? 0).toFixed(2)}`);

  if (orderType === 'delivery') {
    const deliveryLabel = order.freeDelivery ? t('whatsapp.freeDelivery') : t('whatsapp.deliveryFee');
    const deliveryAmount = order.freeDelivery ? t('whatsapp.free') : `$${(order.deliveryFee ?? 0).toFixed(2)}`;
    lines.push(`\u{1F697} *${deliveryLabel}:* ${deliveryAmount}`);

    if (order.address?.zoneName) {
      lines.push(`\u{1F4CD} *${t('whatsapp.zone')}:* ${order.address.zoneName}`);
    }
  }

  if ((order.tax ?? 0) > 0) {
    lines.push(`\u{1F3DB} *${t('whatsapp.tax')}:* $${order.tax!.toFixed(2)}`);
  }

  if ((order.discount ?? 0) > 0) {
    lines.push(`\u{1F381} *${t('whatsapp.discount')}:* -$${order.discount!.toFixed(2)}`);
  }

  lines.push(`\u{1F4B5} *${t('whatsapp.total')}:* $${order.total.toFixed(2)}`);

  lines.push('');
  lines.push(`\u{1F464} *${t('whatsapp.customer')}:* ${order.guestName || t('whatsapp.na')}`);
  lines.push(`\u{1F4DE} *${t('whatsapp.phone')}:* ${order.guestPhone || t('whatsapp.na')}`);
  if (order.guestEmail) {
    lines.push(`\u{1F4E7} *${t('whatsapp.email')}:* ${order.guestEmail}`);
  }

  if (orderType === 'delivery' && order.address) {
    lines.push(`\u{1F4CD} *${t('whatsapp.address')}:* ${order.address.line1}, ${order.address.city}, ${order.address.state} ${order.address.zip}`);
  }

  lines.push('');
  lines.push(`\u{1F517} *${t('whatsapp.viewOrder')}:* ${orderUrl}`);

  return lines.join('\n').normalize('NFC');
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
