const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

export type ShopContext = "sale" | "rent";

export type Category = {
  id: string;
  name: string;
  slug: string;
  product_count: number;
};

export type ProductSummary = {
  id: string;
  name: string;
  description: string | null;
  category_name: string | null;
  category_slug: string | null;
  from_price: string | null;
  max_available_qty?: number;
  primary_image_id: string | null;
};

export type ProductVariant = {
  id: string;
  sku: string;
  size: string | null;
  color: string | null;
  material: string | null;
  selling_price: string | null;
  rental_price_per_day: string | null;
  stock_quantity: number;
  available_for_rent: number;
  available_qty?: number;
};

export type DateRange = { startDate: string; endDate: string };

export type ProductDetail = {
  id: string;
  name: string;
  description: string | null;
  sku: string;
  type: "sale" | "rental" | "both";
  selling_price: string | null;
  rental_price_per_day: string | null;
  category_name: string | null;
  category_slug: string | null;
  variants: ProductVariant[];
  images: { id: string; is_primary: boolean }[];
};

export type ProductListResponse = {
  data: ProductSummary[];
  total: number;
  page: number;
  limit: number;
  dateRange?: DateRange | null;
};

export function imageUrl(imageId: string, size = 600): string {
  return `${API_URL}/images/${imageId}?size=${size}`;
}

export async function fetchCategories(context: ShopContext): Promise<Category[]> {
  const res = await fetch(`${API_URL}/categories?context=${context}`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load categories");
  return res.json();
}

export async function fetchProducts(
  context: ShopContext,
  opts: {
    category?: string;
    search?: string;
    page?: number;
    limit?: number;
    dateRange?: DateRange;
  } = {}
): Promise<ProductListResponse> {
  const params = new URLSearchParams({ context });
  if (opts.category) params.set("category", opts.category);
  if (opts.search) params.set("search", opts.search);
  if (opts.page) params.set("page", String(opts.page));
  if (opts.limit) params.set("limit", String(opts.limit));
  if (opts.dateRange) {
    params.set("startDate", opts.dateRange.startDate);
    params.set("endDate", opts.dateRange.endDate);
  }

  const res = await fetch(`${API_URL}/products?${params.toString()}`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load products");
  return res.json();
}

export async function fetchProduct(
  id: string,
  context: ShopContext,
  dateRange?: DateRange
): Promise<ProductDetail | null> {
  const params = new URLSearchParams({ context });
  if (dateRange) {
    params.set("startDate", dateRange.startDate);
    params.set("endDate", dateRange.endDate);
  }
  const res = await fetch(`${API_URL}/products/${id}?${params.toString()}`, { cache: "no-store" });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error("Failed to load product");
  return res.json();
}

export type ContactFormInput = {
  name: string;
  email: string;
  phone?: string;
  subject?: string;
  message: string;
};

export async function submitContactForm(input: ContactFormInput): Promise<void> {
  const res = await fetch(`${API_URL}/contact`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error || "Failed to send message — please try again.");
  }
}
