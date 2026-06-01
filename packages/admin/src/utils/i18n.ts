export const translations = {
  es: {
    orderInvoice: 'Factura del Pedido',
    customer: 'Cliente',
    guest: 'Invitado',
    phone: 'Teléfono',
    address: 'Dirección',
    zone: 'Zona',
    orderType: 'Tipo de Pedido',
    deliveryAddress: 'Dirección de Entrega',
    scheduledFor: 'Programado para',
    item: 'Artículo',
    qty: 'Cant',
    price: 'Precio',
    total: 'Total',
    subtotal: 'Subtotal',
    discount: 'Descuento',
    deliveryFee: 'Costo de Envío',
    tax: 'Impuesto',
    paymentMethod: 'Método de Pago',
    orderNotes: 'Notas del Pedido',
    note: 'Nota',
    printInvoice: 'Imprimir Factura',
    CASH: 'Efectivo',
    STRIPE: 'Tarjeta',
    PAYPAL: 'PayPal',
    TRANSFER: 'Transferencia',
  },
  en: {
    orderInvoice: 'Order Invoice',
    customer: 'Customer',
    guest: 'Guest',
    phone: 'Phone',
    address: 'Address',
    zone: 'Zone',
    orderType: 'Order Type',
    deliveryAddress: 'Delivery Address',
    scheduledFor: 'Scheduled For',
    item: 'Item',
    qty: 'Qty',
    price: 'Price',
    total: 'Total',
    subtotal: 'Subtotal',
    discount: 'Discount',
    deliveryFee: 'Delivery Fee',
    tax: 'Tax',
    paymentMethod: 'Payment Method',
    orderNotes: 'Order Notes',
    note: 'Note',
    printInvoice: 'Print Invoice',
    CASH: 'Cash',
    STRIPE: 'Card',
    PAYPAL: 'PayPal',
    TRANSFER: 'Transfer',
  },
};

type TranslationKey = keyof typeof translations.en;

export function t(key: TranslationKey): string {
  const lang = 'es';
  return translations[lang][key] || translations.en[key] || key;
}

export function translatePaymentMethod(method: string | null): string {
  if (!method) return '';
  return t(method as TranslationKey) || method;
}
