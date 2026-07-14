"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { useCart } from "@/components/cart/CartProvider";
import { useAuth } from "@/lib/useAuth";
import { imageUrl } from "@/lib/api";

function formatPrice(value: number): string {
  return `Rs ${value.toLocaleString("en-LK", { maximumFractionDigits: 0 })}`;
}

const listContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};
const listItem = {
  hidden: { opacity: 0, x: -28 },
  show: { opacity: 1, x: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] as const } },
};

export default function CartPage() {
  const { items, subtotal, updateQuantity, removeItem } = useCart();
  const { customer, loading } = useAuth();
  const router = useRouter();

  function handleCheckoutClick() {
    if (!customer) {
      router.push("/login?next=/checkout");
      return;
    }
    router.push("/checkout");
  }

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <SiteNav theme="light" />

      <div className="mx-auto w-full max-w-4xl flex-1 px-6 py-14 sm:px-10">
        <div className="font-serif text-3xl text-ink">Your Cart</div>

        {items.length === 0 ? (
          <div className="mt-10 text-center text-sm text-text-faint">
            Your cart is empty.{" "}
            <Link href="/shop" className="text-gold-deep underline">
              Browse the shop
            </Link>
          </div>
        ) : (
          <>
            <motion.div
              className="mt-8 flex flex-col divide-y divide-border-light border-y border-border-light"
              variants={listContainer}
              initial="hidden"
              animate="show"
            >
              {items.map((item) => (
                <motion.div
                  key={item.variantId}
                  variants={listItem}
                  className="flex items-center gap-5 py-5"
                >
                  <div className="h-24 w-20 flex-shrink-0 overflow-hidden rounded bg-cream-soft">
                    {item.imageId ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={imageUrl(item.imageId, 200)}
                        alt={item.name}
                        className="h-full w-full object-cover"
                      />
                    ) : null}
                  </div>
                  <div className="flex-1">
                    <div className="font-serif text-lg text-ink">{item.name}</div>
                    <div className="text-[13px] text-text-faint">
                      {[item.size, item.color].filter(Boolean).join(" / ")}
                    </div>
                    <div className="mt-1 text-sm text-text-body">{formatPrice(item.unitPrice)}</div>
                  </div>
                  <input
                    type="number"
                    min={1}
                    value={item.quantity}
                    onChange={(e) => updateQuantity(item.variantId, parseInt(e.target.value, 10) || 0)}
                    className="w-16 rounded border border-border-light px-2 py-1.5 text-center text-sm transition-colors focus:border-gold focus:outline-none"
                  />
                  <div className="w-24 text-right text-sm font-semibold text-ink">
                    {formatPrice(item.unitPrice * item.quantity)}
                  </div>
                  <button
                    onClick={() => removeItem(item.variantId)}
                    className="cursor-pointer text-sm text-text-faint transition-colors hover:text-red-600"
                  >
                    Remove
                  </button>
                </motion.div>
              ))}
            </motion.div>

            <motion.div
              className="mt-8 flex items-center justify-between"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.15 + items.length * 0.08 }}
            >
              <div className="text-sm text-text-muted">Subtotal</div>
              <div className="font-serif text-2xl text-ink">{formatPrice(subtotal)}</div>
            </motion.div>

            <button
              onClick={handleCheckoutClick}
              disabled={loading}
              className="mt-6 w-full rounded-sm bg-ink py-4 text-sm font-semibold text-white transition-colors hover:bg-gold hover:text-ink disabled:opacity-50"
            >
              Proceed to Checkout
            </button>
          </>
        )}
      </div>

      <SiteFooter />
    </div>
  );
}
