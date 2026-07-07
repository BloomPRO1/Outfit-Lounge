import Link from "next/link";

const COLUMNS = [
  {
    heading: "SHOP",
    links: [
      { href: "/rent", label: "Rent" },
      { href: "/shop", label: "Buy" },
      { href: "/promotions", label: "Promotions" },
    ],
  },
  {
    heading: "COMPANY",
    links: [
      { href: "/about", label: "About Us" },
      { href: "/contact", label: "Contact" },
    ],
  },
  {
    heading: "ACCOUNT",
    links: [
      { href: "/login", label: "Log In" },
      { href: "/register", label: "Register" },
    ],
  },
];

export function SiteFooter() {
  return (
    <div className="bg-ink px-6 pb-9 pt-16 sm:px-10 lg:px-14">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-10 lg:grid-cols-[2fr_1fr_1fr_1fr]">
        <div>
          <div className="font-serif text-2xl text-cream-soft">
            OUTFIT <span className="text-gold">LOUNGE</span>
          </div>
          <p className="mt-3.5 max-w-70 text-[13px] text-text-faint">
            Premium menswear, rented or owned. Colombo&apos;s home for the perfectly tailored
            occasion.
          </p>
        </div>

        {COLUMNS.map((col) => (
          <div key={col.heading}>
            <div className="mb-3.5 text-xs tracking-widest text-gold">{col.heading}</div>
            <div className="flex flex-col gap-2.5 text-sm text-cream-dim">
              {col.links.map((link) => (
                <Link key={link.href} href={link.href} className="hover:text-gold">
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="mx-auto mt-12 max-w-7xl border-t border-white/10 pt-6 text-center text-xs text-text-muted">
        © 2026 Outfit Lounge. All rights reserved.
      </div>
    </div>
  );
}
