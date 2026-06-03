import { useState, useEffect, useRef, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useCart, useToast } from '../context/CartContext.js';
import { useAuth } from '../context/AuthContext.js';
import { getWhatsAppUrl } from '../utils/whatsapp.js';

type OrderType = 'delivery' | 'pickup';
type PaymentMethod = 'CASH' | 'STRIPE' | 'PAYPAL' | 'TRANSFER';

export default function Checkout() {
  const { t } = useTranslation();
  const { items, subtotal, clear } = useCart();
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [orderType, setOrderType] = useState<OrderType>('delivery');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [address, setAddress] = useState(() => {
    const saved = localStorage.getItem('checkoutAddress');
    return saved ? JSON.parse(saved) : { line1: '', line2: '', city: 'La Plata', state: 'La Plata', zip: '1900' };
  });
  const [scheduledAt, setScheduledAt] = useState('');
  const [comment, setComment] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponFreeDelivery, setCouponFreeDelivery] = useState(false);
  const [couponError, setCouponError] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [paymentSettings, setPaymentSettings] = useState({ stripeEnabled: false, paypalEnabled: false, cashEnabled: true, transferEnabled: true });

  // Guest checkout fields
  const [guestName, setGuestName] = useState(() => localStorage.getItem('checkoutGuestName') || '');
  const [guestEmail, setGuestEmail] = useState(() => localStorage.getItem('checkoutGuestEmail') || '');
  const [guestPhone, setGuestPhone] = useState(() => localStorage.getItem('checkoutGuestPhone') || '');

  // Dynamic delivery fee from zone check
  const [deliveryFee, setDeliveryFee] = useState(4.99);
  const [zoneError, setZoneError] = useState('');

  // Refs for focus management
  const guestNameRef = useRef<HTMLInputElement>(null);
  const guestPhoneRef = useRef<HTMLInputElement>(null);
  const addressLine1Ref = useRef<HTMLInputElement>(null);
  const cityRef = useRef<HTMLInputElement>(null);
  const stateRef = useRef<HTMLInputElement>(null);
  const zipRef = useRef<HTMLInputElement>(null);
  const zoneRef = useRef<HTMLSelectElement>(null);

  // Busy mode
  const [isBusy, setIsBusy] = useState(false);
  const [busyMessage, setBusyMessage] = useState('');

  // Loyalty points
  const [loyaltyBalance, setLoyaltyBalance] = useState(0);
  const [loyaltyRedeem, setLoyaltyRedeem] = useState(0);
  const loyaltyDiscount = loyaltyRedeem / 100;

  // Delivery zones
  const [availableZones, setAvailableZones] = useState<{ id: string; name: string; charge: number; minOrder: number; isActive: boolean }[]>([]);
  const [selectedZoneId, setSelectedZoneId] = useState('');

  // Coupon apply handler
  async function handleApplyCoupon() {
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    setCouponError('');
    try {
      const res = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: couponCode.trim(), subtotal }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        setCouponDiscount(data.data.discount);
        setCouponFreeDelivery(data.data.freeDelivery);
        showToast('checkout.couponAppliedSuccess', {}, 'info');
      } else {
        setCouponError(data.error || 'Invalid coupon');
        setCouponDiscount(0);
        setCouponFreeDelivery(false);
      }
    } catch {
      setCouponError('Failed to validate coupon');
      setCouponDiscount(0);
      setCouponFreeDelivery(false);
    } finally {
      setCouponLoading(false);
    }
  }

  const [tax, setTax] = useState(0);
  const [taxRate, setTaxRate] = useState(0);
  const estimatedTax = subtotal * (taxRate / 100);
  const displayTax = tax > 0 ? tax : estimatedTax;

  useEffect(() => {
    if (items.length === 0) setTax(0);
  }, [items.length]);
  const currentDeliveryFee = orderType === 'delivery' && !couponFreeDelivery ? deliveryFee : 0;
  const total = subtotal + displayTax + currentDeliveryFee - loyaltyDiscount - couponDiscount;

  // Check busy mode + fetch delivery zones on mount
  useEffect(() => {
    fetch('/api/locations')
      .then((res) => res.json())
      .then((data) => {
        const loc = data.data?.[0];
        if (loc?.isBusy) {
          setIsBusy(true);
          setBusyMessage(loc.busyMessage || 'This location is currently not accepting orders.');
        }
        if (loc?.id) {
          fetch(`/api/locations/${loc.id}/delivery-zones`)
            .then((res) => res.json())
            .then((zonesData) => {
              if (zonesData.success) {
                setAvailableZones(zonesData.data.filter((z: any) => z.isActive));
              }
            })
            .catch(() => {});
        }
      })
      .catch(() => {});
  }, []);

  // Fetch payment settings
  useEffect(() => {
    fetch('/api/settings/payment/public')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data) {
          setPaymentSettings({
            stripeEnabled: data.data.stripeEnabled || false,
            paypalEnabled: data.data.paypalEnabled || false,
            cashEnabled: data.data.cashEnabled ?? true,
            transferEnabled: data.data.transferEnabled ?? true,
          });
        }
      })
      .catch(() => {});
  }, []);

  // Fetch tax rate from settings
  useEffect(() => {
    fetch('/api/settings/order')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data?.taxRate) {
          setTaxRate(data.data.taxRate);
        }
      })
      .catch(() => {});
  }, []);

  // Fetch loyalty balance for logged-in users
  useEffect(() => {
    if (token) {
      fetch('/api/loyalty/balance', {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.success) setLoyaltyBalance(data.data.points);
        })
        .catch(() => {});
    }
  }, [token]);

  if (items.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">{t('checkout.emptyCart')}</h1>
        <Link
          to="/menu"
          className="inline-block bg-primary-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-primary-700 transition-colors"
        >
          {t('checkout.browseMenu')}
        </Link>
      </div>
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const orderItems = items.map((item) => ({
        menuItemId: item.menuItemId,
        quantity: item.quantity,
        comment: item.comment,
        options: item.options.map((o) => ({
          menuOptionValueId: o.valueId,
          name: o.optionName,
          value: o.valueName,
          priceModifier: o.priceModifier,
        })),
      }));

      const body: Record<string, unknown> = {
        orderType: orderType.toUpperCase(),
        paymentMethod,
        items: orderItems,
        comment: comment || undefined,
        scheduledAt: scheduledAt || undefined,
      };

      if (couponDiscount > 0 || couponFreeDelivery) {
        body.couponCode = couponCode.trim().toUpperCase();
      }

      if (orderType === 'delivery') {
        (document.activeElement as HTMLElement)?.blur();
        if (!selectedZoneId) {
          setError(t('checkout.selectZoneError'));
          setLoading(false);
          showToast('checkout.selectZoneError');
          setTimeout(() => {
            const section = document.getElementById('delivery-address-section');
            section?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            zoneRef.current?.focus();
            if (zoneRef.current?.showPicker) {
              zoneRef.current.showPicker();
            }
          }, 100);
          return;
        }
        const selectedZone = availableZones.find((z) => z.id === selectedZoneId);
        if (selectedZone && subtotal < selectedZone.minOrder) {
          setError(`${t('checkout.minOrderError')} ${selectedZone.name}: $${selectedZone.minOrder.toFixed(2)}`);
          setLoading(false);
          showToast('checkout.minOrderError');
          setTimeout(() => {
            const section = document.getElementById('delivery-address-section');
            section?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            zoneRef.current?.focus();
            if (zoneRef.current?.showPicker) {
              zoneRef.current.showPicker();
            }
          }, 100);
          return;
        }
        if (!address.line1.trim()) {
          setError(t('checkout.addressRequired'));
          setLoading(false);
          showToast('checkout.addressRequired');
          setTimeout(() => {
            addressLine1Ref.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            addressLine1Ref.current?.focus();
          }, 100);
          return;
        }
        if (!address.line2.trim()) {
          setError(t('checkout.addressLine2Required') || 'Address line 2 is required');
          setLoading(false);
          showToast('checkout.addressLine2Required');
          setTimeout(() => {
            document.getElementById('address-line2')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            document.getElementById('address-line2')?.focus();
          }, 100);
          return;
        }
        if (!address.city.trim()) {
          setError(t('checkout.cityRequired'));
          setLoading(false);
          showToast('checkout.cityRequired');
          setTimeout(() => {
            cityRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            cityRef.current?.focus();
          }, 100);
          return;
        }
        body.address = address;
        body.deliveryZoneId = selectedZoneId;
      }

      // Guest info
      if (!user) {
        (document.activeElement as HTMLElement)?.blur();
        if (!guestName.trim()) {
          setError(t('checkout.nameRequired'));
          setLoading(false);
          showToast('checkout.nameRequired');
          setTimeout(() => {
            guestNameRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            guestNameRef.current?.focus();
          }, 100);
          return;
        }
        if (!guestPhone.trim()) {
          setError(t('checkout.phoneRequired'));
          setLoading(false);
          showToast('checkout.phoneRequired');
          setTimeout(() => {
            guestPhoneRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            guestPhoneRef.current?.focus();
          }, 100);
          return;
        }
        body.guestName = guestName;
        if (guestEmail) body.guestEmail = guestEmail;
        body.guestPhone = guestPhone || undefined;
      }

      // Loyalty points
      if (loyaltyRedeem > 0) {
        body.loyaltyPointsRedeem = loyaltyRedeem;
      }

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to place order');

      clear();

      const order = data.data;
      if (order.tax) setTax(order.tax);
      const whatsappUrl = getWhatsAppUrl(order, orderType, t, window.location.origin);
      window.open(whatsappUrl, '_blank');

      navigate(`/order/${data.data.id}`, { state: { order: data.data } });
    } catch (err: any) {
      setError(err.message || t('common.error'));
      showToast(err.message || t('common.error'), {}, 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">{t('checkout.title')}</h1>

      {isBusy && (
        <div className="bg-amber-50 border border-amber-300 text-amber-800 p-4 rounded-lg mb-6">
          <p className="font-semibold">{t('checkout.currentlyUnavailable')}</p>
          <p className="text-sm mt-1">{busyMessage}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col lg:flex-row gap-8">
        {/* Left: Form */}
        <div className="flex-1 space-y-6">
          {error && (
            <div className="bg-red-50 text-red-700 p-4 rounded-lg text-sm">{error}</div>
          )}

          {/* Order type */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('checkout.orderType')}</h2>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setOrderType('delivery')}
                className={`flex-1 py-3 rounded-lg font-medium text-sm border-2 transition-colors ${
                  orderType === 'delivery'
                    ? 'border-primary-600 bg-primary-50 text-primary-700'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                {t('checkout.delivery')}
              </button>
              <button
                type="button"
                onClick={() => { setOrderType('pickup'); setSelectedZoneId(''); setDeliveryFee(0); }}
                className={`flex-1 py-3 rounded-lg font-medium text-sm border-2 transition-colors ${
                  orderType === 'pickup'
                    ? 'border-primary-600 bg-primary-50 text-primary-700'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                {t('checkout.pickup')}
              </button>
            </div>
          </div>

          {/* Delivery address */}
          {orderType === 'delivery' && (
            <div id="delivery-address-section" className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('checkout.deliveryAddress')}</h2>
              {zoneError && (
                <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm mb-3">{zoneError}</div>
              )}
              <div className="space-y-3">
                <input
                  type="text"
                  required
                  ref={addressLine1Ref}
                  placeholder={t('checkout.addressLine1')}
                  value={address.line1}
                  onChange={(e) => { const next = { ...address, line1: e.target.value }; setAddress(next); localStorage.setItem('checkoutAddress', JSON.stringify(next)); }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-sm"
                />
                <input
                  type="text"
                  required
                  id="address-line2"
                  placeholder={t('checkout.addressLine2')}
                  value={address.line2}
                  onChange={(e) => { const next = { ...address, line2: e.target.value }; setAddress(next); localStorage.setItem('checkoutAddress', JSON.stringify(next)); }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-sm"
                />
                <div className="grid grid-cols-3 gap-3">
                  <input
                    type="text"
                    required
                    ref={cityRef}
                    placeholder={t('checkout.city')}
                    value={address.city}
                    onChange={(e) => { const next = { ...address, city: e.target.value }; setAddress(next); localStorage.setItem('checkoutAddress', JSON.stringify(next)); }}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-sm"
                  />
                  <input
                    type="text"
                    required
                    ref={stateRef}
                    placeholder={t('checkout.state')}
                    value={address.state}
                    onChange={(e) => { const next = { ...address, state: e.target.value }; setAddress(next); localStorage.setItem('checkoutAddress', JSON.stringify(next)); }}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-sm"
                  />
                  <input
                    type="text"
                    required
                    ref={zipRef}
                    placeholder={t('checkout.zipCode')}
                    value={address.zip}
                    onChange={(e) => { const next = { ...address, zip: e.target.value }; setAddress(next); localStorage.setItem('checkoutAddress', JSON.stringify(next)); }}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-sm"
                  />
                </div>
                {availableZones.length > 0 && (
                  <div className="mt-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('checkout.selectDeliveryZone') || 'Delivery Zone'}
                    </label>
                    <select
                      ref={zoneRef}
                      value={selectedZoneId}
                      onChange={(e) => {
                        setSelectedZoneId(e.target.value);
                        const zone = availableZones.find((z) => z.id === e.target.value);
                        setDeliveryFee(zone ? zone.charge : 4.99);
                        setZoneError('');
                      }}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-sm"
                    >
                      <option value="">{t('checkout.selectZone') || 'Select a zone...'}</option>
                      {availableZones.map((zone) => (
                        <option key={zone.id} value={zone.id}>
                          {zone.name} — ${zone.charge.toFixed(2)}{zone.minOrder > 0 ? ` (${t('checkout.minOrderDelivery')} $${zone.minOrder.toFixed(2)})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Schedule */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('checkout.scheduling')}</h2>
            <div className="space-y-3">
              <label className="flex items-center gap-3">
                <input
                  type="radio"
                  name="schedule"
                  checked={!scheduledAt}
                  onChange={() => setScheduledAt('')}
                  className="accent-primary-600"
                />
                <span className="text-sm text-gray-700">{t('checkout.asap')}</span>
              </label>
              <label className="flex items-center gap-3">
                <input
                  type="radio"
                  name="schedule"
                  checked={!!scheduledAt}
                  onChange={() => setScheduledAt(getDefaultScheduleTime())}
                  className="accent-primary-600"
                />
                <span className="text-sm text-gray-700">{t('checkout.scheduled')}</span>
              </label>
              {scheduledAt && (
                <input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-sm"
                />
              )}
            </div>
          </div>

          {/* Notes */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('checkout.orderNotes')}</h2>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-sm resize-none"
            />
          </div>

          {/* Loyalty Points Redemption */}
          {user && loyaltyBalance > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('checkout.loyaltyPoints')}</h2>
              <p className="text-sm text-gray-600 mb-3">
                {t('checkout.pointsAvailable').replace('{points}', String(loyaltyBalance)).replace('{value}', `100 points = $1.00`)}
              </p>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min={0}
                  max={Math.min(loyaltyBalance, Math.floor(subtotal * 100))}
                  step={100}
                  value={loyaltyRedeem}
                  onChange={(e) => setLoyaltyRedeem(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-sm"
                  placeholder="0"
                />
                <span className="text-sm text-gray-600">{t('checkout.pointsToRedeem')}</span>
                {loyaltyRedeem > 0 && (
                  <span className="text-sm font-medium text-green-600">
                    -${loyaltyDiscount.toFixed(2)}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Guest info or login prompt */}
          {!user && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('checkout.contactInformation')}</h2>
              <div className="space-y-3">
                <input
                  type="text"
                  required
                  ref={guestNameRef}
                  placeholder={t('checkout.fullName')}
                  value={guestName}
                  onChange={(e) => { setGuestName(e.target.value); localStorage.setItem('checkoutGuestName', e.target.value); }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-sm"
                />
                <input
                  type="tel"
                  required
                  ref={guestPhoneRef}
                  placeholder={t('checkout.phoneNumber')}
                  value={guestPhone}
                  onChange={(e) => { setGuestPhone(e.target.value); localStorage.setItem('checkoutGuestPhone', e.target.value); }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-sm"
                />
                <input
                  type="email"
                  placeholder={t('checkout.emailAddress')}
                  value={guestEmail}
                  onChange={(e) => { setGuestEmail(e.target.value); localStorage.setItem('checkoutGuestEmail', e.target.value); }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-sm"
                />
              </div>
            </div>
          )}

{/* Coupon */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('checkout.couponCode')}</h2>
            <div className="flex gap-2">
              <input
                type="text"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-sm"
              />
              <button
                type="button"
                onClick={handleApplyCoupon}
                disabled={couponLoading}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                {couponLoading ? '...' : t('checkout.apply')}
              </button>
            </div>
            {couponError && <p className="text-red-500 text-xs mt-1">{couponError}</p>}
            {!couponError && couponDiscount > 0 && (
              <p className="text-green-600 text-xs mt-1">{t('checkout.couponAppliedDiscount').replace('${amount}', `-$${couponDiscount.toFixed(2)}`)}</p>
            )}
          </div>

          {/* Payment method */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('checkout.paymentMethod')}</h2>
            <div className="space-y-2">
              {paymentSettings.cashEnabled && (
                <label className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                  paymentMethod === 'CASH'
                    ? 'border-primary-600 bg-primary-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}>
                  <input
                    type="radio"
                    name="payment"
                    checked={paymentMethod === 'CASH'}
                    onChange={() => setPaymentMethod('CASH')}
                    className="accent-primary-600"
                  />
                  <span className="text-sm font-medium text-gray-900">{t('checkout.cashOnDelivery')}</span>
                </label>
              )}
              {paymentSettings.stripeEnabled && (
                <label className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                  paymentMethod === 'STRIPE'
                    ? 'border-primary-600 bg-primary-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}>
                  <input
                    type="radio"
                    name="payment"
                    checked={paymentMethod === 'STRIPE'}
                    onChange={() => setPaymentMethod('STRIPE')}
                    className="accent-primary-600"
                  />
                  <span className="text-sm font-medium text-gray-900">{t('checkout.creditCard')}</span>
                </label>
              )}
              {paymentSettings.paypalEnabled && (
                <label className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                  paymentMethod === 'PAYPAL'
                    ? 'border-primary-600 bg-primary-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}>
                  <input
                    type="radio"
                    name="payment"
                    checked={paymentMethod === 'PAYPAL'}
                    onChange={() => setPaymentMethod('PAYPAL')}
                    className="accent-primary-600"
                  />
                  <span className="text-sm font-medium text-gray-900">{t('checkout.paypal')}</span>
                </label>
              )}
              {paymentSettings.transferEnabled && (
                <label className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                  paymentMethod === 'TRANSFER'
                    ? 'border-primary-600 bg-primary-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}>
                  <input
                    type="radio"
                    name="payment"
                    checked={paymentMethod === 'TRANSFER'}
                    onChange={() => setPaymentMethod('TRANSFER')}
                    className="accent-primary-600"
                  />
                  <span className="text-sm font-medium text-gray-900">{t('checkout.transfer')}</span>
                </label>
              )}
            </div>
          </div>
        </div>

        {/* Right: Order summary */}
        <div className="lg:w-80 shrink-0">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sticky top-24">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('checkout.orderSummary')}</h2>

            <div className="space-y-3 mb-4">
              {items.map((item) => {
                const optionsTotal = item.options.reduce((s, o) => s + o.priceModifier, 0);
                return (
                  <div key={item.id} className="flex justify-between text-sm">
                    <div>
                      <span className="text-gray-400 mr-1">{item.quantity}x</span>
                      <span className="text-gray-700">{item.name}</span>
                      {item.options.length > 0 && (
                        <p className="text-xs text-gray-400 ml-5">
                          {item.options.map((o) => o.valueName).join(', ')}
                        </p>
                      )}
                    </div>
                    <span className="text-gray-900 font-medium">
                      ${((item.price + optionsTotal) * item.quantity).toFixed(2)}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="border-t border-gray-200 pt-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">{t('checkout.subtotal')}</span>
                <span className="text-gray-900">${subtotal.toFixed(2)}</span>
              </div>
              {displayTax > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">{t('checkout.tax')}</span>
                    <span>${displayTax.toFixed(2)}</span>
                  </div>
                )}
              {orderType === 'delivery' && (
                <div className="flex justify-between">
                  <span className="text-gray-600">{t('checkout.deliveryFee')}</span>
                  <span className="text-gray-900">${currentDeliveryFee.toFixed(2)}</span>
                </div>
              )}
              {loyaltyDiscount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>{t('checkout.loyaltyDiscount')}</span>
                  <span>-${loyaltyDiscount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-gray-200 pt-2 font-bold text-base">
                <span>{t('checkout.total')}</span>
                <span className="text-primary-600">${total.toFixed(2)}</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || isBusy}
              className="w-full mt-4 bg-primary-600 text-white py-3 rounded-lg font-semibold hover:bg-primary-700 transition-colors disabled:opacity-50"
            >
              {isBusy
                ? t('checkout.currentlyUnavailable')
                : loading
                  ? t('checkout.processing')
                  : `${t('checkout.placeOrder')} — $${total.toFixed(2)}`}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

function getDefaultScheduleTime(): string {
  const d = new Date();
  d.setHours(d.getHours() + 1, 0, 0, 0);
  return d.toISOString().slice(0, 16);
}
