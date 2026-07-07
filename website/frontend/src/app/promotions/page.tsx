"use client";

import { useEffect, useState } from "react";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { fetchPromotions, Promotion, PromotionCode } from "@/lib/promotions";

function formatMoney(value: string): string {
  return `Rs ${parseFloat(value).toLocaleString("en-LK", { maximumFractionDigits: 0 })}`;
}

function promotionBadge(p: Promotion): string {
  if (p.type === "percentage") return `${parseFloat(p.percentage_value ?? "0")}% OFF`;
  if (p.type === "flat_amount") return `${formatMoney(p.flat_amount_value ?? "0")} OFF`;
  if (p.type === "buy_x_get_y") return `BUY ${p.buy_quantity} GET ${p.get_quantity}`;
  return "FREE ITEM";
}

function promotionDesc(p: Promotion): string {
  if (p.description) return p.description;
  if (p.type === "percentage") return `Save ${parseFloat(p.percentage_value ?? "0")}% automatically at checkout.`;
  if (p.type === "flat_amount") return `Save ${formatMoney(p.flat_amount_value ?? "0")} automatically at checkout.`;
  if (p.type === "buy_x_get_y") return `Buy ${p.buy_quantity}, get ${p.get_quantity} free — applied automatically.`;
  return "Applied automatically at checkout.";
}

function scopeLabel(scope: string): string {
  if (scope === "pos") return "Shop";
  if (scope === "rental") return "Rent";
  return "Shop & Rent";
}

export default function PromotionsPage() {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [codes, setCodes] = useState<PromotionCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPromotions()
      .then((res) => {
        setPromotions(res.promotions);
        setCodes(res.codes);
      })
      .catch(() => setError("Could not load promotions — is the backend running?"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <SiteNav theme="light" />

      <div
        className="px-6 py-25 text-center sm:px-10 lg:px-14"
        style={{ background: "linear-gradient(120deg,#d9b054,#f0d99b)" }}
      >
        <div className="text-[13px] tracking-[5px] text-[#3a2f14]">LIMITED TIME</div>
        <div className="mt-3.5 font-serif text-4xl text-ink sm:text-5xl">Current Promotions</div>
        <div className="mt-3.5 text-[15px] text-[#3a3020]">
          Automatic discounts and promo codes — save on rentals and purchases.
        </div>
      </div>

      <div className="mx-auto w-full max-w-6xl flex-1 px-6 py-20 sm:px-10 lg:px-14">
        {loading && <div className="text-center text-sm text-text-faint">Loading…</div>}
        {error && <div className="text-center text-sm text-red-600">{error}</div>}

        {!loading && !error && (
          <>
            <div className="font-serif text-2xl text-ink">Automatic Discounts</div>
            <div className="mt-1 text-sm text-text-faint">
              Applied automatically at checkout — no code needed.
            </div>
            {promotions.length === 0 ? (
              <div className="mt-6 rounded border border-border-light p-6 text-sm text-text-faint">
                No automatic promotions are running right now — check back soon, or see the promo
                codes below.
              </div>
            ) : (
              <div className="mt-6 grid grid-cols-1 gap-7 sm:grid-cols-2 lg:grid-cols-3">
                {promotions.map((p) => (
                  <div
                    key={p.id}
                    className="overflow-hidden rounded-md border border-border-light transition-all duration-350 hover:-translate-y-2 hover:shadow-[0_20px_40px_-14px_rgba(0,0,0,0.22)]"
                  >
                    <div className="relative flex h-30 items-center justify-center bg-ink">
                      <div className="absolute top-3.5 right-3.5 rounded-sm bg-cream-soft px-3.5 py-1.5 text-xs font-bold text-ink">
                        {promotionBadge(p)}
                      </div>
                      <span className="font-mono text-[10px] tracking-wide text-text-faint">
                        {scopeLabel(p.scope).toUpperCase()}
                      </span>
                    </div>
                    <div className="p-6">
                      <div className="font-serif text-xl text-ink">{p.name}</div>
                      <div className="mt-2.5 text-sm leading-relaxed text-text-muted">
                        {promotionDesc(p)}
                      </div>
                      <div className="mt-4 text-xs text-gold-deep">
                        Valid until {new Date(p.end_date).toLocaleDateString("en-LK", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-16 font-serif text-2xl text-ink">Promo Codes</div>
            <div className="mt-1 text-sm text-text-faint">
              Enter these at checkout on the Shop or Rent order page.
            </div>
            {codes.length === 0 ? (
              <div className="mt-6 rounded border border-border-light p-6 text-sm text-text-faint">
                No promo codes are active right now.
              </div>
            ) : (
              <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {codes.map((c) => (
                  <div key={c.id} className="rounded-md border border-gold/40 bg-cream-soft p-6">
                    <div className="font-mono text-lg font-bold tracking-wide text-ink">{c.code}</div>
                    <div className="mt-1.5 font-serif text-lg text-ink">{c.name}</div>
                    {c.description && (
                      <div className="mt-1.5 text-sm text-text-muted">{c.description}</div>
                    )}
                    <div className="mt-3 text-sm font-semibold text-gold-deep">
                      {c.discount_type === "percentage"
                        ? `${parseFloat(c.discount_value)}% off`
                        : `${formatMoney(c.discount_value)} off`}{" "}
                      · {scopeLabel(c.scope)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <SiteFooter />
    </div>
  );
}
