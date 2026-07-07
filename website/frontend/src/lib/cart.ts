export type CartItem = {
  variantId: string;
  productId: string;
  name: string;
  size: string | null;
  color: string | null;
  unitPrice: number;
  quantity: number;
  imageId: string | null;
};

const CART_KEY = "outfit_lounge_cart";

export function readCart(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(CART_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function writeCart(items: CartItem[]): void {
  window.localStorage.setItem(CART_KEY, JSON.stringify(items));
}
