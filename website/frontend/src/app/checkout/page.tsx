"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { useCart } from "@/components/cart/CartProvider";
import { useAuth } from "@/lib/useAuth";
import { checkout, SaleResult } from "@/lib/orders";

function formatPrice(value: number): string {
  return `Rs ${value.toLocaleString("en-LK", { maximumFractionDigits: 0 })}`;
}

const sectionContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.13 } },
};
const sectionItem = {
  hidden: { opacity: 0, y: 22 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] as const } },
};

export default function CheckoutPage() {
  const { items, subtotal, clear } = useCart();
  const { customer, loading: authLoading } = useAuth();
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SaleResult | null>(null);

  async function handlePlaceOrder() {
    setError(null);
    setPlacing(true);
    try {
      const res = await checkout({
        items: items.map((i) => ({ variantId: i.variantId, quantity: i.quantity })),
      });
      setResult(res);
      clear();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout failed");
    } finally {
      setPlacing(false);
    }
  }

  if (result) {
    const discount = parseFloat(result.sale.discount_amount);
    return (
      <div className="flex min-h-screen flex-col bg-white">
        <SiteNav theme="light" />
        <motion.div
          className="mx-auto flex max-w-lg flex-1 flex-col items-center justify-center px-6 py-20 text-center"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.1, ease: [0.34, 1.56, 0.64, 1] }}
            className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-gold text-gold"
          >
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </motion.div>
          <div className="mt-5 text-[13px] tracking-[3px] text-gold-deep">ORDER CONFIRMED</div>
          <div className="mt-3 font-serif text-3xl text-ink">Thank you!</div>
          <div className="mt-3 text-sm text-text-muted">
            Order <span className="font-semibold text-ink">{result.sale.sale_number}</span> has
            been placed — total {formatPrice(parseFloat(result.sale.total_amount))}.
          </div>
          {discount > 0 && result.appliedPromotion && (
            <div className="mt-2 text-[13px] text-gold-deep">
              You saved {formatPrice(discount)} with &ldquo;{result.appliedPromotion.title}&rdquo;!
            </div>
          )}
          <Link href="/shop" className="mt-8 text-sm text-gold-deep underline">
            Continue shopping
          </Link>
        </motion.div>
        <SiteFooter />
      </div>
    );
  }

  if (!authLoading && !customer) {
    return (
      <div className="flex min-h-screen flex-col bg-white">
        <SiteNav theme="light" />
        <div className="flex-1 py-32 text-center">
          <div className="font-serif text-2xl text-ink">Please log in to check out</div>
          <Link
            href="/login?next=/checkout"
            className="mt-6 inline-block text-sm text-gold-deep underline"
          >
            Log In
          </Link>
        </div>
        <SiteFooter />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex min-h-screen flex-col bg-white">
        <SiteNav theme="light" />
        <div className="flex-1 py-32 text-center">
          <div className="font-serif text-2xl text-ink">Your cart is empty</div>
          <Link href="/shop" className="mt-6 inline-block text-sm text-gold-deep underline">
            Browse the shop
          </Link>
        </div>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <SiteNav theme="light" />

      <div className="mx-auto w-full max-w-2xl flex-1 px-6 py-14 sm:px-10">
        <motion.div
          className="h-[3px] rounded-full bg-gradient-to-r from-gold to-gold-pale"
          style={{ transformOrigin: "left" }}
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
        />
        <motion.div variants={sectionContainer} initial="hidden" animate="show">
          <motion.div variants={sectionItem} className="mt-6 font-serif text-3xl text-ink">
            Checkout
          </motion.div>
          <motion.div variants={sectionItem} className="mt-1 text-sm text-text-muted">
            Signed in as {customer?.name} ({customer?.email})
          </motion.div>

          <motion.div
            variants={sectionItem}
            className="mt-8 flex flex-col divide-y divide-border-light border-y border-border-light"
          >
            {items.map((item) => (
              <div key={item.variantId} className="flex items-center justify-between py-4 text-sm">
                <div>
                  <div className="text-ink">{item.name}</div>
                  <div className="text-text-faint">
                    {[item.size, item.color].filter(Boolean).join(" / ")} × {item.quantity}
                  </div>
                </div>
                <div className="font-semibold text-ink">
                  {formatPrice(item.unitPrice * item.quantity)}
                </div>
              </div>
            ))}
          </motion.div>

          <motion.div variants={sectionItem} className="mt-6 text-[12px] text-text-faint">
            Eligible promotions apply automatically — see{" "}
            <Link href="/promotions" className="text-gold-deep underline">
              current promotions
            </Link>
            .
          </motion.div>

          <motion.div variants={sectionItem} className="mt-6 flex items-center justify-between">
            <div className="text-sm text-text-muted">Total</div>
            <div className="font-serif text-2xl text-ink">{formatPrice(subtotal)}</div>
          </motion.div>

          <motion.div variants={sectionItem} className="mt-3 text-[13px] text-text-faint">
            Payment: mock full payment (no real payment gateway is connected yet).
          </motion.div>

          {error && <div className="mt-4 text-[13px] text-red-600">{error}</div>}

          <motion.button
            variants={sectionItem}
            onClick={handlePlaceOrder}
            disabled={placing}
            className="mt-6 w-full cursor-pointer rounded-sm bg-ink py-4 text-sm font-semibold text-white transition-colors hover:bg-gold hover:text-ink disabled:opacity-50"
          >
            {placing ? "Placing order…" : "Place Order"}
          </motion.button>
        </motion.div>
      </div>

      <SiteFooter />
    </div>
  );
}
