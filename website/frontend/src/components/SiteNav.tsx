"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/useAuth";
import { useCart } from "@/components/cart/CartProvider";

const NAV_LINKS = [
  { href: "/rent", label: "Rent" },
  { href: "/shop", label: "Shop" },
  { href: "/promotions", label: "Promotions" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export function SiteNav({
  revealOnMount = false,
  theme = "dark",
}: {
  revealOnMount?: boolean;
  theme?: "dark" | "light";
}) {
  const pathname = usePathname();
  const router = useRouter();
  const isLight = theme === "light";
  const { customer, logout } = useAuth();
  const { count } = useCart();

  return (
    <motion.div
      initial={revealOnMount ? { opacity: 0 } : { opacity: 1 }}
      animate={{ opacity: 1 }}
      transition={revealOnMount ? { duration: 1.4, delay: 2, ease: "easeInOut" } : { duration: 0 }}
      className={
        "sticky top-0 z-50 flex items-center justify-between gap-6 px-6 py-5 backdrop-blur-md sm:px-10 lg:px-14 " +
        (isLight
          ? "border-b border-border-light bg-white/90"
          : "bg-ink/60")
      }
    >
      <Link
        href="/"
        className={
          "font-serif text-xl font-semibold tracking-wide sm:text-2xl " +
          (isLight ? "text-ink" : "text-cream-soft")
        }
      >
        OUTFIT <span className="text-gold-deep">LOUNGE</span>
      </Link>

      <div
        className={
          "hidden items-center gap-8 text-sm tracking-wide md:flex " +
          (isLight ? "text-text-body" : "text-cream-dim")
        }
      >
        {NAV_LINKS.map((link) => {
          const active = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={
                "hover:text-gold-deep " +
                (active ? "font-semibold " + (isLight ? "text-gold-deep" : "text-gold") : "")
              }
            >
              {link.label}
            </Link>
          );
        })}
      </div>

      <div className="flex items-center gap-3.5">
        <Link
          href="/cart"
          className={
            "relative text-sm hover:text-gold-deep " +
            (isLight ? "text-text-body" : "text-cream-dim")
          }
        >
          Cart
          {count > 0 && (
            <span className="absolute -top-2.5 -right-3.5 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-gold px-1 text-[10px] font-semibold text-ink">
              {count}
            </span>
          )}
        </Link>
        {customer ? (
          <>
            <Link
              href="/account"
              className={"text-sm hover:text-gold-deep " + (isLight ? "text-text-body" : "text-cream-dim")}
            >
              Hi, {customer.name.split(" ")[0]}
            </Link>
            <button
              onClick={() => {
                logout();
                router.push("/");
              }}
              className={
                "cursor-pointer rounded-sm border px-5 py-2 text-sm transition-colors " +
                (isLight
                  ? "border-ink text-ink hover:bg-ink hover:text-white"
                  : "border-gold text-gold hover:bg-gold hover:text-ink")
              }
            >
              Log Out
            </button>
          </>
        ) : (
          <>
            <Link
              href="/login"
              className={"text-sm hover:text-gold-deep " + (isLight ? "text-text-body" : "text-cream-dim")}
            >
              Log In
            </Link>
            <Link
              href="/register"
              className={
                "rounded-sm border px-5 py-2 text-sm transition-colors " +
                (isLight
                  ? "border-ink text-ink hover:bg-ink hover:text-white"
                  : "border-gold text-gold hover:bg-gold hover:text-ink")
              }
            >
              Register
            </Link>
          </>
        )}
      </div>
    </motion.div>
  );
}
