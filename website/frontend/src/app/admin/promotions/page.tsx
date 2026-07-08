"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AdminLayout } from "@/components/admin/AdminLayout";
import {
  fetchAdminPromotions,
  toggleAdminPromotion,
  deleteAdminPromotion,
  AdminPromotion,
} from "@/lib/adminData";

function formatMoney(value: string): string {
  return `Rs ${parseFloat(value).toLocaleString("en-LK", { maximumFractionDigits: 0 })}`;
}

function discountLabel(p: AdminPromotion): string {
  return p.discount_type === "percentage"
    ? `${parseFloat(p.discount_value)}%`
    : formatMoney(p.discount_value);
}

function scopeLabel(scope: string): string {
  if (scope === "sale") return "Shop";
  if (scope === "rental") return "Rent";
  return "Shop & Rent";
}

export default function AdminPromotionsPage() {
  const [promotions, setPromotions] = useState<AdminPromotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function load() {
    queueMicrotask(() => setLoading(true));
    fetchAdminPromotions()
      .then(setPromotions)
      .catch(() => setError("Could not load promotions"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  async function handleToggle(id: string) {
    await toggleAdminPromotion(id);
    load();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this promotion? This cannot be undone.")) return;
    await deleteAdminPromotion(id);
    load();
  }

  return (
    <AdminLayout>
      <div className="flex items-center justify-between">
        <div>
          <div className="font-serif text-3xl text-ink">Promotions</div>
          <div className="mt-1 text-sm text-text-muted">
            Website-only promotions — auto-apply at checkout/booking, no codes.
          </div>
        </div>
        <Link
          href="/admin/promotions/new"
          className="rounded-sm bg-ink px-5 py-2.5 text-sm font-semibold text-white hover:bg-gold-deep"
        >
          + New Promotion
        </Link>
      </div>

      {error && <div className="mt-6 text-sm text-red-600">{error}</div>}
      {loading && <div className="mt-10 text-center text-sm text-text-faint">Loading…</div>}

      {!loading && !error && promotions.length === 0 && (
        <div className="mt-10 rounded-md border border-border-light bg-white p-10 text-center text-sm text-text-faint">
          No promotions yet — create your first one.
        </div>
      )}

      {!loading && !error && promotions.length > 0 && (
        <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-2">
          {promotions.map((p) => (
            <div key={p.id} className="overflow-hidden rounded-md border border-border-light bg-white">
              {p.banner_image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.banner_image} alt={p.title} className="h-32 w-full object-cover" />
              )}
              <div className="p-5">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-serif text-lg text-ink">{p.title}</div>
                  <span
                    className={
                      "rounded-full px-2.5 py-1 text-[11px] " +
                      (p.is_active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700")
                    }
                  >
                    {p.is_active ? "Active" : "Inactive"}
                  </span>
                </div>
                <div className="mt-1.5 text-[13px] text-gold-deep">
                  {discountLabel(p)} off · {scopeLabel(p.scope)}
                  {p.weekend_only && " · Weekends only"}
                </div>
                <div className="mt-1 text-[12px] text-text-faint">
                  {p.categories.length > 0 ? p.categories.map((c) => c.name).join(", ") : "All categories"}
                </div>
                <div className="mt-1 text-[12px] text-text-faint">
                  {p.start_date.slice(0, 10)} → {p.end_date.slice(0, 10)}
                </div>
                <div className="mt-4 flex gap-3 text-[13px]">
                  <Link href={`/admin/promotions/${p.id}/edit`} className="text-gold-deep underline">
                    Edit
                  </Link>
                  <button onClick={() => handleToggle(p.id)} className="cursor-pointer text-text-body underline">
                    {p.is_active ? "Deactivate" : "Activate"}
                  </button>
                  <button onClick={() => handleDelete(p.id)} className="cursor-pointer text-red-600 underline">
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </AdminLayout>
  );
}
