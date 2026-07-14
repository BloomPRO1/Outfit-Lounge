"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { ProductCard } from "@/components/shop/ProductCard";
import { PerfumeHero } from "@/components/shop/PerfumeHero";
import { ProductSummary, fetchProducts } from "@/lib/api";

const gridContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};
const gridItem = {
  hidden: { opacity: 0, y: 22 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] as const } },
};

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

      <PerfumeHero scrollTargetId="perfume-grid" />

      {/* grid */}
      <div id="perfume-grid" className="flex-1 px-6 py-12 sm:px-10 lg:px-14">
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
            <motion.div
              className="mx-auto grid max-w-[1440px] grid-cols-1 gap-6.5 sm:grid-cols-2 lg:grid-cols-4"
              variants={gridContainer}
              initial="hidden"
              animate="show"
            >
              {products.map((p) => (
                <motion.div key={p.id} variants={gridItem}>
                  <ProductCard product={p} context="sale" />
                </motion.div>
              ))}
            </motion.div>
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
