import Link from "next/link";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { Hero } from "@/components/home/Hero";
import { OrbitShowcase } from "@/components/home/OrbitShowcase";

const COLLECTIONS = [
  {
    name: "Business",
    desc: "Sharp tailoring for the boardroom.",
    label: "BUSINESS SUITS",
    bg: "repeating-linear-gradient(120deg,#2a2a2a,#2a2a2a 20px,#1c1c1c 20px,#1c1c1c 40px)",
  },
  {
    name: "Wedding",
    desc: "Tuxedos and sherwanis for the big day.",
    label: "WEDDING TUXEDOS",
    bg: "repeating-linear-gradient(120deg,#efece4,#efece4 20px,#e2dcc9 20px,#e2dcc9 40px)",
  },
  {
    name: "Party",
    desc: "Bold statement pieces for the night.",
    label: "PARTY WEAR",
    bg: "repeating-linear-gradient(120deg,#241a10,#241a10 20px,#1a120a 20px,#1a120a 40px)",
  },
  {
    name: "Casual",
    desc: "Relaxed luxury for everyday wear.",
    label: "CASUAL EDIT",
    bg: "repeating-linear-gradient(120deg,#e9e4d8,#e9e4d8 20px,#dcd5c3 20px,#dcd5c3 40px)",
  },
];

const ACCESSORIES = ["WATCH", "SHOES", "BELT", "TIE"];

const TESTIMONIALS = [
  {
    quote:
      "Rented a tuxedo for my wedding — fit like it was tailored just for me. Effortless experience.",
    name: "Dilshan R.",
  },
  {
    quote: "The quality is unreal for a rental. Felt like I bought a designer suit.",
    name: "Kasun M.",
  },
  {
    quote: "Booked in minutes, picked up same week. Outfit Lounge is now my go-to.",
    name: "Nadun P.",
  },
];

export default function HomePage() {
  return (
    <div className="bg-ink">
      <SiteNav revealOnMount />
      <Hero />

      {/* video ambience strip */}
      <div className="relative h-[70vh] w-full overflow-hidden bg-ink">
        <div
          className="absolute inset-0 opacity-90"
          style={{
            background:
              "repeating-linear-gradient(135deg, #1a1512 0px, #1a1512 22px, #14100d 22px, #14100d 44px)",
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 800px 400px at 50% 50%, rgba(217,176,84,0.12), transparent 70%)",
          }}
        />
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3.5">
          <div className="flex h-22 w-22 items-center justify-center rounded-full border-[1.5px] border-gold">
            <div className="ml-1.5 h-0 w-0 border-y-[14px] border-l-[22px] border-y-transparent border-l-gold" />
          </div>
          <div className="font-mono text-xs tracking-[3px] text-gold">
            VIDEO — LOUNGE AMBIENCE LOOP (60s)
          </div>
          <div className="text-sm text-text-faint">Golden light, marble floors, tailors at work</div>
        </div>
      </div>

      {/* rent / shop split */}
      <div className="flex flex-col items-center gap-4 bg-white px-6 py-30 sm:px-10 lg:px-14">
        <div className="text-[13px] tracking-[5px] text-gold-deep">TWO WAYS TO WEAR IT</div>
        <div className="text-center font-serif text-3xl text-ink sm:text-4xl lg:text-[44px]">
          Rent For A Night. Own For A Lifetime.
        </div>
        <div className="mt-12 grid w-full max-w-6xl grid-cols-1 gap-8 md:grid-cols-2">
          <Link
            href="/rent"
            className="group relative flex h-110 items-end overflow-hidden rounded-md transition-transform duration-400 hover:scale-[1.02]"
            style={{
              background:
                "repeating-linear-gradient(120deg,#efece4 0px,#efece4 26px,#e5e0d4 26px,#e5e0d4 52px)",
            }}
          >
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(0deg, rgba(11,11,12,0.82), rgba(11,11,12,0.05) 55%)",
              }}
            />
            <div className="relative p-9 text-cream">
              <div className="mb-2 text-xs tracking-[3px] text-gold">FOR THE OCCASION</div>
              <div className="font-serif text-3xl">Rental Collection</div>
              <div className="mt-2.5 max-w-85 text-sm text-cream-dim">
                Weddings, galas, interviews — premium looks by the day.
              </div>
            </div>
          </Link>
          <Link
            href="/shop"
            className="group relative flex h-110 items-end overflow-hidden rounded-md transition-transform duration-400 hover:scale-[1.02]"
            style={{
              background:
                "repeating-linear-gradient(120deg,#1c1c1c 0px,#1c1c1c 26px,#141414 26px,#141414 52px)",
            }}
          >
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(0deg, rgba(11,11,12,0.82), rgba(11,11,12,0.05) 55%)",
              }}
            />
            <div className="relative p-9 text-cream">
              <div className="mb-2 text-xs tracking-[3px] text-gold">TO KEEP FOREVER</div>
              <div className="font-serif text-3xl">Buy Collection</div>
              <div className="mt-2.5 max-w-85 text-sm text-cream-dim">
                Own your signature pieces, tailored to fit.
              </div>
            </div>
          </Link>
        </div>
      </div>

      <OrbitShowcase />

      {/* collections grid */}
      <div className="bg-white px-6 py-30 sm:px-10 lg:px-14">
        <div className="mb-14 text-center">
          <div className="text-[13px] tracking-[5px] text-gold-deep">CURATED COLLECTIONS</div>
          <div className="mt-3 font-serif text-3xl text-ink sm:text-4xl lg:text-[44px]">
            Dressed For Every Moment
          </div>
        </div>
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {COLLECTIONS.map((c) => (
            <div
              key={c.name}
              className="group overflow-hidden rounded-md border border-border-light transition-all duration-350 hover:-translate-y-2 hover:shadow-[0_20px_40px_-12px_rgba(0,0,0,0.2)]"
            >
              <div className="flex h-70 items-center justify-center" style={{ background: c.bg }}>
                <span className="font-mono text-[11px] tracking-widest text-text-faint">
                  {c.label}
                </span>
              </div>
              <div className="bg-white p-5">
                <div className="font-serif text-xl text-ink">{c.name}</div>
                <div className="mt-1.5 text-[13px] text-text-muted">{c.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* accessories showcase */}
      <div className="flex flex-wrap items-center justify-between gap-12 bg-ink-soft px-6 py-25 sm:px-10 lg:px-14">
        <div className="max-w-100">
          <div className="text-[13px] tracking-[5px] text-gold">FINISHING TOUCHES</div>
          <div className="mt-3.5 font-serif text-3xl text-cream sm:text-4xl">
            Complete The Outfit
          </div>
          <div className="mt-3.5 text-[15px] text-cream-dim">
            Watches, shoes, ties and belts — hand-picked to pair with every look, available to
            rent or buy alongside your outfit.
          </div>
        </div>
        <div className="flex gap-5">
          {ACCESSORIES.map((a) => (
            <div
              key={a}
              className="flex h-42.5 w-32.5 items-center justify-center rounded-md border border-gold/30 bg-[#1a1613] transition-all duration-300 hover:-translate-y-1.5 hover:border-gold/90"
            >
              <span className="px-2 text-center font-mono text-[10px] tracking-wide text-gold">
                {a}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* promotions teaser */}
      <Link
        href="/promotions"
        className="block px-6 py-17.5 text-center sm:px-10 lg:px-14"
        style={{ background: "linear-gradient(120deg,#d9b054,#f0d99b)" }}
      >
        <div className="text-[13px] tracking-[5px] text-ink">LIMITED TIME</div>
        <div className="mt-2.5 font-serif text-2xl text-ink sm:text-3xl lg:text-[34px]">
          20% Off First Rental — Wedding Season Offers Live
        </div>
        <div className="mt-3 text-sm text-[#3a3020] underline">View all promotions →</div>
      </Link>

      {/* testimonials */}
      <div className="bg-white px-6 py-27.5 sm:px-10 lg:px-14">
        <div className="mb-13 text-center">
          <div className="text-[13px] tracking-[5px] text-gold-deep">WHAT OUR CLIENTS SAY</div>
          <div className="mt-3 font-serif text-3xl text-ink sm:text-4xl">
            Trusted On Every Occasion
          </div>
        </div>
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-7 md:grid-cols-3">
          {TESTIMONIALS.map((t) => (
            <div key={t.name} className="rounded-md border border-border-light p-8">
              <div className="text-lg tracking-widest text-gold">★★★★★</div>
              <div className="mt-4 text-[15px] leading-relaxed text-text-body">{t.quote}</div>
              <div className="mt-4.5 text-[13px] text-text-faint">— {t.name}</div>
            </div>
          ))}
        </div>
      </div>

      <SiteFooter />
    </div>
  );
}
