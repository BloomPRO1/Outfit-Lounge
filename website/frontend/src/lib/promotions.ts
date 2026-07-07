const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

export type Promotion = {
  id: string;
  name: string;
  description: string | null;
  type: "percentage" | "flat_amount" | "buy_x_get_y" | "free_item";
  scope: "pos" | "rental" | "both";
  percentage_value: string | null;
  flat_amount_value: string | null;
  buy_quantity: number | null;
  get_quantity: number | null;
  min_order_amount: string | null;
  end_date: string;
};

export type PromotionCode = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  discount_type: "percentage" | "flat_amount";
  discount_value: string;
  scope: "pos" | "rental" | "both";
};

export async function fetchPromotions(): Promise<{ promotions: Promotion[]; codes: PromotionCode[] }> {
  const res = await fetch(`${API_URL}/promotions`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load promotions");
  return res.json();
}
