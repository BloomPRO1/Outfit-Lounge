"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { useAuth } from "@/lib/useAuth";
import { fetchAccountSummary, OrderSummary, RentalSummary, Discount } from "@/lib/account";

function formatMoney(value: string): string {
  return `Rs ${parseFloat(value).toLocaleString("en-LK", { maximumFractionDigits: 0 })}`;
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("en-LK", { year: "numeric", month: "short", day: "numeric" });
}

function DiscountBadge({ d }: { d: Discount }) {
  return (
    <span className="inline-block rounded-full bg-cream-soft px-3 py-1 text-[12px] text-gold-deep">
      {d.title} — saved {formatMoney(d.discount)}
    </span>
  );
}

export default function AccountPage() {
  const { customer, loading: authLoading } = useAuth();
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [rentals, setRentals] = useState<RentalSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!customer) return;
    fetchAccountSummary()
      .then((res) => {
        setOrders(res.orders);
        setRentals(res.rentals);
      })
      .catch(() => setError("Could not load your account — is the backend running?"))
      .finally(() => setLoading(false));
  }, [customer]);

  if (!authLoading && !customer) {
    return (
      <div className="flex min-h-screen flex-col bg-white">
        <SiteNav theme="light" />
        <div className="flex-1 py-32 text-center">
          <div className="font-serif text-2xl text-ink">Please log in to view your account</div>
          <Link href="/login?next=/account" className="mt-6 inline-block text-sm text-gold-deep underline">
            Log In
          </Link>
        </div>
        <SiteFooter />
      </div>
    );
  }

  const allDiscounts: Array<Discount & { source: string }> = [
    ...orders.flatMap((o) => o.promotion_discounts.map((d) => ({ ...d, source: o.sale_number }))),
    ...rentals.flatMap((r) => r.promotion_discounts.map((d) => ({ ...d, source: r.booking_number }))),
  ];

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <SiteNav theme="light" />

      <div className="mx-auto w-full max-w-4xl flex-1 px-6 py-14 sm:px-10">
        <div className="font-serif text-3xl text-ink">My Account</div>
        {customer && (
          <div className="mt-1 text-sm text-text-muted">
            {customer.name} · {customer.email}
            {customer.phone ? ` · ${customer.phone}` : ""}
          </div>
        )}

        {loading && <div className="mt-10 text-center text-sm text-text-faint">Loading…</div>}
        {error && <div className="mt-10 text-center text-sm text-red-600">{error}</div>}

        {!loading && !error && (
          <>
            {/* Promotions received */}
            <div className="mt-12">
              <div className="font-serif text-xl text-ink">Promotions You&apos;ve Received</div>
              {allDiscounts.length === 0 ? (
                <div className="mt-3 text-sm text-text-faint">
                  No promotions applied yet. Check{" "}
                  <Link href="/promotions" className="text-gold-deep underline">
                    current promotions
                  </Link>
                  .
                </div>
              ) : (
                <div className="mt-4 flex flex-wrap gap-2.5">
                  {allDiscounts.map((d, i) => (
                    <div key={i} title={`Order ${d.source}`}>
                      <DiscountBadge d={d} />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Rentals booked */}
            <div className="mt-12">
              <div className="font-serif text-xl text-ink">Items Booked From Rent</div>
              {rentals.length === 0 ? (
                <div className="mt-3 text-sm text-text-faint">
                  No rentals booked yet.{" "}
                  <Link href="/rent" className="text-gold-deep underline">
                    Browse the rental collection
                  </Link>
                  .
                </div>
              ) : (
                <div className="mt-4 flex flex-col gap-4">
                  {rentals.map((r) => {
                    const net = parseFloat(r.total_rental_cost) - parseFloat(r.discount_amount);
                    return (
                      <div key={r.id} className="rounded-md border border-border-light p-5">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="font-semibold text-ink">{r.booking_number}</div>
                          <span className="rounded-full bg-cream-soft px-3 py-1 text-[12px] capitalize text-text-body">
                            {r.status.replace("_", " ")}
                          </span>
                        </div>
                        <div className="mt-1 text-[13px] text-text-faint">
                          {formatDate(r.rental_start_date)} → {formatDate(r.rental_end_date)}
                        </div>
                        <div className="mt-3 flex flex-col gap-1.5 text-sm">
                          {r.items.map((it, i) => (
                            <div key={i} className="flex justify-between text-text-body">
                              <span>
                                {it.productName}
                                {it.size ? ` · ${it.size}` : ""}
                                {it.color ? ` · ${it.color}` : ""} × {it.quantity}
                              </span>
                              <span>{formatMoney(it.pricePerDay)}/day</span>
                            </div>
                          ))}
                        </div>
                        <div className="mt-3 flex items-center justify-between border-t border-border-light pt-3 text-sm">
                          <span className="text-text-muted">Total</span>
                          <span className="font-semibold text-ink">
                            {formatMoney(String(net))}
                            {parseFloat(r.discount_amount) > 0 && (
                              <span className="ml-2 text-[12px] text-text-faint line-through">
                                {formatMoney(r.total_rental_cost)}
                              </span>
                            )}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Purchase orders */}
            <div className="mt-12 mb-16">
              <div className="font-serif text-xl text-ink">Your Orders</div>
              {orders.length === 0 ? (
                <div className="mt-3 text-sm text-text-faint">
                  No purchases yet.{" "}
                  <Link href="/shop" className="text-gold-deep underline">
                    Browse the shop
                  </Link>
                  .
                </div>
              ) : (
                <div className="mt-4 flex flex-col gap-4">
                  {orders.map((o) => (
                    <div key={o.id} className="rounded-md border border-border-light p-5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="font-semibold text-ink">{o.sale_number}</div>
                        <span className="rounded-full bg-cream-soft px-3 py-1 text-[12px] capitalize text-text-body">
                          {o.status}
                        </span>
                      </div>
                      <div className="mt-1 text-[13px] text-text-faint">{formatDate(o.created_at)}</div>
                      <div className="mt-3 flex flex-col gap-1.5 text-sm">
                        {o.items.map((it, i) => (
                          <div key={i} className="flex justify-between text-text-body">
                            <span>
                              {it.productName} {it.variantInfo ? `· ${it.variantInfo}` : ""} × {it.quantity}
                            </span>
                            <span>{formatMoney(it.subtotal)}</span>
                          </div>
                        ))}
                      </div>
                      <div className="mt-3 flex items-center justify-between border-t border-border-light pt-3 text-sm">
                        <span className="text-text-muted">Total</span>
                        <span className="font-semibold text-ink">
                          {formatMoney(o.total_amount)}
                          {parseFloat(o.discount_amount) > 0 && (
                            <span className="ml-2 text-[12px] text-text-faint line-through">
                              {formatMoney(o.subtotal)}
                            </span>
                          )}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <SiteFooter />
    </div>
  );
}
