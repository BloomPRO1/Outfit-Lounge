"use client";

import { useEffect, useState } from "react";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { ProductCard } from "@/components/shop/ProductCard";
import { DateRangePicker, defaultDateRange } from "@/components/shop/DateRangePicker";
import { Category, DateRange, ProductSummary, fetchCategories, fetchProducts } from "@/lib/api";

const WALL_COLORS = [
  "linear-gradient(180deg,#2a231a,#0e0b08)",
  "linear-gradient(180deg,#241d15,#0e0b08)",
  "linear-gradient(180deg,#1e2436,#0b0d14)",
  "linear-gradient(180deg,#2a1420,#100609)",
  "linear-gradient(180deg,#2a231a,#0e0b08)",
  "linear-gradient(180deg,#241d15,#0e0b08)",
];

const LIMIT = 12;

export default function RentPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeSlug, setActiveSlug] = useState<string | undefined>(undefined);
  const [dateRange, setDateRange] = useState<DateRange>(defaultDateRange());
  const [products, setProducts] = useState<ProductSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCategories("rent")
      .then(setCategories)
      .catch(() => setError("Could not load categories"));
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      setLoading(true);
      setError(null);
    });
    fetchProducts("rent", { category: activeSlug, page, limit: LIMIT, dateRange })
      .then((res) => {
        setProducts(res.data);
        setTotal(res.total);
      })
      .catch(() => setError("Could not load rentals — is the backend running?"))
      .finally(() => setLoading(false));
  }, [activeSlug, page, dateRange]);

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <SiteNav theme="light" />

      {/* hero */}
      <div className="relative flex h-[56vh] items-center overflow-hidden bg-ink">
        <div className="absolute inset-0 flex gap-0.5 opacity-90">
          {WALL_COLORS.map((bg, i) => (
            <div key={i} className="flex-1" style={{ background: bg }} />
          ))}
        </div>
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(90deg, rgba(11,11,12,0.9), rgba(11,11,12,0.3) 60%, rgba(11,11,12,0.9))",
          }}
        />
        <div className="relative z-5 max-w-160 px-6 sm:px-10 lg:px-14">
          <div className="text-[13px] tracking-[5px] text-gold">THE RENTAL WALL</div>
          <div className="mt-3.5 font-serif text-4xl leading-tight text-cream sm:text-5xl">
            Rent The Perfect Look
          </div>
          <div className="mt-3.5 text-[15px] text-cream-dim">
            Premium suits and blazers, ready for your next occasion — cleaned, pressed and
            fitted for you.
          </div>
        </div>
      </div>

      {/* dates + filter bar */}
      <div className="flex flex-wrap items-end gap-6 border-b border-border-light px-6 py-7 sm:px-10 lg:px-14">
        <DateRangePicker
          value={dateRange}
          onChange={(r) => {
            setDateRange(r);
            setPage(1);
          }}
        />
        <div className="flex flex-wrap gap-3">
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
      </div>

      <div className="px-6 pt-4 text-[13px] text-text-faint sm:px-10 lg:px-14">
        Showing availability for {dateRange.startDate} → {dateRange.endDate}
      </div>

      {/* grid */}
      <div className="flex-1 px-6 py-8 sm:px-10 lg:px-14">
        {error && <div className="text-center text-sm text-red-600">{error}</div>}
        {!error && loading && (
          <div className="py-20 text-center text-sm text-text-faint">Loading…</div>
        )}
        {!error && !loading && products.length === 0 && (
          <div className="py-20 text-center text-sm text-text-faint">
            Nothing available to rent for these dates in this category.
          </div>
        )}
        {!error && !loading && products.length > 0 && (
          <>
            <div className="mx-auto grid max-w-[1440px] grid-cols-1 gap-6.5 sm:grid-cols-2 lg:grid-cols-4">
              {products.map((p) => (
                <ProductCard key={p.id} product={p} context="rent" />
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
