"use client";

import Image from "next/image";
import { motion } from "framer-motion";

const textContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12, delayChildren: 0.2 } },
};
const textItem = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] as const } },
};

const RIPPLES = [
  { size: 220, delay: 0 },
  { size: 220, delay: 1.3 },
  { size: 220, delay: 2.6 },
];

export function PerfumeHero({ scrollTargetId }: { scrollTargetId: string }) {
  const handleExplore = () => {
    document.getElementById(scrollTargetId)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="relative flex h-[64vh] min-h-140 items-center overflow-hidden bg-ink">
      <Image
        src="/assets/perfume-hero.jpg"
        alt="Luxury perfume bottle"
        fill
        sizes="100vw"
        className="object-cover"
        priority
      />

      {/* signature motif: scent diffusing outward in soft rippling rings */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative flex h-56 w-56 items-center justify-center">
          {RIPPLES.map((r, i) => (
            <div
              key={i}
              className="absolute rounded-full border border-gold/40"
              style={{
                width: r.size,
                height: r.size,
                animation: `ripple 3.9s ease-out infinite ${r.delay}s`,
              }}
            />
          ))}
          <div
            className="h-16 w-16 rounded-full"
            style={{ background: "radial-gradient(circle, rgba(217,176,84,0.5), transparent 70%)" }}
          />
        </div>
      </div>

      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(90deg, rgba(11,11,12,0.92), rgba(11,11,12,0.45) 55%, rgba(11,11,12,0.85))",
        }}
      />

      <motion.div
        className="relative z-10 max-w-160 px-6 sm:px-10 lg:px-14"
        variants={textContainer}
        initial="hidden"
        animate="show"
      >
        <motion.div variants={textItem} className="flex items-center text-[13px] tracking-[5px] text-gold">
          <span className="mr-3 inline-block h-px w-8 bg-gold" />
          THE FRAGRANCE EDIT
        </motion.div>
        <motion.div
          variants={textItem}
          className="mt-3.5 font-serif text-4xl leading-tight text-cream sm:text-5xl lg:text-[54px]"
        >
          Signature Scents
        </motion.div>
        <motion.div variants={textItem} className="mt-3.5 max-w-125 text-[15px] text-cream-dim">
          Curated fragrances to complete every look — from everyday essentials to statement
          evening scents.
        </motion.div>

        <motion.div variants={textItem} className="mt-8 flex flex-wrap items-center gap-5">
          <button
            onClick={handleExplore}
            className="cursor-pointer rounded-sm bg-gold px-7.5 py-3.5 text-sm font-semibold tracking-wide text-ink transition-colors hover:bg-gold-pale"
          >
            Explore Fragrances
          </button>
          <button
            onClick={handleExplore}
            aria-label="Scroll to fragrances"
            className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border border-gold/50 text-gold transition-colors hover:bg-gold hover:text-ink"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </motion.div>
      </motion.div>
    </div>
  );
}
