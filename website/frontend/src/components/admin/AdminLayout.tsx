"use client";

import { ReactNode, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAdminAuth } from "@/lib/useAdminAuth";

const NAV = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/products", label: "Products & Stock" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/rentals", label: "Rentals" },
  { href: "/admin/customers", label: "Customers" },
  { href: "/admin/promotions", label: "Promotions" },
];

export function AdminLayout({ children }: { children: ReactNode }) {
  const { admin, loading, logout } = useAdminAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !admin) {
      router.push("/login?next=/admin");
    }
  }, [loading, admin, router]);

  if (loading || !admin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink text-sm text-cream-dim">
        Loading…
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-cream-soft">
      <aside className="sticky top-0 flex h-screen w-64 flex-shrink-0 flex-col overflow-y-auto bg-ink px-5 py-7">
        <Link href="/admin" className="font-serif text-xl text-cream-soft">
          OUTFIT <span className="text-gold">LOUNGE</span>
        </Link>
        <div className="mt-1 text-[11px] tracking-widest text-gold">ADMIN</div>

        <nav className="mt-10 flex flex-col gap-1">
          {NAV.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={
                  "rounded-sm px-3.5 py-2.5 text-sm transition-colors " +
                  (active ? "bg-gold text-ink font-semibold" : "text-cream-dim hover:bg-white/5")
                }
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto flex flex-col gap-2 border-t border-white/10 pt-5">
          <div className="text-[13px] text-cream-dim">{admin.name}</div>
          <div className="truncate text-[12px] text-text-faint">{admin.email}</div>
          <button
            onClick={() => {
              logout();
              router.push("/login?next=/admin");
            }}
            className="mt-2 cursor-pointer rounded-sm border border-gold/40 px-3.5 py-2 text-[13px] text-gold hover:bg-gold hover:text-ink"
          >
            Log Out
          </button>
          <Link href="/" className="mt-1 text-[12px] text-text-faint hover:text-gold">
            ← Back to site
          </Link>
        </div>
      </aside>

      <main className="flex-1 overflow-x-auto px-8 py-8">{children}</main>
    </div>
  );
}
