/**
 * Singleton BroadcastChannel for sending real-time updates to the
 * customer-facing display window (/customer-display).
 */

let _ch: BroadcastChannel | null = null;
const ch = () => {
  if (!_ch) _ch = new BroadcastChannel('pos-customer-display');
  return _ch;
};

export interface DisplayCartItem {
  productName: string;
  variantSku: string;
  variantLabel: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  subtotal: number;
  image?: string | null;
}

export interface DisplayRentalItem {
  productName: string;
  variantSku: string;
  variantLabel: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export const customerDisplay = {
  sendShopInfo(shopName: string, shopLogo: string) {
    try { ch().postMessage({ type: 'shop_info', shopName, shopLogo }); } catch {}
  },
  sendCart(
    items: DisplayCartItem[],
    subtotal: number,
    discount: number,
    total: number,
    customerName: string | null
  ) {
    try { ch().postMessage({ type: 'pos_cart', items, subtotal, discount, total, customerName }); } catch {}
  },
  sendCheckout(total: number, amountPaid: number, change: number, customerName: string | null) {
    try { ch().postMessage({ type: 'pos_checkout', total, amountPaid, change, customerName }); } catch {}
  },
  sendRental(
    items: DisplayRentalItem[],
    total: number,
    customerName: string,
    startDate: string,
    endDate: string
  ) {
    try { ch().postMessage({ type: 'rental', items, total, customerName, startDate, endDate }); } catch {}
  },
  sendIdle() {
    try { ch().postMessage({ type: 'idle' }); } catch {}
  },
};
