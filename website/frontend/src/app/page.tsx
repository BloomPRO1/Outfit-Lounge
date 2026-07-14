import Link from "next/link";
import Image from "next/image";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { Hero } from "@/components/home/Hero";
import { EditorialSection } from "@/components/home/EditorialSection";
import { OrbitShowcase } from "@/components/home/OrbitShowcase";

const COLLECTIONS = [
  {
    name: "Business",
    desc: "Sharp tailoring for the boardroom.",
    label: "BUSINESS SUITS",
    image: "/assets/collection-business-v2.jpg",
  },
  {
    name: "Wedding",
    desc: "Tuxedos and sherwanis for the big day.",
    label: "WEDDING TUXEDOS",
    image: "/assets/collection-wedding-v2.jpg",
  },
  {
    name: "Party",
    desc: "Bold statement pieces for the night.",
    label: "PARTY WEAR",
    image: "/assets/collection-party-v2.jpg",
  },
  {
    name: "Casual",
    desc: "Relaxed luxury for everyday wear.",
    label: "CASUAL EDIT",
    image: "/assets/collection-casual-v2.jpg",
  },
];

const ACCESSORIES = [
  { label: "WATCH", image: "/assets/accessory-watch.jpg" },
  { label: "SHOES", image: "/assets/accessory-shoes.jpg" },
  { label: "BELT", image: "/assets/accessory-belt.jpg" },
  { label: "TIE", image: "/assets/accessory-tie.jpg" },
];

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
      <SiteNav revealOnMount theme="light" />
      <Hero />

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
          >
            <Image
              src="/assets/hero-rent.jpg"
              alt="Rental collection — premium suits and blazers"
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              priority
            />
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(0deg, rgba(11,11,12,0.85), rgba(11,11,12,0.1) 55%)",
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
          >
            <Image
              src="/assets/hero-shop.jpg"
              alt="Buy collection — signature pieces to own"
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              priority
            />
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(0deg, rgba(11,11,12,0.85), rgba(11,11,12,0.1) 55%)",
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

      <EditorialSection />

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
              <div className="relative h-70 overflow-hidden">
                <Image
                  src={c.image}
                  alt={`${c.name} collection — ${c.desc}`}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-110"
                />
              </div>
              <div className="bg-white p-5">
                <div className="font-mono text-[11px] tracking-widest text-gold-deep">
                  {c.label}
                </div>
                <div className="mt-1.5 font-serif text-xl text-ink">{c.name}</div>
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
              key={a.label}
              className="group relative h-42.5 w-32.5 overflow-hidden rounded-md border border-gold/30 transition-all duration-300 hover:-translate-y-1.5 hover:border-gold/90"
            >
              <Image
                src={a.image}
                alt={a.label}
                fill
                sizes="130px"
                className="object-cover transition-transform duration-500 group-hover:scale-110"
              />
              <div
                className="absolute inset-0"
                style={{ background: "linear-gradient(0deg, rgba(11,11,12,0.75), rgba(11,11,12,0.05) 60%)" }}
              />
              <span className="absolute bottom-2.5 left-0 right-0 px-2 text-center font-mono text-[10px] tracking-wide text-gold">
                {a.label}
              </span>
            </div>
          ))}
        </div>
      </div>

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
