"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { fetchPromotions, Promotion } from "@/lib/promotions";

const textContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12 } },
};
const textItem = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] as const } },
};
const gridContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
};
const gridItem = {
  hidden: { opacity: 0, y: 26 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const } },
};

function formatMoney(value: string): string {
  return `Rs ${parseFloat(value).toLocaleString("en-LK", { maximumFractionDigits: 0 })}`;
}

function promotionBadge(p: Promotion): string {
  return p.discount_type === "percentage"
    ? `${parseFloat(p.discount_value)}% OFF`
    : `${formatMoney(p.discount_value)} OFF`;
}

function scopeLabel(scope: string): string {
  if (scope === "sale") return "Shop";
  if (scope === "rental") return "Rent";
  return "Shop & Rent";
}

function categoryLabel(p: Promotion): string {
  if (p.categories.length === 0) return "All Categories";
  return p.categories.map((c) => c.name).join(", ");
}

export default function PromotionsPage() {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPromotions()
      .then((res) => setPromotions(res.promotions))
      .catch(() => setError("Could not load promotions — is the backend running?"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <SiteNav theme="light" />

      <motion.div
        className="px-6 py-25 text-center sm:px-10 lg:px-14"
        style={{ background: "linear-gradient(120deg,#d9b054,#f0d99b)" }}
        variants={textContainer}
        initial="hidden"
        animate="show"
      >
        <motion.div variants={textItem} className="text-[13px] tracking-[5px] text-[#3a2f14]">
          LIMITED TIME
        </motion.div>
        <motion.div variants={textItem} className="mt-3.5 font-serif text-4xl text-ink sm:text-5xl">
          Current Promotions
        </motion.div>
        <motion.div variants={textItem} className="mt-3.5 text-[15px] text-[#3a3020]">
          Automatic discounts on Shop and Rent — no codes needed, just add to cart.
        </motion.div>
      </motion.div>

      <div className="mx-auto w-full max-w-6xl flex-1 px-6 py-20 sm:px-10 lg:px-14">
        {loading && <div className="text-center text-sm text-text-faint">Loading…</div>}
        {error && <div className="text-center text-sm text-red-600">{error}</div>}

        {!loading && !error && promotions.length === 0 && (
          <div className="rounded border border-border-light p-10 text-center text-sm text-text-faint">
            No promotions are running right now — check back soon.
          </div>
        )}

        {!loading && !error && promotions.length > 0 && (
          <motion.div
            className="grid grid-cols-1 gap-7 sm:grid-cols-2 lg:grid-cols-3"
            variants={gridContainer}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-60px" }}
          >
            {promotions.map((p) => (
              <motion.div
                key={p.id}
                variants={gridItem}
                className="overflow-hidden rounded-md border border-border-light transition-all duration-350 hover:-translate-y-2 hover:shadow-[0_20px_40px_-14px_rgba(0,0,0,0.22)]"
              >
                <div className="relative flex h-40 items-center justify-center bg-ink">
                  {p.banner_image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.banner_image} alt={p.title} className="h-full w-full object-cover" />
                  ) : (
                    <span className="font-mono text-[10px] tracking-wide text-text-faint">
                      {categoryLabel(p).toUpperCase()}
                    </span>
                  )}
                  <div className="absolute top-3.5 right-3.5 rounded-sm bg-cream-soft px-3.5 py-1.5 text-xs font-bold text-ink">
                    {promotionBadge(p)}
                  </div>
                  {p.weekend_only && (
                    <div className="absolute top-3.5 left-3.5 rounded-sm bg-gold px-2.5 py-1 text-[11px] font-bold text-ink">
                      WEEKENDS ONLY
                    </div>
                  )}
                </div>
                <div className="p-6">
                  <div className="font-serif text-xl text-ink">{p.title}</div>
                  <div className="mt-1 text-[13px] text-gold-deep">
                    {scopeLabel(p.scope)} · {categoryLabel(p)}
                  </div>
                  {p.description && (
                    <div className="mt-2.5 text-sm leading-relaxed text-text-muted">{p.description}</div>
                  )}
                  <div className="mt-4 text-xs text-text-faint">
                    Valid until{" "}
                    {new Date(p.end_date).toLocaleDateString("en-LK", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>

      <SiteFooter />
    </div>
  );
}
