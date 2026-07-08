"use client";

import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { fetchAdminProducts, AdminProduct } from "@/lib/adminData";

export default function AdminProductsPage() {
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    queueMicrotask(() => setLoading(true));
    fetchAdminProducts(page, search)
      .then((res) => {
        setProducts(res.data);
        setTotal(res.total);
      })
      .catch(() => setError("Could not load products"))
      .finally(() => setLoading(false));
  }, [page, search]);

  const totalPages = Math.max(1, Math.ceil(total / 20));

  return (
    <AdminLayout>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="font-serif text-3xl text-ink">Products & Stock</div>
          <div className="mt-1 text-sm text-text-muted">
            Full ERP inventory (read-only) — {total} product{total === 1 ? "" : "s"}.
          </div>
        </div>
        <input
          type="text"
          placeholder="Search by name or SKU…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="w-64 rounded border border-border-light px-3.5 py-2 text-sm focus:border-gold focus:outline-none"
        />
      </div>

      {error && <div className="mt-6 text-sm text-red-600">{error}</div>}
      {loading && <div className="mt-10 text-center text-sm text-text-faint">Loading…</div>}

      {!loading && !error && (
        <div className="mt-6 overflow-x-auto rounded-md border border-border-light bg-white">
          <table className="w-full min-w-200 text-sm">
            <thead>
              <tr className="border-b border-border-light bg-cream-soft text-left text-[12px] tracking-wide text-text-body">
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Variants</th>
                <th className="px-4 py-3">Sale Stock</th>
                <th className="px-4 py-3">Rent Available</th>
                <th className="px-4 py-3">Active</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => {
                const totalStock = p.variants.reduce((s, v) => s + v.stockQuantity, 0);
                const totalRent = p.variants.reduce((s, v) => s + v.availableForRent, 0);
                return (
                  <tr key={p.id} className="border-b border-border-light last:border-0">
                    <td className="px-4 py-3">
                      <div className="text-ink">{p.name}</div>
                      <div className="text-[12px] text-text-faint">{p.sku}</div>
                    </td>
                    <td className="px-4 py-3 text-text-body">{p.category_name ?? "—"}</td>
                    <td className="px-4 py-3 capitalize text-text-body">{p.type}</td>
                    <td className="px-4 py-3 text-text-body">{p.variants.length}</td>
                    <td className="px-4 py-3 text-text-body">{totalStock - totalRent}</td>
                    <td className="px-4 py-3 text-text-body">{totalRent}</td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          "rounded-full px-2.5 py-1 text-[11px] " +
                          (p.is_active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700")
                        }
                      >
                        {p.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                  </tr>
                );
              })}
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
