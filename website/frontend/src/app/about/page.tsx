"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, useInView } from "framer-motion";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";

const STATS = [
  { value: 500, suffix: "+", label: "Suits Tailored" },
  { value: 1200, suffix: "+", label: "Happy Clients" },
  { value: 50, suffix: "+", label: "Rental Looks" },
  { value: 7, suffix: "", label: "Days A Week Open" },
];

const VALUES = [
  {
    title: "Precision Fit",
    desc: "Every measurement taken by hand — no guesswork, no off-the-rack compromises.",
  },
  {
    title: "Premium Fabric",
    desc: "Sourced for how it drapes, breathes, and holds up long after the first wear.",
  },
  {
    title: "Personal Service",
    desc: "One conversation with our team is all it takes to find the right look for your day.",
  },
];

const textContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12, delayChildren: 0.2 } },
};
const textItem = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.9, ease: [0.22, 1, 0.36, 1] as const } },
};

function CountUp({ value, suffix }: { value: number; suffix: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const duration = 1200;
    const start = performance.now();
    let frame: number;
    function tick(now: number) {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(eased * value));
      if (progress < 1) frame = requestAnimationFrame(tick);
    }
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [inView, value]);

  return (
    <div ref={ref} className="font-serif text-4xl text-cream sm:text-5xl">
      {display}
      {suffix}
    </div>
  );
}

export default function AboutPage() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <SiteNav theme="light" />

      {/* hero */}
      <div className="relative flex h-[58vh] min-h-115 items-end overflow-hidden bg-ink">
        <Image
          src="/assets/about-hero.jpg"
          alt="A tailor measuring a client for a custom fit"
          fill
          sizes="100vw"
          className="object-cover"
          priority
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(0deg, rgba(11,11,12,0.92), rgba(11,11,12,0.25) 55%, rgba(11,11,12,0.55))",
          }}
        />
        <motion.div
          className="relative z-10 px-6 pb-14 sm:px-10 lg:px-14"
          variants={textContainer}
          initial="hidden"
          animate="show"
        >
          <motion.div variants={textItem} className="flex items-center text-[13px] tracking-[5px] text-gold">
            <span className="mr-3 inline-block h-px w-8 bg-gold" />
            OUR CRAFT
          </motion.div>
          <motion.div
            variants={textItem}
            className="mt-3.5 max-w-160 font-serif text-4xl leading-tight text-cream sm:text-5xl lg:text-[52px]"
          >
            Tailoring, Perfected Over Time
          </motion.div>
          <motion.div variants={textItem} className="mt-3.5 max-w-125 text-[15px] text-cream-dim">
            From first measurement to final fitting, every piece at Outfit Lounge is shaped by
            hands that take pride in the details.
          </motion.div>
        </motion.div>
      </div>

      {/* story */}
      <div className="px-6 py-20 sm:px-10 lg:px-14">
        <motion.div
          className="mx-auto max-w-3xl text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.8 }}
        >
          <div className="text-[13px] tracking-[5px] text-gold-deep">THE OUTFIT LOUNGE STORY</div>
          <div className="mt-4 font-serif text-2xl leading-relaxed text-ink sm:text-3xl">
            What started as a small tailoring counter in Homagama has grown into a full menswear
            lounge — where classic craftsmanship meets modern convenience.
          </div>
          <div className="mt-5 text-[15px] text-text-muted">
            We still believe the best outfit is one that&apos;s measured, not guessed. Whether
            you&apos;re renting a look for one unforgettable night or building a wardrobe to keep
            for years, our team treats every fitting with the same care.
          </div>
        </motion.div>
      </div>

      {/* stats */}
      <div className="bg-ink-soft px-6 py-18 sm:px-10 lg:px-14">
        <div className="mx-auto grid max-w-5xl grid-cols-2 gap-8 text-center lg:grid-cols-4">
          {STATS.map((s) => (
            <div key={s.label}>
              <CountUp value={s.value} suffix={s.suffix} />
              <div className="mt-2 text-[12px] tracking-[2px] text-cream-dim">
                {s.label.toUpperCase()}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* values */}
      <div className="px-6 py-20 sm:px-10 lg:px-14">
        <div className="mb-12 text-center">
          <div className="text-[13px] tracking-[5px] text-gold-deep">WHY CHOOSE US</div>
          <div className="mt-3 font-serif text-3xl text-ink sm:text-4xl">
            Built On The Details
          </div>
        </div>
        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-7 md:grid-cols-3">
          {VALUES.map((v, i) => (
            <motion.div
              key={v.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.6, delay: i * 0.12 }}
              className="rounded-md border border-border-light p-8"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full border border-gold-deep/40 font-serif text-sm text-gold-deep">
                {i + 1}
              </div>
              <div className="mt-4 font-serif text-xl text-ink">{v.title}</div>
              <div className="mt-2 text-[13px] leading-relaxed text-text-muted">{v.desc}</div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* closing CTA */}
      <div className="bg-ink px-6 py-20 text-center sm:px-10 lg:px-14">
        <div className="text-[13px] tracking-[5px] text-gold">READY WHEN YOU ARE</div>
        <div className="mt-3 font-serif text-3xl text-cream sm:text-4xl">Find Your Fit Today</div>
        <div className="mt-8 flex justify-center gap-4">
          <Link
            href="/rent"
            className="rounded-sm bg-gold px-7.5 py-3.5 text-sm font-semibold tracking-wide text-ink"
          >
            Rent a Look
          </Link>
          <Link
            href="/shop"
            className="rounded-sm border border-cream-soft px-7.5 py-3.5 text-sm font-semibold tracking-wide text-cream-soft"
          >
            Shop Collection
          </Link>
        </div>
      </div>

      <SiteFooter />
    </div>
  );
}
