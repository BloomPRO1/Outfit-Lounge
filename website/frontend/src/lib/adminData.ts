import { adminApiFetch } from "@/lib/adminAuth";

async function parseErrorMessage(res: Response, fallback: string): Promise<string> {
  try {
    const body = await res.json();
    return body?.error || fallback;
  } catch {
    return fallback;
  }
}

async function get<T>(path: string): Promise<T> {
  const res = await adminApiFetch(path, { cache: "no-store" });
  if (!res.ok) throw new Error(await parseErrorMessage(res, "Request failed"));
  return res.json();
}

export type Overview = {
  activeProducts: number;
  totalStockUnits: number;
  totalAvailableForRent: number;
  stockValue: string;
  websiteOrders: number;
  websiteRevenue: string;
  websiteRentals: number;
  activeWebsiteRentals: number;
  websiteCustomers: number;
  activePromotions: number;
};

export function fetchOverview(): Promise<Overview> {
  return get("/admin/dashboard/overview");
}

export type AdminProductVariant = {
  id: string;
  sku: string;
  size: string | null;
  color: string | null;
  stockQuantity: number;
  availableForRent: number;
  sellingPrice: string | null;
  rentalPricePerDay: string | null;
};

export type AdminProduct = {
  id: string;
  name: string;
  sku: string;
  type: "sale" | "rental" | "both";
  is_active: boolean;
  selling_price: string | null;
  rental_price_per_day: string | null;
  category_name: string | null;
  variants: AdminProductVariant[];
};

export type Paginated<T> = { data: T[]; total: number; page: number; limit: number };

export function fetchAdminProducts(page = 1, search = ""): Promise<Paginated<AdminProduct>> {
  const params = new URLSearchParams({ page: String(page), limit: "20" });
  if (search) params.set("search", search);
  return get(`/admin/dashboard/products?${params.toString()}`);
}

export type AdminOrder = {
  id: string;
  sale_number: string;
  status: string;
  subtotal: string;
  discount_amount: string;
  total_amount: string;
  payment_method: string;
  created_at: string;
  created_by: string | null;
  customer_name: string | null;
  customer_email: string | null;
  item_count: number;
};

export function fetchAdminOrders(page = 1): Promise<Paginated<AdminOrder>> {
  return get(`/admin/dashboard/orders?page=${page}&limit=20`);
}

export type AdminRental = {
  id: string;
  booking_number: string;
  status: string;
  rental_start_date: string;
  rental_end_date: string;
  total_rental_cost: string;
  discount_amount: string;
  advance_payment: string;
  created_at: string;
  created_by: string | null;
  customer_name: string | null;
  customer_email: string | null;
  item_count: number;
};

export function fetchAdminRentals(page = 1): Promise<Paginated<AdminRental>> {
  return get(`/admin/dashboard/rentals?page=${page}&limit=20`);
}

export type AdminCustomer = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  created_at: string;
  order_count: number;
  rental_count: number;
};

export function fetchAdminCustomers(page = 1): Promise<Paginated<AdminCustomer>> {
  return get(`/admin/dashboard/customers?page=${page}&limit=20`);
}

export type AdminCategory = { id: string; name: string; slug: string };

export function fetchAdminCategories(): Promise<AdminCategory[]> {
  return get(`/admin/categories`);
}

export type AdminPromotion = {
  id: string;
  title: string;
  description: string | null;
  banner_image: string | null;
  discount_type: "percentage" | "flat_amount";
  discount_value: string;
  scope: "sale" | "rental" | "both";
  category_ids: string[] | null;
  weekend_only: boolean;
  min_order_amount: string | null;
  start_date: string;
  end_date: string;
  is_active: boolean;
  created_at: string;
  categories: Array<{ id: string; name: string; slug: string }>;
};

export type PromotionFormInput = {
  title: string;
  description?: string;
  bannerImage?: string | null;
  discountType: "percentage" | "flat_amount";
  discountValue: number;
  scope: "sale" | "rental" | "both";
  categoryIds: string[];
  weekendOnly: boolean;
  minOrderAmount?: number | null;
  startDate: string;
  endDate: string;
  isActive: boolean;
};

export function fetchAdminPromotions(): Promise<AdminPromotion[]> {
  return get("/admin/promotions");
}

export async function createAdminPromotion(input: PromotionFormInput): Promise<AdminPromotion> {
  const res = await adminApiFetch("/admin/promotions", {
    method: "POST",
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(await parseErrorMessage(res, "Failed to create promotion"));
  return res.json();
}

export async function updateAdminPromotion(
  id: string,
  input: Partial<PromotionFormInput>
): Promise<AdminPromotion> {
  const res = await adminApiFetch(`/admin/promotions/${id}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(await parseErrorMessage(res, "Failed to update promotion"));
  return res.json();
}

export async function deleteAdminPromotion(id: string): Promise<void> {
  const res = await adminApiFetch(`/admin/promotions/${id}`, { method: "DELETE" });
  if (!res.ok && res.status !== 204) throw new Error(await parseErrorMessage(res, "Failed to delete promotion"));
}

export async function toggleAdminPromotion(id: string): Promise<AdminPromotion> {
  const res = await adminApiFetch(`/admin/promotions/${id}/toggle`, { method: "PATCH" });
  if (!res.ok) throw new Error(await parseErrorMessage(res, "Failed to toggle promotion"));
  return res.json();
}

export type ContactSubmission = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  subject: string | null;
  message: string;
  status: "new" | "read";
  created_at: string;
};

export function fetchAdminContactSubmissions(): Promise<ContactSubmission[]> {
  return get("/admin/contact-submissions");
}

export async function markContactSubmissionRead(id: string): Promise<ContactSubmission> {
  const res = await adminApiFetch(`/admin/contact-submissions/${id}/read`, { method: "PATCH" });
  if (!res.ok) throw new Error(await parseErrorMessage(res, "Failed to update submission"));
  return res.json();
}

export async function deleteContactSubmission(id: string): Promise<void> {
  const res = await adminApiFetch(`/admin/contact-submissions/${id}`, { method: "DELETE" });
  if (!res.ok && res.status !== 204) {
    throw new Error(await parseErrorMessage(res, "Failed to delete submission"));
  }
}
