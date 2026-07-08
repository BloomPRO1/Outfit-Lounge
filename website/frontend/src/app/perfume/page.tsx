"use client";

import { useEffect, useState } from "react";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { ProductCard } from "@/components/shop/ProductCard";
import { ProductSummary, fetchProducts } from "@/lib/api";

const LIMIT = 12;
const CATEGORY_SLUG = "perfume";

export default function PerfumePage() {
  const [products, setProducts] = useState<ProductSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    queueMicrotask(() => {
      setLoading(true);
      setError(null);
    });
    fetchProducts("sale", { category: CATEGORY_SLUG, page, limit: LIMIT })
      .then((res) => {
        setProducts(res.data);
        setTotal(res.total);
      })
      .catch(() => setError("Could not load perfumes — is the backend running?"))
      .finally(() => setLoading(false));
  }, [page]);

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <SiteNav theme="light" />

      {/* hero */}
      <div className="relative flex h-[56vh] items-center overflow-hidden bg-ink">
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 900px 500px at 50% 30%, rgba(217,176,84,0.22), transparent 62%), repeating-linear-gradient(120deg, #14110d 0px, #14110d 26px, #181410 26px, #181410 52px)",
          }}
        />
        <div className="relative z-5 max-w-160 px-6 sm:px-10 lg:px-14">
          <div className="text-[13px] tracking-[5px] text-gold">THE FRAGRANCE EDIT</div>
          <div className="mt-3.5 font-serif text-4xl leading-tight text-cream sm:text-5xl">
            Signature Scents
          </div>
          <div className="mt-3.5 text-[15px] text-cream-dim">
            Curated fragrances to complete every look — from everyday essentials to statement
            evening scents.
          </div>
        </div>
      </div>

      {/* grid */}
      <div className="flex-1 px-6 py-12 sm:px-10 lg:px-14">
        {error && <div className="text-center text-sm text-red-600">{error}</div>}
        {!error && loading && (
          <div className="py-20 text-center text-sm text-text-faint">Loading…</div>
        )}
        {!error && !loading && products.length === 0 && (
          <div className="py-20 text-center text-sm text-text-faint">
            No perfumes available right now — check back soon.
          </div>
        )}
        {!error && !loading && products.length > 0 && (
          <>
            <div className="mx-auto grid max-w-[1440px] grid-cols-1 gap-6.5 sm:grid-cols-2 lg:grid-cols-4">
              {products.map((p) => (
                <ProductCard key={p.id} product={p} context="sale" />
              ))}
            </div>
            {totalPages > 1 && (
              <div className="mt-10 flex items-center justify-center gap-4 text-sm">
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
          </>
        )}
      </div>

      <SiteFooter />
    </div>
  );
}
