"use client";

import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { fetchAdminCustomers, AdminCustomer } from "@/lib/adminData";

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("en-LK", { year: "numeric", month: "short", day: "numeric" });
}

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<AdminCustomer[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    queueMicrotask(() => setLoading(true));
    fetchAdminCustomers(page)
      .then((res) => {
        setCustomers(res.data);
        setTotal(res.total);
      })
      .catch(() => setError("Could not load customers"))
      .finally(() => setLoading(false));
  }, [page]);

  const totalPages = Math.max(1, Math.ceil(total / 20));

  return (
    <AdminLayout>
      <div className="font-serif text-3xl text-ink">Customers</div>
      <div className="mt-1 text-sm text-text-muted">Registered website accounts ({total}).</div>

      {error && <div className="mt-6 text-sm text-red-600">{error}</div>}
      {loading && <div className="mt-10 text-center text-sm text-text-faint">Loading…</div>}

      {!loading && !error && (
        <div className="mt-6 overflow-x-auto rounded-md border border-border-light bg-white">
          <table className="w-full min-w-160 text-sm">
            <thead>
              <tr className="border-b border-border-light bg-cream-soft text-left text-[12px] tracking-wide text-text-body">
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Orders</th>
                <th className="px-4 py-3">Rentals</th>
                <th className="px-4 py-3">Joined</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.id} className="border-b border-border-light last:border-0">
                  <td className="px-4 py-3 text-ink">{c.name}</td>
                  <td className="px-4 py-3 text-text-body">{c.email}</td>
                  <td className="px-4 py-3 text-text-body">{c.phone ?? "—"}</td>
                  <td className="px-4 py-3 text-text-body">{c.order_count}</td>
                  <td className="px-4 py-3 text-text-body">{c.rental_count}</td>
                  <td className="px-4 py-3 text-[12px] text-text-faint">{formatDate(c.created_at)}</td>
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
