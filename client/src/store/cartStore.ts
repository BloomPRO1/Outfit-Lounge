import { create } from 'zustand';
import type { CartItem } from '../types';

interface CartState {
  items: CartItem[];
  customerId: string | null;
  customerName: string | null;
  mode: 'sale' | 'rental';
  rentalStartDate: string | null;
  rentalEndDate: string | null;
  discountAmount: number;
  addItem: (item: CartItem) => void;
  removeItem: (variantId: string) => void;
  updateQuantity: (variantId: string, quantity: number) => void;
  updateDiscount: (variantId: string, discount: number) => void;
  setCustomer: (id: string | null, name: string | null) => void;
  setMode: (mode: 'sale' | 'rental') => void;
  setRentalDates: (start: string, end: string) => void;
  setCartDiscount: (amount: number) => void;
  clearCart: () => void;
  getSubtotal: () => number;
  getTotal: () => number;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  customerId: null,
  customerName: null,
  mode: 'sale',
  rentalStartDate: null,
  rentalEndDate: null,
  discountAmount: 0,

  addItem: (newItem) => {
    set((state) => {
      const existing = state.items.find((i) => i.variantId === newItem.variantId);
      if (existing) {
        const max = existing.stockQty ?? Infinity;
        if (existing.quantity >= max) return state; // already at stock limit
        const next = existing.quantity + 1;
        return {
          items: state.items.map((i) =>
            i.variantId === newItem.variantId
              ? { ...i, quantity: next, subtotal: next * (i.unitPrice - i.discount) }
              : i
          ),
        };
      }
      return { items: [...state.items, { ...newItem, quantity: 1, subtotal: newItem.unitPrice - newItem.discount }] };
    });
  },

  removeItem: (variantId) => {
    set((state) => ({ items: state.items.filter((i) => i.variantId !== variantId) }));
  },

  updateQuantity: (variantId, quantity) => {
    if (quantity <= 0) {
      get().removeItem(variantId);
      return;
    }
    set((state) => {
      const item = state.items.find((i) => i.variantId === variantId);
      const capped = item?.stockQty !== undefined ? Math.min(quantity, item.stockQty) : quantity;
      return {
        items: state.items.map((i) =>
          i.variantId === variantId
            ? { ...i, quantity: capped, subtotal: capped * (i.unitPrice - i.discount) }
            : i
        ),
      };
    });
  },

  updateDiscount: (variantId, discount) => {
    set((state) => ({
      items: state.items.map((i) =>
        i.variantId === variantId
          ? { ...i, discount, subtotal: i.quantity * (i.unitPrice - discount) }
          : i
      ),
    }));
  },

  setCustomer: (id, name) => set({ customerId: id, customerName: name }),
  setMode: (mode) => set({ mode }),
  setRentalDates: (start, end) => set({ rentalStartDate: start, rentalEndDate: end }),
  setCartDiscount: (amount) => set({ discountAmount: amount }),

  clearCart: () => set({
    items: [],
    customerId: null,
    customerName: null,
    discountAmount: 0,
    rentalStartDate: null,
    rentalEndDate: null,
  }),

  getSubtotal: () => {
    return get().items.reduce((sum, item) => sum + item.subtotal, 0);
  },

  getTotal: () => {
    const subtotal = get().getSubtotal();
    return Math.max(0, subtotal - get().discountAmount);
  },
}));
