export const translations = {
  es: {
    orderInvoice: 'Factura del Pedido',
    customer: 'Cliente',
    guest: 'Invitado',
    phone: 'Teléfono',
    address: 'Dirección',
    addressLine2: 'Entre calles',
    between: 'Entre',
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
    addressLine2: 'Between streets',
    between: 'Between',
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

export function t(key: string): string {
  const lang = 'es' as const;
  return (translations[lang] as Record<string, string>)[key] || (translations.en as Record<string, string>)[key] || key;
}

export function translatePaymentMethod(method: string | null): string {
  if (!method) return '';
  return t(method) || method;
}
