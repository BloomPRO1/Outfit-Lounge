const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

export type Promotion = {
  id: string;
  title: string;
  description: string | null;
  banner_image: string | null;
  discount_type: "percentage" | "flat_amount";
  discount_value: string;
  scope: "sale" | "rental" | "both";
  weekend_only: boolean;
  min_order_amount: string | null;
  start_date: string;
  end_date: string;
  categories: Array<{ id: string; name: string; slug: string }>;
};

export async function fetchPromotions(): Promise<{ promotions: Promotion[] }> {
  const res = await fetch(`${API_URL}/promotions`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load promotions");
  return res.json();
}
