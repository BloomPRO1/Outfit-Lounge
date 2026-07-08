"use client";

import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { fetchAdminRentals, AdminRental } from "@/lib/adminData";

function formatMoney(value: string): string {
  return `Rs ${parseFloat(value).toLocaleString("en-LK", { maximumFractionDigits: 0 })}`;
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("en-LK", { year: "numeric", month: "short", day: "numeric" });
}

export default function AdminRentalsPage() {
  const [rentals, setRentals] = useState<AdminRental[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    queueMicrotask(() => setLoading(true));
    fetchAdminRentals(page)
      .then((res) => {
        setRentals(res.data);
        setTotal(res.total);
      })
      .catch(() => setError("Could not load rentals"))
      .finally(() => setLoading(false));
  }, [page]);

  const totalPages = Math.max(1, Math.ceil(total / 20));

  return (
    <AdminLayout>
      <div className="font-serif text-3xl text-ink">Rentals</div>
      <div className="mt-1 text-sm text-text-muted">
        All rental bookings ({total}) — website bookings are reserved with no payment; staff
        process pickup/payment via the ERP.
      </div>

      {error && <div className="mt-6 text-sm text-red-600">{error}</div>}
      {loading && <div className="mt-10 text-center text-sm text-text-faint">Loading…</div>}

      {!loading && !error && (
        <div className="mt-6 overflow-x-auto rounded-md border border-border-light bg-white">
          <table className="w-full min-w-200 text-sm">
            <thead>
              <tr className="border-b border-border-light bg-cream-soft text-left text-[12px] tracking-wide text-text-body">
                <th className="px-4 py-3">Booking #</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Dates</th>
                <th className="px-4 py-3">Items</th>
                <th className="px-4 py-3">Cost</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Source</th>
              </tr>
            </thead>
            <tbody>
              {rentals.map((r) => (
                <tr key={r.id} className="border-b border-border-light last:border-0">
                  <td className="px-4 py-3 font-semibold text-ink">{r.booking_number}</td>
                  <td className="px-4 py-3 text-text-body">
                    <div>{r.customer_name ?? "—"}</div>
                    <div className="text-[12px] text-text-faint">{r.customer_email}</div>
                  </td>
                  <td className="px-4 py-3 text-[12px] text-text-faint">
                    {formatDate(r.rental_start_date)} → {formatDate(r.rental_end_date)}
                  </td>
                  <td className="px-4 py-3 text-text-body">{r.item_count}</td>
                  <td className="px-4 py-3 text-text-body">
                    {formatMoney(String(parseFloat(r.total_rental_cost) - parseFloat(r.discount_amount)))}
                    {parseFloat(r.discount_amount) > 0 && (
                      <span className="ml-1.5 text-[12px] text-gold-deep">
                        (-{formatMoney(r.discount_amount)})
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-cream-soft px-2.5 py-1 text-[11px] capitalize text-text-body">
                      {r.status.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[12px] text-text-faint">
                    {r.created_by ? "In-store" : "Website"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-4 text-sm">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="rounded-sm border border-border-light px-4 py-2 disabled:opacity-40"
          >
            Previous
          </button>
          <span className="text-text-faint">
            Page {page} of {totalPages}
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-sm border border-border-light px-4 py-2 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </AdminLayout>
  );
}
