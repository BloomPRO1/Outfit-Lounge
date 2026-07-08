import { getToken } from "@/lib/auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

export type Discount = { title: string; discount: string };

export type OrderSummary = {
  id: string;
  sale_number: string;
  status: string;
  subtotal: string;
  discount_amount: string;
  total_amount: string;
  created_at: string;
  items: Array<{
    productName: string;
    variantInfo: string;
    quantity: number;
    unitPrice: string;
    subtotal: string;
  }>;
  promotion_discounts: Discount[];
};

export type RentalSummary = {
  id: string;
  booking_number: string;
  status: string;
  rental_start_date: string;
  rental_end_date: string;
  total_rental_cost: string;
  discount_amount: string;
  created_at: string;
  items: Array<{
    productName: string;
    size: string | null;
    color: string | null;
    quantity: number;
    pricePerDay: string;
    isReturned: boolean;
  }>;
  promotion_discounts: Discount[];
};

export async function fetchAccountSummary(): Promise<{
  orders: OrderSummary[];
  rentals: RentalSummary[];
}> {
  const token = getToken();
  if (!token) throw new Error("Please log in");

  const res = await fetch(`${API_URL}/account/summary`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Failed to load account summary");
  return res.json();
}
