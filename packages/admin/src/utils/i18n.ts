export const translations = {
  es: {
    orderInvoice: 'Factura del Pedido',
    customer: 'Cliente',
    guest: 'Invitado',
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
  },
  en: {
    orderInvoice: 'Order Invoice',
    customer: 'Customer',
    guest: 'Guest',
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
  },
};

type TranslationKey = keyof typeof translations.en;

export function t(key: TranslationKey): string {
  const lang = 'es';
  return translations[lang][key] || translations.en[key] || key;
}
