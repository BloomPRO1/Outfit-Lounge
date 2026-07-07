import { getToken } from "@/lib/auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

async function parseErrorMessage(res: Response, fallback: string): Promise<string> {
  try {
    const body = await res.json();
    return body?.error || fallback;
  } catch {
    return fallback;
  }
}

export type AppliedPromotion = { name: string; discount: number } | null;
export type AppliedPromoCode = { code: string; discount: number } | null;

export type SaleResult = {
  sale: {
    id: string;
    sale_number: string;
    subtotal: string;
    discount_amount: string;
    total_amount: string;
  };
  items: Array<{ productName: string; quantity: number; unitPrice: number; itemSubtotal: number }>;
  appliedPromotion: AppliedPromotion;
  appliedPromoCode: AppliedPromoCode;
};

export async function checkout(input: {
  items: Array<{ variantId: string; quantity: number }>;
  notes?: string;
  promoCode?: string;
}): Promise<SaleResult> {
  const token = getToken();
  if (!token) throw new Error("Please log in to check out");

  const res = await fetch(`${API_URL}/checkout`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(await parseErrorMessage(res, "Checkout failed"));
  return res.json();
}

export type BookingResult = {
  rental: {
    id: string;
    booking_number: string;
    total_rental_cost: string;
    discount_amount: string;
  };
  days: number;
  pricePerDay: number;
  totalCost: number;
  netCost: number;
  appliedPromotion: AppliedPromotion;
  appliedPromoCode: AppliedPromoCode;
};

export async function createBooking(input: {
  variantId: string;
  quantity?: number;
  startDate: string;
  endDate: string;
  notes?: string;
  promoCode?: string;
}): Promise<BookingResult> {
  const token = getToken();
  if (!token) throw new Error("Please log in to book");

  const res = await fetch(`${API_URL}/bookings`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(await parseErrorMessage(res, "Booking failed"));
  return res.json();
}
