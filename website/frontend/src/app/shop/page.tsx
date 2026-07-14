"use client";

import { useEffect, useState } from "react";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { ProductCard } from "@/components/shop/ProductCard";
import { ShopHero } from "@/components/shop/ShopHero";
import { Category, ProductSummary, fetchCategories, fetchProducts } from "@/lib/api";

const LIMIT = 12;

export default function ShopPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeSlug, setActiveSlug] = useState<string | undefined>(undefined);
  const [products, setProducts] = useState<ProductSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCategories("sale")
      .then(setCategories)
      .catch(() => setError("Could not load categories"));
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      setLoading(true);
      setError(null);
    });
    fetchProducts("sale", { category: activeSlug, page, limit: LIMIT })
      .then((res) => {
        setProducts(res.data);
        setTotal(res.total);
      })
      .catch(() => setError("Could not load products — is the backend running?"))
      .finally(() => setLoading(false));
  }, [activeSlug, page]);

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <SiteNav theme="light" />

      <ShopHero scrollTargetId="shop-filters" />

      {/* filter bar */}
      <div
        id="shop-filters"
        className="flex flex-wrap gap-3 border-b border-border-light px-6 py-7 sm:px-10 lg:px-14"
      >
        <button
          onClick={() => {
            setActiveSlug(undefined);
            setPage(1);
          }}
          className={
            "cursor-pointer rounded-full border px-5 py-2 text-[13px] transition-colors " +
            (!activeSlug
              ? "border-ink bg-ink text-cream"
              : "border-border-light bg-transparent text-text-body")
          }
        >
          All
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => {
              setActiveSlug(cat.slug);
              setPage(1);
            }}
            className={
              "cursor-pointer rounded-full border px-5 py-2 text-[13px] transition-colors " +
              (activeSlug === cat.slug
                ? "border-ink bg-ink text-cream"
                : "border-border-light bg-transparent text-text-body")
            }
          >
            {cat.name} ({cat.product_count})
          </button>
        ))}
      </div>

      {/* grid */}
      <div className="flex-1 px-6 py-12 sm:px-10 lg:px-14">
        {error && <div className="text-center text-sm text-red-600">{error}</div>}
        {!error && loading && (
          <div className="py-20 text-center text-sm text-text-faint">Loading…</div>
        )}
        {!error && !loading && products.length === 0 && (
          <div className="py-20 text-center text-sm text-text-faint">
            No products available for sale in this category yet.
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
