import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Plus, Minus, Trash2, CheckCircle, User, Package, Calendar, CreditCard,
  Banknote, Smartphone, Building2, Heart, Star, Gift, Sparkles, PartyPopper,
  Info, X, AlertTriangle, Clock, Shield, Barcode,
} from 'lucide-react';
import { toast } from 'sonner';
import { rentalService } from '@/services/rentalService';
import { customerDisplay } from '@/services/customerDisplayChannel';
import { customerService } from '@/services/customerService';
import { productService } from '@/services/productService';
import { settingsService } from '@/services/settingsService';
import { calculatePromoDiscount } from '@/services/promotionService';
import Button from '@/components/common/Button';
import Input from '@/components/common/Input';
import Textarea from '@/components/common/Textarea';
import PromotionSelector from '@/components/common/PromotionSelector';
import { formatCurrency, getDaysDiff } from '@/utils/formatters';
import { cn } from '@/utils/cn';
import type { Customer, Promotion } from '@/types';

const STEPS = ['Customer', 'Items', 'Dates', 'Payment', 'Confirm'];

const PAYMENT_METHODS = [
  { value: 'cash',           label: 'Cash',         icon: Banknote   },
  { value: 'card',           label: 'Card',         icon: CreditCard },
  { value: 'mobile_payment', label: 'Mobile Pay',   icon: Smartphone },
  { value: 'bank_transfer',  label: 'Bank Transfer',icon: Building2  },
] as const;

const PRESET_EVENTS = [
  { label: 'Wedding',       icon: Heart      },
  { label: 'Birthday',      icon: Star       },
  { label: 'Anniversary',   icon: Gift       },
  { label: 'Gala',          icon: Sparkles   },
  { label: 'Formal Dinner', icon: PartyPopper},
  { label: 'Other',         icon: null       },
];

interface RentalCartItem {
  variantId: string;
  productName: string;
  variantInfo: string;
  sku: string;
  rentalPricePerDay: number;
  lateFinePerDay: number;
  quantity: number;
}

export default function NewRentalPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [step, setStep] = useState(0);

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerResults, setShowCustomerResults] = useState(false);
  const [newCustomerMode, setNewCustomerMode] = useState(false);
  const [newCustomerForm, setNewCustomerForm] = useState({ name: '', phone: '', whatsapp: '', email: '' });

  const [cartItems, setCartItems] = useState<RentalCartItem[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [showProductResults, setShowProductResults] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  const [rentalStartDate, setRentalStartDate] = useState('');
  const [rentalEndDate, setRentalEndDate] = useState('');
  const [eventType, setEventType] = useState('');
  const [eventTypeCustom, setEventTypeCustom] = useState(false);
  const [customEventText, setCustomEventText] = useState('');
  const [notes, setNotes] = useState('');

  const [advancePayment, setAdvancePayment] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<string>('cash');
  const [manualDiscount, setManualDiscount] = useState('');
  const [securityType, setSecurityType] = useState<'none' | 'deposit' | 'id_card'>('none');
  const [securityDeposit, setSecurityDeposit] = useState('');
  const [securityIdNumber, setSecurityIdNumber] = useState('');
  const [selectedPromotion, setSelectedPromotion] = useState<Promotion | null>(null);
  const [showRules, setShowRules] = useState(false);

  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: () => settingsService.getAll(),
  });

  const { data: customerResults } = useQuery({
    queryKey: ['customer-search', customerSearch],
    queryFn: () => customerService.search(customerSearch),
    enabled: customerSearch.length > 1,
  });

  const { data: productResults } = useQuery({
    queryKey: ['product-search-rental', productSearch],
    queryFn: () => productService.getAll({ search: productSearch, type: 'rental', includeVariants: true, limit: 10 }),
    enabled: productSearch.length > 0,
  });

  const createCustomerMutation = useMutation({
    mutationFn: customerService.create,
    onSuccess: (c: any) => { setCustomer(c); setNewCustomerMode(false); setStep(1); },
    onError: (e: any) => toast.error(e.response?.data?.error || 'Failed to create customer'),
  });

  const createRentalMutation = useMutation({
    mutationFn: rentalService.create,
    onSuccess: (data: any) => {
      customerDisplay.sendIdle();
      toast.success(`Booking ${data.booking_number} created!`);
      qc.invalidateQueries({ queryKey: ['rentals'] });
      navigate(`/rentals/${data.id}`);
    },
    onError: (e: any) => toast.error(e.response?.data?.error || 'Failed to create rental'),
  });

  const rentalDays = rentalStartDate && rentalEndDate
    ? Math.max(1, getDaysDiff(rentalStartDate, rentalEndDate))
    : 1;

  const totalCost = cartItems.reduce((sum, item) => sum + item.rentalPricePerDay * item.quantity * rentalDays, 0);

  const promoDiscount = selectedPromotion
    ? calculatePromoDiscount(
        selectedPromotion,
        totalCost,
        cartItems.map(i => ({ unitPrice: i.rentalPricePerDay, quantity: i.quantity })),
        rentalDays,
        'rental'
      )
    : 0;
  const manualDiscountAmt = parseFloat(manualDiscount || '0');
  const finalTotal = Math.max(0, totalCost - manualDiscountAmt - promoDiscount);

  // Broadcast rental items to customer display in real-time
  useEffect(() => {
    if (cartItems.length === 0) return;
    customerDisplay.sendRental(
      cartItems.map(item => ({
        productName: item.productName,
        variantSku: item.sku,
        variantLabel: item.variantInfo,
        quantity: item.quantity,
        unitPrice: item.rentalPricePerDay,
        subtotal: item.rentalPricePerDay * item.quantity * rentalDays,
      })),
      finalTotal,
      customer?.name || '',
      rentalStartDate || '',
      rentalEndDate   || ''
    );
  }, [cartItems, finalTotal, customer, rentalStartDate, rentalEndDate, rentalDays]);

  // Auto-focus callback — called from onAnimationComplete on step-1 motion.div
  const focusSearch = () => searchRef.current?.focus();

  const handleSearchKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return;
    // Read from DOM directly to avoid stale React state (barcode scanners fire keystrokes rapidly)
    const query = (e.target as HTMLInputElement).value.trim();
    if (!query) return;
    try {
      const result = await productService.getByBarcode(query);
      if (result.type === 'variant') {
        const avail = result.available_for_rent ?? result.stock_quantity ?? 0;
        if (avail <= 0) { toast.error('No rental stock available for this item'); return; }
        // Use variant price first, fall back to product-level price
        const variantWithFallback = {
          ...result,
          rental_price_per_day: result.rental_price_per_day ?? result.product_rental_price_per_day,
        };
        addToCart(variantWithFallback, result.product_name, result.late_fine_per_day ?? 0);
        toast.success(`Added: ${result.product_name}${result.size ? ' · ' + result.size : ''}`);
      } else if (result.type === 'product') {
        const variant = (result.variants || []).find((v: any) => (v.available_for_rent ?? v.stock_quantity ?? 0) > 0);
        if (!variant) { toast.error('No rental stock available for this item'); return; }
        addToCart(variant, result.name, result.late_fine_per_day ?? 0);
        toast.success(`Added: ${result.name}`);
      }
    } catch {
      toast.error('Product not found for SKU: ' + (e.target as HTMLInputElement).value.trim());
    }
  };

  const addToCart = (variant: any, productName: string, lateFinePerDay = 0) => {
    const existing = cartItems.find((i) => i.variantId === variant.id);
    if (existing) {
      setCartItems(cartItems.map((i) => i.variantId === variant.id ? { ...i, quantity: i.quantity + 1 } : i));
    } else {
      setCartItems([...cartItems, {
        variantId: variant.id,
        productName,
        variantInfo: [variant.size, variant.color].filter(Boolean).join(' / '),
        sku: variant.sku,
        rentalPricePerDay: parseFloat(variant.rental_price_per_day || variant.rentalPricePerDay || 0),
        lateFinePerDay: parseFloat(String(lateFinePerDay || 0)),
        quantity: 1,
      }]);
    }
    setProductSearch('');
    setShowProductResults(false);
    setTimeout(() => searchRef.current?.focus(), 50);
  };

  const finalEventType = eventTypeCustom ? customEventText : eventType;

  const handleSubmit = () => {
    if (!customer || !rentalStartDate || !rentalEndDate || cartItems.length === 0) return;
    createRentalMutation.mutate({
      customerId: customer.id,
      rentalStartDate,
      rentalEndDate,
      items: cartItems.map((i) => ({
        variantId: i.variantId,
        quantity: i.quantity,
        rentalPricePerDay: i.rentalPricePerDay,
      })),
      advancePayment: parseFloat(advancePayment || '0'),
      discountAmount: manualDiscountAmt,
      promotionId: selectedPromotion?.id ?? null,
      eventType: finalEventType,
      notes,
      paymentMethod,
      securityType: securityType !== 'none' ? securityType : undefined,
      securityDeposit: securityType === 'deposit' ? parseFloat(securityDeposit || '0') : undefined,
      securityIdNumber: securityType === 'id_card' ? securityIdNumber : undefined,
    });
  };

  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="page-header flex-shrink-0">
        <h2 className="page-title">New Rental Booking</h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowRules(true)}
            title="View rental & fine rules"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-charcoal-500 text-charcoal-300 hover:text-gold-400 hover:border-gold-700/50 bg-charcoal-700/40 transition-colors text-xs font-medium"
          >
            <Info size={14} />
            Rules
          </button>
          <Button variant="secondary" onClick={() => navigate('/rentals')}>Cancel</Button>
        </div>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-0 mb-4 flex-shrink-0">
        {STEPS.map((label, i) => {
          const icons = [User, Package, Calendar, CreditCard, CheckCircle];
          const Icon = icons[i];
          return (
            <div key={i} className="flex items-center flex-1">
              <div className={cn(
                'flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium flex-shrink-0 transition-all duration-200',
                i < step  ? 'bg-gold-gradient text-charcoal-900' :
                i === step ? 'bg-charcoal-600 border-2 border-gold-600 text-gold-400' :
                             'bg-charcoal-600 border border-charcoal-400 text-charcoal-300'
              )}>
                {i < step ? <CheckCircle size={14} /> : <Icon size={14} />}
              </div>
              <span className={cn('ml-2 text-xs hidden sm:inline', i === step ? 'text-charcoal-50 font-medium' : 'text-charcoal-300')}>
                {label}
              </span>
              {i < STEPS.length - 1 && (
                <div className={cn('flex-1 h-px mx-3', i < step ? 'bg-gold-700' : 'bg-charcoal-500')} />
              )}
            </div>
          );
        })}
      </div>

      {/* Main area — fills remaining height */}
      <div className="flex gap-5 flex-1 min-h-0">

        {/* Left: step form */}
        <div className="flex-1 min-w-0 flex flex-col min-h-0">
          <div className="card p-5 flex-1 flex flex-col min-h-0 overflow-hidden">
            {/* Scrollable step content */}
            <div className="flex-1 overflow-y-auto min-h-0 pr-1">
              <AnimatePresence mode="wait">

                {/* Step 0: Customer */}
                {step === 0 && (
                  <motion.div key="s0" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                    <h3 className="section-title">Select Customer</h3>
                    {!newCustomerMode ? (
                      <>
                        <div className="relative">
                          <Input
                            label="Search Customer"
                            value={customerSearch}
                            onChange={(e) => { setCustomerSearch(e.target.value); setShowCustomerResults(true); }}
                            placeholder="Search by name or phone..."
                            icon={<Search size={15} />}
                          />
                          {showCustomerResults && customerResults && customerResults.length > 0 && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-charcoal-700 border border-charcoal-500 rounded-xl shadow-card z-10 overflow-hidden">
                              {customerResults.map((c: Customer) => (
                                <button
                                  key={c.id}
                                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-charcoal-600 transition-colors"
                                  onClick={() => { setCustomer(c); setCustomerSearch(c.name); setShowCustomerResults(false); }}
                                >
                                  <div className="w-8 h-8 rounded-full bg-gold-700/20 flex items-center justify-center flex-shrink-0">
                                    <span className="text-gold-400 text-sm font-semibold">{c.name.charAt(0)}</span>
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium text-charcoal-50">{c.name}</p>
                                    {c.phone && <p className="text-xs text-charcoal-200">{c.phone}</p>}
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>

                        {customer && (
                          <div className="p-4 bg-charcoal-600/50 rounded-xl border border-gold-700/30 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gold-700/20 flex items-center justify-center">
                              <span className="text-gold-400 font-semibold">{customer.name.charAt(0)}</span>
                            </div>
                            <div className="flex-1">
                              <p className="font-medium text-charcoal-50">{customer.name}</p>
                              <p className="text-sm text-charcoal-200">{customer.phone}</p>
                            </div>
                            <Button variant="ghost" size="sm" onClick={() => setCustomer(null)}>Change</Button>
                          </div>
                        )}

                        <button
                          onClick={() => setNewCustomerMode(true)}
                          className="w-full p-3 border-2 border-dashed border-charcoal-400 rounded-xl text-sm text-charcoal-200 hover:border-gold-700/50 hover:text-charcoal-100 transition-colors"
                        >
                          <Plus size={14} className="inline mr-2" /> Create New Customer
                        </button>
                      </>
                    ) : (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-charcoal-100">New Customer</p>
                          <button onClick={() => setNewCustomerMode(false)} className="text-xs text-charcoal-200 hover:text-charcoal-50">Cancel</button>
                        </div>
                        <Input placeholder="Full Name *" value={newCustomerForm.name} onChange={(e) => setNewCustomerForm({ ...newCustomerForm, name: e.target.value })} />
                        <div className="grid grid-cols-2 gap-3">
                          <Input placeholder="Phone" value={newCustomerForm.phone} onChange={(e) => setNewCustomerForm({ ...newCustomerForm, phone: e.target.value })} />
                          <Input placeholder="WhatsApp" value={newCustomerForm.whatsapp} onChange={(e) => setNewCustomerForm({ ...newCustomerForm, whatsapp: e.target.value })} />
                        </div>
                        <Input placeholder="Email" type="email" value={newCustomerForm.email} onChange={(e) => setNewCustomerForm({ ...newCustomerForm, email: e.target.value })} />
                        <Button variant="primary" size="sm" onClick={() => createCustomerMutation.mutate(newCustomerForm)} loading={createCustomerMutation.isPending}>
                          Save & Continue
                        </Button>
                      </div>
                    )}
                  </motion.div>
                )}

                {/* Step 1: Items */}
                {step === 1 && (
                  <motion.div key="s1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} onAnimationComplete={focusSearch} className="space-y-4">
                    <h3 className="section-title">Select Items</h3>
                    <div className="relative">
                      <Input
                        ref={searchRef}
                        value={productSearch}
                        onChange={(e) => { setProductSearch(e.target.value); setShowProductResults(true); }}
                        onFocus={() => setShowProductResults(true)}
                        onBlur={() => setTimeout(() => setShowProductResults(false), 150)}
                        onKeyDown={handleSearchKeyDown}
                        placeholder="Search or scan barcode..."
                        icon={<Barcode size={15} />}
                        iconRight={<Search size={13} className="opacity-50" />}
                      />
                      {showProductResults && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-charcoal-700 border border-charcoal-500 rounded-xl shadow-card z-10 overflow-hidden max-h-64 overflow-y-auto">
                          {(productResults?.data?.length ?? 0) === 0 ? (
                            <p className="text-xs text-charcoal-300 text-center py-4">
                              {productSearch.length === 0 ? 'Start typing to search rental items...' : 'No rental items found'}
                            </p>
                          ) : (
                            productResults?.data.map((product: any) => {
                              const searchLower = productSearch.trim().toLowerCase();
                              const allVariants = (product.variants || []).filter((v: any) => (v.available_for_rent ?? v.stock_quantity) > 0);
                              // If search exactly matches a variant SKU, show only that variant
                              const exactMatch = allVariants.find((v: any) => v.sku.toLowerCase() === searchLower);
                              const variants = exactMatch ? [exactMatch] : allVariants;
                              if (variants.length === 0) return null;
                              return variants.map((v: any) => (
                                <button
                                  key={v.id}
                                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-charcoal-600 transition-colors border-b border-charcoal-600/50 last:border-0"
                                  onMouseDown={() => addToCart(v, product.name, product.late_fine_per_day)}
                                >
                                  <Package size={14} className="text-charcoal-300 flex-shrink-0" />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-charcoal-50 truncate">{product.name}</p>
                                    <p className="text-xs text-charcoal-200">{[v.size, v.color].filter(Boolean).join(' / ')} · {v.sku}</p>
                                    <p className="text-xs text-gold-500 mt-0.5">{formatCurrency(v.rental_price_per_day)}/day</p>
                                  </div>
                                  <span className="text-xs font-medium text-emerald-400 flex-shrink-0">{v.available_for_rent ?? v.stock_quantity} avail</span>
                                </button>
                              ));
                            })
                          )}
                        </div>
                      )}
                    </div>

                    {cartItems.length === 0 ? (
                      <div className="py-10 text-center text-charcoal-200 text-sm">No items added yet. Search above.</div>
                    ) : (
                      <div className="space-y-2">
                        {cartItems.map((item) => (
                          <div key={item.variantId} className="flex items-center gap-3 p-3 bg-charcoal-600/50 rounded-xl">
                            <div className="flex-1">
                              <p className="text-sm font-medium text-charcoal-50">{item.productName}</p>
                              <p className="text-xs text-charcoal-200">{item.variantInfo} · {formatCurrency(item.rentalPricePerDay)}/day</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <button onClick={() => setCartItems(cartItems.map((i) => i.variantId === item.variantId ? { ...i, quantity: Math.max(1, i.quantity - 1) } : i))} className="w-7 h-7 rounded-lg bg-charcoal-500 flex items-center justify-center text-charcoal-100 hover:bg-charcoal-400">
                                <Minus size={12} />
                              </button>
                              <span className="w-6 text-center text-sm font-medium text-charcoal-50">{item.quantity}</span>
                              <button onClick={() => setCartItems(cartItems.map((i) => i.variantId === item.variantId ? { ...i, quantity: i.quantity + 1 } : i))} className="w-7 h-7 rounded-lg bg-charcoal-500 flex items-center justify-center text-charcoal-100 hover:bg-charcoal-400">
                                <Plus size={12} />
                              </button>
                              <button onClick={() => setCartItems(cartItems.filter((i) => i.variantId !== item.variantId))} className="text-charcoal-200 hover:text-red-400 ml-1">
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}

                {/* Step 2: Dates */}
                {step === 2 && (
                  <motion.div key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
                    <h3 className="section-title">Rental Dates</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <Input label="Pickup Date" type="date" min={today} value={rentalStartDate} onChange={(e) => setRentalStartDate(e.target.value)} required />
                      <Input label="Return Date" type="date" min={rentalStartDate || today} value={rentalEndDate} onChange={(e) => setRentalEndDate(e.target.value)} required />
                    </div>

                    {rentalStartDate && rentalEndDate && (
                      <div className="flex gap-3">
                        <div className="flex-1 p-3 bg-charcoal-600/50 rounded-xl text-center">
                          <p className="text-xs text-charcoal-300 mb-1">Duration</p>
                          <p className="text-lg font-semibold text-charcoal-50">{rentalDays}<span className="text-xs font-normal text-charcoal-300 ml-1">day{rentalDays !== 1 ? 's' : ''}</span></p>
                        </div>
                        <div className="flex-1 p-3 bg-charcoal-600/50 rounded-xl text-center">
                          <p className="text-xs text-charcoal-300 mb-1">Estimated Cost</p>
                          <p className="text-lg font-semibold text-gold-400">{formatCurrency(totalCost)}</p>
                        </div>
                      </div>
                    )}

                    {/* Event Type Tiles */}
                    <div>
                      <p className="text-sm font-medium text-charcoal-200 mb-2">Event Type</p>
                      <div className="grid grid-cols-3 gap-2">
                        {PRESET_EVENTS.map(({ label, icon: Icon }) => {
                          const isSelected = !eventTypeCustom
                            ? eventType === label
                            : label === 'Other';
                          return (
                            <button
                              key={label}
                              type="button"
                              onClick={() => {
                                if (label === 'Other') {
                                  setEventTypeCustom(true);
                                  setEventType('');
                                } else {
                                  setEventTypeCustom(false);
                                  setEventType(label);
                                }
                              }}
                              className={cn(
                                'flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all text-xs font-medium',
                                isSelected
                                  ? 'border-gold-600 bg-gold-700/10 text-gold-400'
                                  : 'border-charcoal-500 text-charcoal-300 hover:border-charcoal-400 hover:text-charcoal-100'
                              )}
                            >
                              {Icon ? <Icon size={16} /> : <span className="text-base">✏️</span>}
                              {label}
                            </button>
                          );
                        })}
                      </div>
                      {eventTypeCustom && (
                        <Input
                          className="mt-2"
                          placeholder="Describe the event..."
                          value={customEventText}
                          onChange={(e) => setCustomEventText(e.target.value)}
                        />
                      )}
                    </div>

                    <Textarea label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any special requests or notes..." rows={2} />
                  </motion.div>
                )}

                {/* Step 3: Payment */}
                {step === 3 && (
                  <motion.div key="s3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
                    <h3 className="section-title">Payment Details</h3>

                    {/* Cost breakdown */}
                    <div className="p-4 bg-charcoal-600/30 rounded-xl space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-charcoal-200">Total Rental Cost</span>
                        <span className="text-charcoal-50 font-medium">{formatCurrency(totalCost)}</span>
                      </div>
                      {manualDiscountAmt > 0 && (
                        <div className="flex justify-between text-sm text-emerald-400">
                          <span>Manual Discount</span>
                          <span>-{formatCurrency(manualDiscountAmt)}</span>
                        </div>
                      )}
                      {promoDiscount > 0 && selectedPromotion && (
                        <div className="flex justify-between text-sm text-emerald-400">
                          <span>Promotion ({selectedPromotion.name})</span>
                          <span>-{formatCurrency(promoDiscount)}</span>
                        </div>
                      )}
                      {(manualDiscountAmt > 0 || promoDiscount > 0) && (
                        <div className="flex justify-between text-sm font-bold pt-1 border-t border-charcoal-500">
                          <span className="text-charcoal-100">Net Total</span>
                          <span className="text-gold-400">{formatCurrency(finalTotal)}</span>
                        </div>
                      )}
                    </div>

                    {/* Payment Method Tiles */}
                    <div>
                      <p className="text-sm font-medium text-charcoal-200 mb-2">Payment Method</p>
                      <div className="grid grid-cols-4 gap-2">
                        {PAYMENT_METHODS.map(({ value, label, icon: Icon }) => (
                          <button
                            key={value}
                            type="button"
                            onClick={() => setPaymentMethod(value)}
                            className={cn(
                              'flex flex-col items-center gap-2 py-3 px-2 rounded-xl border-2 transition-all',
                              paymentMethod === value
                                ? 'border-gold-600 bg-gold-700/10 text-gold-400'
                                : 'border-charcoal-500 text-charcoal-300 hover:border-charcoal-400 hover:text-charcoal-100'
                            )}
                          >
                            <Icon size={20} />
                            <span className="text-xs font-medium text-center leading-tight">{label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <Input
                        label="Advance Payment (LKR)"
                        type="number"
                        step="0.01"
                        min="0"
                        value={advancePayment}
                        onChange={(e) => setAdvancePayment(e.target.value)}
                        placeholder="0.00"
                        hint="Amount paid now"
                      />
                      <Input
                        label="Manual Discount (LKR)"
                        type="number"
                        step="0.01"
                        min="0"
                        value={manualDiscount}
                        onChange={(e) => setManualDiscount(e.target.value)}
                        placeholder="0.00"
                        hint="Optional discount"
                      />
                    </div>

                    <PromotionSelector
                      scope="rental"
                      cartSubtotal={totalCost}
                      cartItems={cartItems.map(i => ({ unitPrice: i.rentalPricePerDay, quantity: i.quantity }))}
                      rentalDays={rentalDays}
                      selectedId={selectedPromotion?.id ?? null}
                      onSelect={setSelectedPromotion}
                    />

                    {/* Security / Guarantee */}
                    <div>
                      <p className="text-sm font-medium text-charcoal-200 mb-2">Security / Guarantee</p>
                      <div className="grid grid-cols-3 gap-2 mb-3">
                        {[
                          { value: 'none',     label: 'None' },
                          { value: 'deposit',  label: 'Cash Deposit' },
                          { value: 'id_card',  label: 'ID Card' },
                        ].map(o => (
                          <button key={o.value} type="button"
                            onClick={() => setSecurityType(o.value as typeof securityType)}
                            className={cn('px-3 py-2.5 rounded-xl border-2 text-sm font-medium transition-all text-center',
                              securityType === o.value
                                ? 'border-gold-500 bg-gold-700/15 text-gold-400'
                                : 'border-charcoal-500 text-charcoal-300 hover:border-charcoal-400 hover:text-charcoal-100'
                            )}>
                            {o.label}
                          </button>
                        ))}
                      </div>
                      {securityType === 'deposit' && (
                        <Input
                          label="Deposit Amount (LKR)"
                          type="number"
                          step="0.01"
                          min="0"
                          value={securityDeposit}
                          onChange={(e) => setSecurityDeposit(e.target.value)}
                          placeholder="0.00"
                          hint="Refundable on return"
                        />
                      )}
                      {securityType === 'id_card' && (
                        <Input
                          label="ID Card / NIC Number"
                          value={securityIdNumber}
                          onChange={(e) => setSecurityIdNumber(e.target.value)}
                          placeholder="Enter NIC or Passport number"
                          hint="Returned to customer when items are back"
                        />
                      )}
                    </div>
                  </motion.div>
                )}

                {/* Step 4: Confirm */}
                {step === 4 && (
                  <motion.div key="s4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                    <h3 className="section-title">Booking Summary</h3>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { label: 'Customer',       value: customer?.name },
                        { label: 'Phone',          value: customer?.phone || '—' },
                        { label: 'Pickup Date',    value: rentalStartDate },
                        { label: 'Return Date',    value: rentalEndDate },
                        { label: 'Duration',       value: `${rentalDays} day(s)` },
                        { label: 'Event',          value: finalEventType || '—' },
                        { label: 'Items',          value: `${cartItems.length} item(s)` },
                        { label: 'Rental Cost',    value: formatCurrency(totalCost) },
                        ...(promoDiscount > 0 || manualDiscountAmt > 0 ? [{ label: 'Net Total', value: formatCurrency(finalTotal) }] : []),
                        ...(selectedPromotion ? [{ label: 'Promotion', value: selectedPromotion.name }] : []),
                        { label: 'Advance Paid',   value: formatCurrency(parseFloat(advancePayment || '0')) },
                        { label: 'Balance Due',    value: formatCurrency(Math.max(0, finalTotal - parseFloat(advancePayment || '0'))) },
                        { label: 'Payment Method', value: paymentMethod.replace('_', ' ') },
                        ...(securityType === 'deposit' && securityDeposit ? [{ label: 'Security Deposit', value: formatCurrency(parseFloat(securityDeposit)) }] : []),
                        ...(securityType === 'id_card' && securityIdNumber ? [{ label: 'ID Card Held', value: securityIdNumber }] : []),
                      ].map(({ label, value }) => (
                        <div key={label} className="p-3 bg-charcoal-600/50 rounded-xl">
                          <p className="text-xs text-charcoal-200">{label}</p>
                          <p className="text-sm font-medium text-charcoal-50 mt-0.5 capitalize">{value}</p>
                        </div>
                      ))}
                    </div>
                    {notes && (
                      <div className="p-3 bg-charcoal-600/50 rounded-xl">
                        <p className="text-xs text-charcoal-200">Notes</p>
                        <p className="text-sm text-charcoal-100 mt-0.5">{notes}</p>
                      </div>
                    )}
                  </motion.div>
                )}

              </AnimatePresence>
            </div>

            {/* Navigation — pinned at bottom of card */}
            <div className="flex justify-between mt-4 pt-4 border-t border-charcoal-500 flex-shrink-0">
              <Button variant="secondary" onClick={() => step > 0 ? setStep(step - 1) : navigate('/rentals')} disabled={createRentalMutation.isPending}>
                {step === 0 ? 'Cancel' : 'Back'}
              </Button>
              {step < STEPS.length - 1 ? (
                <Button
                  variant="primary"
                  onClick={() => setStep(step + 1)}
                  disabled={
                    (step === 0 && !customer) ||
                    (step === 1 && cartItems.length === 0) ||
                    (step === 2 && (!rentalStartDate || !rentalEndDate))
                  }
                >
                  Next
                </Button>
              ) : (
                <Button variant="primary" onClick={handleSubmit} loading={createRentalMutation.isPending} icon={<CheckCircle size={16} />}>
                  Confirm Booking
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Right: real-time summary */}
        <div className="w-72 xl:w-80 flex-shrink-0 overflow-y-auto">
          <div className="bg-charcoal-700 border border-charcoal-500 rounded-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-charcoal-600 bg-charcoal-600/40">
              <h3 className="font-display text-sm font-semibold text-charcoal-50">Booking Summary</h3>
            </div>

            <div className="px-4 py-3 border-b border-charcoal-600">
              <p className="text-xs text-charcoal-300 uppercase tracking-wide mb-2 flex items-center gap-1.5"><User size={11} />Customer</p>
              {customer ? (
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-gold-700/20 border border-gold-700/30 flex items-center justify-center flex-shrink-0">
                    <span className="text-gold-400 text-xs font-semibold">{customer.name.charAt(0)}</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-charcoal-50">{customer.name}</p>
                    {customer.phone && <p className="text-xs text-charcoal-300">{customer.phone}</p>}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-charcoal-400 italic">Not selected yet</p>
              )}
            </div>

            <div className="px-4 py-3 border-b border-charcoal-600">
              <p className="text-xs text-charcoal-300 uppercase tracking-wide mb-2 flex items-center gap-1.5"><Package size={11} />Items {cartItems.length > 0 && <span className="text-gold-500">({cartItems.length})</span>}</p>
              {cartItems.length === 0 ? (
                <p className="text-xs text-charcoal-400 italic">No items added yet</p>
              ) : (
                <div className="space-y-2">
                  {cartItems.map((item) => (
                    <div key={item.variantId} className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-charcoal-100 truncate">{item.productName}</p>
                        <p className="text-xs text-charcoal-400">{item.variantInfo || item.sku} × {item.quantity}</p>
                      </div>
                      <p className="text-xs text-gold-500 flex-shrink-0">{formatCurrency(item.rentalPricePerDay * item.quantity * rentalDays)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="px-4 py-3 border-b border-charcoal-600">
              <p className="text-xs text-charcoal-300 uppercase tracking-wide mb-2 flex items-center gap-1.5"><Calendar size={11} />Dates</p>
              {rentalStartDate ? (
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-charcoal-400">Pickup</span>
                    <span className="text-charcoal-100 font-medium">{rentalStartDate}</span>
                  </div>
                  {rentalEndDate && (
                    <div className="flex justify-between text-xs">
                      <span className="text-charcoal-400">Return</span>
                      <span className="text-charcoal-100 font-medium">{rentalEndDate}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-xs">
                    <span className="text-charcoal-400">Duration</span>
                    <span className="text-charcoal-100 font-medium">{rentalDays} day{rentalDays !== 1 ? 's' : ''}</span>
                  </div>
                  {finalEventType && (
                    <div className="flex justify-between text-xs">
                      <span className="text-charcoal-400">Event</span>
                      <span className="text-charcoal-100">{finalEventType}</span>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-charcoal-400 italic">Not set yet</p>
              )}
            </div>

            <div className="px-4 py-3">
              <p className="text-xs text-charcoal-300 uppercase tracking-wide mb-2 flex items-center gap-1.5"><CreditCard size={11} />Payment</p>
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-charcoal-400">Rental Cost</span>
                  <span className="text-gold-400 font-semibold">{formatCurrency(totalCost)}</span>
                </div>
                {(promoDiscount > 0 || manualDiscountAmt > 0) && (
                  <div className="flex justify-between text-xs text-emerald-400">
                    <span>Discount</span>
                    <span>-{formatCurrency(promoDiscount + manualDiscountAmt)}</span>
                  </div>
                )}
                {(promoDiscount > 0 || manualDiscountAmt > 0) && (
                  <div className="flex justify-between text-xs font-semibold pt-1 border-t border-charcoal-600">
                    <span className="text-charcoal-200">Net Total</span>
                    <span className="text-gold-400">{formatCurrency(finalTotal)}</span>
                  </div>
                )}
                {advancePayment && parseFloat(advancePayment) > 0 && (
                  <>
                    <div className="flex justify-between text-xs">
                      <span className="text-charcoal-400">Advance Paid</span>
                      <span className="text-emerald-400">{formatCurrency(parseFloat(advancePayment))}</span>
                    </div>
                    <div className="flex justify-between text-xs pt-1 border-t border-charcoal-600">
                      <span className="text-charcoal-200 font-medium">Balance Due</span>
                      <span className="text-charcoal-50 font-semibold">{formatCurrency(Math.max(0, finalTotal - parseFloat(advancePayment)))}</span>
                    </div>
                  </>
                )}
                {paymentMethod && (
                  <div className="flex justify-between text-xs">
                    <span className="text-charcoal-400">Method</span>
                    <span className="text-charcoal-100 capitalize">{paymentMethod.replace('_', ' ')}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Rules Popup */}
      <AnimatePresence>
        {showRules && (
          <motion.div
            key="rules-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowRules(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className="bg-charcoal-700 border border-charcoal-500 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-charcoal-600 bg-charcoal-600/40">
                <h3 className="font-display font-semibold text-charcoal-50 flex items-center gap-2">
                  <Info size={16} className="text-gold-400" />
                  Rental Rules
                </h3>
                <button onClick={() => setShowRules(false)} className="p-1.5 rounded-lg text-charcoal-300 hover:text-charcoal-50 hover:bg-charcoal-600 transition-colors">
                  <X size={16} />
                </button>
              </div>

              <div className="p-5 space-y-5 max-h-[70vh] overflow-y-auto">

                {/* Rental Rules */}
                <section>
                  <p className="flex items-center gap-1.5 text-xs font-semibold text-charcoal-200 uppercase tracking-wider mb-3">
                    <Clock size={12} /> Rental Rules
                  </p>
                  <div className="space-y-2">
                    {[
                      { label: 'Minimum Rental Days',  value: settings?.['min_rental_days']?.value        || '1',   suffix: 'day(s)' },
                      { label: 'Grace Period',          value: settings?.['rental_grace_period']?.value   || '0',   suffix: 'day(s)' },
                      { label: 'Booking Prefix',        value: settings?.['booking_prefix']?.value        || 'TS',  suffix: '' },
                    ].map(({ label, value, suffix }) => (
                      <div key={label} className="flex justify-between items-center text-sm py-2 border-b border-charcoal-600/50 last:border-0">
                        <span className="text-charcoal-300">{label}</span>
                        <span className="text-charcoal-50 font-medium">{value}{suffix && <span className="text-charcoal-400 font-normal ml-1">{suffix}</span>}</span>
                      </div>
                    ))}
                  </div>
                </section>

                {/* Fine Rules */}
                <section>
                  <p className="flex items-center gap-1.5 text-xs font-semibold text-charcoal-200 uppercase tracking-wider mb-3">
                    <AlertTriangle size={12} /> Late Return Fines
                  </p>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-sm py-2 border-b border-charcoal-600/50">
                      <span className="text-charcoal-300">Default Fine / Day</span>
                      <span className="text-amber-400 font-medium">LKR {settings?.['default_fine_per_day']?.value || '0'}</span>
                    </div>
                    {cartItems.length > 0 && (
                      <>
                        <p className="text-[11px] text-charcoal-400 pt-1">Per-item overrides (current booking)</p>
                        {cartItems.map((item) => (
                          <div key={item.variantId} className="flex justify-between items-center text-sm py-1.5">
                            <div className="flex-1 min-w-0 mr-3">
                              <p className="text-charcoal-100 truncate text-xs">{item.productName}</p>
                              {item.variantInfo && <p className="text-charcoal-400 text-[10px]">{item.variantInfo}</p>}
                            </div>
                            <span className={cn('font-medium text-xs flex-shrink-0', item.lateFinePerDay > 0 ? 'text-amber-400' : 'text-charcoal-400')}>
                              {item.lateFinePerDay > 0 ? `LKR ${item.lateFinePerDay}/day` : 'Uses default'}
                            </span>
                          </div>
                        ))}
                      </>
                    )}
                    {cartItems.length === 0 && (
                      <p className="text-xs text-charcoal-400 italic">Add items to see per-item fine rates</p>
                    )}
                  </div>
                </section>

                {/* Damage Rules */}
                <section>
                  <p className="flex items-center gap-1.5 text-xs font-semibold text-charcoal-200 uppercase tracking-wider mb-3">
                    <Shield size={12} /> Damage Policy
                  </p>
                  <div className="space-y-2">
                    {(() => {
                      const dmgType = settings?.['damage_charge_type']?.value || 'none';
                      return (
                        <>
                          <div className="flex justify-between items-center text-sm py-2 border-b border-charcoal-600/50">
                            <span className="text-charcoal-300">Charge Type</span>
                            <span className={cn('font-medium capitalize px-2 py-0.5 rounded-md text-xs',
                              dmgType === 'none'                ? 'bg-charcoal-600 text-charcoal-200' :
                              dmgType === 'flat'                ? 'bg-blue-500/15 text-blue-400' :
                                                                  'bg-amber-500/15 text-amber-400'
                            )}>
                              {dmgType === 'none' ? 'No charge' : dmgType === 'flat' ? 'Flat amount' : '% of rental cost'}
                            </span>
                          </div>
                          {dmgType === 'flat' && (
                            <div className="flex justify-between items-center text-sm py-2">
                              <span className="text-charcoal-300">Flat Charge</span>
                              <span className="text-red-400 font-medium">LKR {settings?.['damage_flat_charge']?.value || '0'}</span>
                            </div>
                          )}
                          {dmgType === 'percentage_of_rental' && (
                            <div className="flex justify-between items-center text-sm py-2">
                              <span className="text-charcoal-300">Charge %</span>
                              <span className="text-red-400 font-medium">{settings?.['damage_charge_percent']?.value || '0'}% of rental cost</span>
                            </div>
                          )}
                          {dmgType === 'none' && (
                            <p className="text-xs text-charcoal-400 italic">No automatic damage charge configured</p>
                          )}
                        </>
                      );
                    })()}
                  </div>
                </section>

              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
