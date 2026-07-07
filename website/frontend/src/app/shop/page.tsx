"use client";

import { useEffect, useState } from "react";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { ProductCard } from "@/components/shop/ProductCard";
import { Category, ProductSummary, fetchCategories, fetchProducts } from "@/lib/api";

const SHELF_SWATCHES = [
  "repeating-linear-gradient(180deg,#e9e4d8,#e9e4d8 10px,#ddd6c5 10px,#ddd6c5 20px)",
  "#efece4",
  "#e5e0d4",
  "#efece4",
  "#e5e0d4",
  "#efece4",
  "#e5e0d4",
  "#efece4",
  "#e5e0d4",
  "#efece4",
  "#e5e0d4",
  "#efece4",
];

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

      {/* hero */}
      <div className="relative flex h-[56vh] items-center overflow-hidden bg-[#f5f1e6]">
        <div className="absolute inset-0 flex gap-0.5 opacity-60">
          {SHELF_SWATCHES.map((bg, i) => (
            <div key={i} className="flex-1" style={{ background: bg }} />
          ))}
        </div>
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(90deg, #f5f1e6, rgba(245,241,230,0.4) 55%, #f5f1e6)",
          }}
        />
        <div className="relative z-5 max-w-160 px-6 sm:px-10 lg:px-14">
          <div className="text-[13px] tracking-[5px] text-gold-deep">THE PERMANENT COLLECTION</div>
          <div className="mt-3.5 font-serif text-4xl leading-tight text-ink sm:text-5xl">
            Own Your Signature Style
          </div>
          <div className="mt-3.5 text-[15px] text-text-muted">
            Hand-finished suits and accessories, tailored and shipped to fit — yours to keep.
          </div>
        </div>
      </div>

      {/* filter bar */}
      <div className="flex flex-wrap gap-3 border-b border-border-light px-6 py-7 sm:px-10 lg:px-14">
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
