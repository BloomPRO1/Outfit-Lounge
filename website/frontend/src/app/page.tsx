"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { Hero } from "@/components/home/Hero";
import { EditorialSection } from "@/components/home/EditorialSection";
import { OrbitShowcase } from "@/components/home/OrbitShowcase";
import { SilhouetteBuilder } from "@/components/home/SilhouetteBuilder";

const COLLECTIONS = [
  {
    name: "Business Suite",
    desc: "Sharp canvas tailoring for the modern boardroom.",
    label: "REF: OL-BUS-72",
    material: "100% Super 130s Worsted Wool",
    sizes: "EU 46 - 58",
    image: "/assets/collection-business-v2.jpg",
  },
  {
    name: "Wedding Tuxedo",
    desc: "Satin-lapelled elegance for your grand occasion.",
    label: "REF: OL-WED-09",
    material: "Italian Wool-Silk Blend",
    sizes: "EU 44 - 56",
    image: "/assets/collection-wedding-v2.jpg",
  },
  {
    name: "Evening Party",
    desc: "Bold, textured velvets and jacquards for the night.",
    label: "REF: OL-EVE-44",
    material: "Premium Silk Velvet",
    sizes: "EU 46 - 54",
    image: "/assets/collection-party-v2.jpg",
  },
  {
    name: "Smart Casual",
    desc: "Unstructured comfort meeting premium design.",
    label: "REF: OL-CAS-18",
    material: "Linen-Cotton Blend",
    sizes: "EU 44 - 58",
    image: "/assets/collection-casual-v2.jpg",
  },
];

const ACCESSORIES = [
  { label: "CHRONOGRAPH WATCH", desc: "Mechanical gold accent", ref: "ACC-WCH-01", image: "/assets/accessory-watch.jpg" },
  { label: "OXFORD DERBY SHOES", desc: "Full-grain calfskin leather", ref: "ACC-SHO-04", image: "/assets/accessory-shoes.jpg" },
  { label: "DRESS LEATHER BELT", desc: "Hand-finished edge detail", ref: "ACC-BLT-09", image: "/assets/accessory-belt.jpg" },
  { label: "SILK JACQUARD TIE", desc: "Italian woven silk weave", ref: "ACC-TIE-12", image: "/assets/accessory-tie.jpg" },
];

const TESTIMONIALS = [
  {
    quote:
      "The custom tailoring process was spectacular. I rented a double-breasted tuxedo for my gala and the sleeve and shoulder fit felt like it was bespoke from London.",
    name: "Dilshan R.",
    date: "June 2026",
  },
  {
    quote:
      "Outfit Lounge represents a massive leap in suit hire quality. The fabric drape and canvas structure are unmatched. It feels premium and looks completely custom.",
    name: "Kasun M.",
    date: "July 2026",
  },
  {
    quote:
      "Simple booking online, prompt pickup with fitting at their Homagama lounge. Incredible attention to detail. This is now my absolute go-to for menswear.",
    name: "Nadun P.",
    date: "May 2026",
  },
];

const CRAFTSMANSHIP = [
  {
    num: "01",
    title: "Superfine Fabrics",
    desc: "We exclusively source premium fibers, including Super 120s-150s merino wools, Mongolian cashmere blends, and pure Italian silk for exceptional drape and breathability.",
  },
  {
    num: "02",
    title: "Bespoke Interlining",
    desc: "Our blazers feature high-grade half-canvas and full-canvas inner structures that mold to your unique body shape over time, preventing stiffness.",
  },
  {
    num: "03",
    title: "Finished To Order",
    desc: "Every rental or purchase undergoes rigorous hand-pressing and complimentary sleeve or cuff adjustments at our lounge by master tailors.",
  },
];

export default function HomePage() {
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    show: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] as const } },
  };

  return (
    <div className="bg-[#faf9f6] text-ink min-h-screen">
      <SiteNav revealOnMount theme="light" />
      <Hero />

      {/* Grid lines layout wrapper — aesthetic menswear pinstripe texture */}
      <div className="bg-pinstripe w-full border-b border-border-light">
        
        {/* Section 1: Rent / Shop Split */}
        <section className="mx-auto max-w-[1536px] px-6 py-24 sm:px-12 lg:px-20">
          <div className="flex flex-col items-center gap-4 text-center">
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="text-[12px] font-semibold tracking-[6px] text-gold-deep"
            >
              TWO WAYS TO WEAR IT
            </motion.div>
            <motion.h2 
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.1 }}
              className="font-serif text-4xl text-ink sm:text-5xl lg:text-6xl tracking-tight max-w-3xl leading-[1.1]"
            >
              Rent For A Night.<br/>Own For A Lifetime.
            </motion.h2>
            <motion.div 
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="h-px w-20 bg-gold my-4"
            />
          </div>

          <div className="mt-16 grid w-full grid-cols-1 gap-8 md:grid-cols-2">
            
            {/* Rent Card */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] as const }}
            >
              <Link
                href="/rent"
                className="group relative flex h-[580px] items-end overflow-hidden rounded-lg border border-border-light shadow-[0_15px_45px_rgba(0,0,0,0.03)] bg-white transition-all duration-500 hover:-translate-y-1.5 hover:shadow-[0_30px_60px_rgba(184,134,58,0.1)]"
              >
                <div className="absolute top-6 left-6 z-10 bg-ink text-gold font-mono text-[9px] tracking-[4px] px-3 py-1.5 border border-gold/20 backdrop-blur-md rounded">
                  EST. CATALOG #OL-RNT-01
                </div>
                
                <Image
                  src="/assets/hero-rent.jpg"
                  alt="Rental collection — premium suits and blazers"
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                  priority
                />
                
                {/* Visual shade gradient */}
                <div
                  className="absolute inset-0 transition-opacity duration-500 group-hover:opacity-90"
                  style={{
                    background:
                      "linear-gradient(to top, rgba(11,11,12,0.92) 0%, rgba(11,11,12,0.55) 45%, transparent 80%)",
                  }}
                />
                
                <div className="relative p-10 text-cream w-full z-10">
                  <div className="mb-2 text-xs font-semibold tracking-[4px] text-gold">FOR THE OCCASION</div>
                  <h3 className="font-serif text-3xl sm:text-4xl text-white">Rental Collection</h3>
                  <p className="mt-3 max-w-sm text-sm text-cream-dim leading-relaxed">
                    Weddings, galas, interviews — access top-tier tailoring by the day, custom-pressed for you.
                  </p>
                  <div className="mt-6 inline-flex items-center gap-3 text-xs tracking-[4px] uppercase text-gold font-bold transition-all group-hover:translate-x-1.5">
                    Browse Rentals
                    <span>→</span>
                  </div>
                </div>
              </Link>
            </motion.div>

            {/* Buy Card */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] as const }}
            >
              <Link
                href="/shop"
                className="group relative flex h-[580px] items-end overflow-hidden rounded-lg border border-border-light shadow-[0_15px_45px_rgba(0,0,0,0.03)] bg-white transition-all duration-500 hover:-translate-y-1.5 hover:shadow-[0_30px_60px_rgba(184,134,58,0.1)]"
              >
                <div className="absolute top-6 left-6 z-10 bg-ink text-gold font-mono text-[9px] tracking-[4px] px-3 py-1.5 border border-gold/20 backdrop-blur-md rounded">
                  EST. CATALOG #OL-SHP-02
                </div>

                <Image
                  src="/assets/hero-shop.jpg"
                  alt="Buy collection — signature pieces to own"
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                  priority
                />

                <div
                  className="absolute inset-0 transition-opacity duration-500 group-hover:opacity-90"
                  style={{
                    background:
                      "linear-gradient(to top, rgba(11,11,12,0.92) 0%, rgba(11,11,12,0.55) 45%, transparent 80%)",
                  }}
                />

                <div className="relative p-10 text-cream w-full z-10">
                  <div className="mb-2 text-xs font-semibold tracking-[4px] text-gold">TO KEEP FOREVER</div>
                  <h3 className="font-serif text-3xl sm:text-4xl text-white">Buy Collection</h3>
                  <p className="mt-3 max-w-sm text-sm text-cream-dim leading-relaxed">
                    Build a luxury wardrobe with signature blazers, shirts and trousers tailored to your frame.
                  </p>
                  <div className="mt-6 inline-flex items-center gap-3 text-xs tracking-[4px] uppercase text-gold font-bold transition-all group-hover:translate-x-1.5">
                    Explore Shop
                    <span>→</span>
                  </div>
                </div>
              </Link>
            </motion.div>

          </div>
        </section>
        
        {/* Section 2: Craftsmanship / The Art of Fit */}
        <section className="bg-tailor-grid border-y border-border-light py-24">
          <div className="mx-auto max-w-[1536px] px-6 sm:px-12 lg:px-20">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
              
              <div className="lg:col-span-5 max-w-lg">
                <div className="text-[12px] font-semibold tracking-[6px] text-gold-deep">TAILOR SHOP VALUES</div>
                <h2 className="mt-4 font-serif text-4xl sm:text-5xl text-ink leading-tight">
                  The Architecture of a Fine Suit
                </h2>
                <p className="mt-5 text-[15px] leading-relaxed text-text-muted">
                  Unlike fast-fashion off-the-rack garments, our suits are constructed to balance shoulders, drape cleanly over the chest, and stand the test of time. We pair classic tailoring with modern convenience.
                </p>
                <div className="mt-8 flex gap-6">
                  <div className="border-l-2 border-gold pl-4">
                    <div className="font-serif text-2xl text-ink">10+ Years</div>
                    <div className="text-xs text-text-faint tracking-wider uppercase mt-1">Master Craft</div>
                  </div>
                  <div className="border-l-2 border-gold pl-4">
                    <div className="font-serif text-2xl text-ink">Super 150s</div>
                    <div className="text-xs text-text-faint tracking-wider uppercase mt-1">Premium Wool</div>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-3 gap-6">
                {CRAFTSMANSHIP.map((item, idx) => (
                  <motion.div 
                    key={item.num}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: idx * 0.1 }}
                    className="bg-white border border-border-light rounded-lg p-8 shadow-[0_10px_30px_rgba(0,0,0,0.02)]"
                  >
                    <div className="font-serif text-3xl text-gold-deep leading-none">{item.num}</div>
                    <h3 className="font-serif text-xl text-ink mt-5">{item.title}</h3>
                    <p className="mt-3 text-xs leading-relaxed text-text-muted">{item.desc}</p>
                  </motion.div>
                ))}
              </div>

            </div>
          </div>
        </section>

      </div>

      <EditorialSection />

      {/* Spotlight Segment Separator */}
      <div className="bg-black py-[2px]">
        <div className="mx-auto max-w-[1536px] h-px bg-gradient-to-r from-transparent via-gold/45 to-transparent" />
      </div>

      <OrbitShowcase />

      <SilhouetteBuilder />

      {/* Collections lookbook (Wide White Section) */}
      <section className="bg-pinstripe border-y border-border-light py-28">
        <div className="mx-auto max-w-[1536px] px-6 sm:px-12 lg:px-20">
          <div className="mb-20 flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <div className="text-[12px] font-semibold tracking-[6px] text-gold-deep uppercase">CURATED LOOKBOOKS</div>
              <h2 className="mt-3 font-serif text-4xl sm:text-5xl text-ink tracking-tight">
                Dressed For Every Moment
              </h2>
            </div>
            <div className="h-px bg-gold/30 hidden md:block flex-grow mx-8" />
            <Link 
              href="/shop" 
              className="inline-flex items-center gap-2.5 text-xs font-bold tracking-[3px] text-ink uppercase hover:text-gold-deep transition-colors whitespace-nowrap"
            >
              View Full Catalog <span>→</span>
            </Link>
          </div>

          <motion.div 
            variants={containerVariants}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4"
          >
            {COLLECTIONS.map((c) => (
              <motion.div
                key={c.name}
                variants={itemVariants}
                className="group flex flex-col justify-between overflow-hidden rounded-lg border border-border-light bg-white shadow-[0_12px_30px_rgba(0,0,0,0.02)] transition-all duration-350 hover:-translate-y-2 hover:shadow-[0_24px_50px_rgba(184,134,58,0.08)]"
              >
                <div className="relative h-[400px] overflow-hidden bg-cream-soft">
                  <div className="absolute top-4 right-4 z-10 bg-black/75 text-cream font-mono text-[8px] tracking-widest px-2.5 py-1 rounded">
                    {c.label}
                  </div>
                  
                  <Image
                    src={c.image}
                    alt={`${c.name} collection — ${c.desc}`}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  
                  {/* Subtle edge shade */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </div>
                
                <div className="p-6 border-t border-border-light">
                  <div className="flex justify-between items-center">
                    <h3 className="font-serif text-2xl text-ink group-hover:text-gold-deep transition-colors">{c.name}</h3>
                  </div>
                  
                  <p className="mt-2 text-xs text-text-muted min-h-[36px] leading-relaxed">{c.desc}</p>
                  
                  <div className="mt-5 pt-4 border-t border-border-light/70 flex justify-between items-center text-[10px] text-text-faint font-mono">
                    <div>
                      <span className="block text-[8px] text-text-faint/70 uppercase">FABRIC</span>
                      <span className="text-text-body mt-0.5 block">{c.material}</span>
                    </div>
                    <div className="text-right">
                      <span className="block text-[8px] text-text-faint/70 uppercase">SIZES</span>
                      <span className="text-text-body mt-0.5 block">{c.sizes}</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Accessories showcase (Wide White Section) */}
      <section className="bg-white border-b border-border-light py-26">
        <div className="mx-auto max-w-[1536px] px-6 sm:px-12 lg:px-20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center mb-16">
            
            <div className="lg:col-span-4">
              <div className="text-[12px] font-semibold tracking-[6px] text-gold-deep">FINISHING TOUCHES</div>
              <h2 className="mt-3.5 font-serif text-4xl text-ink leading-tight">
                Complete The Outfit
              </h2>
              <p className="mt-4 text-sm text-text-muted leading-relaxed">
                A custom blazer is only half the frame. Pair your look with calfskin Oxfords, hand-aligned silk ties, and premium timepiece accents, available to rent or purchase.
              </p>
              <div className="mt-6">
                <Link 
                  href="/shop?category=accessories"
                  className="inline-flex items-center gap-3 text-xs tracking-[3px] uppercase font-bold text-ink hover:text-gold-deep transition-colors"
                >
                  Browse Accessories <span>→</span>
                </Link>
              </div>
            </div>

            <div className="lg:col-span-8 grid grid-cols-2 sm:grid-cols-4 gap-6">
              {ACCESSORIES.map((a) => (
                <div
                  key={a.label}
                  className="group relative h-[300px] overflow-hidden rounded-lg border border-border-light bg-cream-soft shadow-[0_8px_24px_rgba(0,0,0,0.01)] transition-all duration-500 hover:-translate-y-1.5 hover:border-gold/60 hover:shadow-[0_20px_40px_rgba(184,134,58,0.08)]"
                >
                  <div className="absolute top-3 left-3 z-10 bg-black/85 text-gold font-mono text-[7px] tracking-[3px] px-2 py-1 rounded">
                    {a.ref}
                  </div>
                  
                  <Image
                    src={a.image}
                    alt={a.label}
                    fill
                    sizes="(max-width: 640px) 50vw, 20vw"
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  
                  {/* Backdrop shading */}
                  <div
                    className="absolute inset-0"
                    style={{ background: "linear-gradient(0deg, rgba(11,11,12,0.92) 0%, rgba(11,11,12,0.3) 50%, transparent 80%)" }}
                  />
                  
                  <div className="absolute bottom-4 left-4 right-4 text-cream">
                    <span className="block font-mono text-[9px] tracking-wide text-gold">
                      {a.label}
                    </span>
                    <span className="block text-[10px] text-cream-dim mt-1.5 font-light leading-none">
                      {a.desc}
                    </span>
                  </div>
                </div>
              ))}
            </div>

          </div>
        </div>
      </section>

      {/* Testimonials (Wide White Lookbook Layout) */}
      <section className="bg-pinstripe border-b border-border-light py-26">
        <div className="mx-auto max-w-[1536px] px-6 sm:px-12 lg:px-20">
          <div className="mb-16 text-center">
            <div className="text-[12px] font-semibold tracking-[6px] text-gold-deep">WHAT OUR CLIENTS SAY</div>
            <h2 className="mt-3 font-serif text-4xl text-ink">
              Trusted On Every Occasion
            </h2>
            <div className="h-[2px] w-12 bg-gold mx-auto mt-5" />
          </div>
          
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            {TESTIMONIALS.map((t, idx) => (
              <motion.div 
                key={t.name} 
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: idx * 0.1 }}
                className="rounded-lg border border-border-light bg-white p-10 shadow-[0_12px_32px_rgba(0,0,0,0.015)] relative"
              >
                <div className="absolute top-8 right-10 font-serif text-6xl text-gold-deep/10 pointer-events-none">“</div>
                <div className="text-sm tracking-widest text-gold">★★★★★</div>
                <p className="mt-5 text-[14px] leading-relaxed text-text-body font-light">
                  {t.quote}
                </p>
                <div className="mt-6 pt-5 border-t border-border-light/70 flex justify-between items-center text-xs">
                  <span className="font-serif text-ink font-semibold">— {t.name}</span>
                  <span className="text-[10px] font-mono text-text-faint uppercase">{t.date}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
