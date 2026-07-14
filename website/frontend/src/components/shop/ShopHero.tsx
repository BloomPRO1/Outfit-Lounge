"use client";

import { motion } from "framer-motion";
import { DustMotes } from "./DustMotes";

const SHELF_SWATCHES = [
  "repeating-linear-gradient(180deg,#e9e4d8,#e9e4d8 10px,#ddd6c5 10px,#ddd6c5 20px)",
  "#efece4",
  "#e5e0d4",
  "#efece4",
  "#e5e0d4",
  "#efece4",
  "#e5e0d4",
  "#efece4",
  "#e5e0d4",
  "#efece4",
  "#e5e0d4",
  "#efece4",
];

const swatchContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } },
};
const swatchItem = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.9, ease: [0.22, 1, 0.36, 1] as const } },
};
const textContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12, delayChildren: 0.3 } },
};
const textItem = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] as const } },
};

export function ShopHero({ scrollTargetId }: { scrollTargetId: string }) {
  const handleExplore = () => {
    document.getElementById(scrollTargetId)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="relative flex h-[64vh] min-h-140 items-center overflow-hidden bg-[#f5f1e6]">
      {/* shelf, staggered reveal */}
      <motion.div
        className="absolute inset-0 flex gap-0.5 opacity-60"
        variants={swatchContainer}
        initial="hidden"
        animate="show"
      >
        {SHELF_SWATCHES.map((bg, i) => (
          <motion.div key={i} variants={swatchItem} className="flex-1" style={{ background: bg }} />
        ))}
      </motion.div>

      {/* ambient gold light, catching the shelf */}
      <div
        className="absolute inset-y-0 left-[8%] w-56 animate-[shimmer_7s_ease-in-out_infinite] opacity-80"
        style={{ background: "linear-gradient(180deg, rgba(217,176,84,0.16), transparent 60%)" }}
      />
      <div
        className="absolute inset-y-0 right-[16%] w-44 animate-[shimmer_8s_ease-in-out_infinite_1.4s] opacity-80"
        style={{ background: "linear-gradient(180deg, rgba(217,176,84,0.12), transparent 55%)" }}
      />

      <DustMotes count={14} className="bg-gold-deep/70" />

      {/* legibility fade */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(90deg, #f5f1e6, rgba(245,241,230,0.35) 55%, rgba(245,241,230,0.85))",
        }}
      />

      <motion.div
        className="relative z-10 max-w-160 px-6 sm:px-10 lg:px-14"
        variants={textContainer}
        initial="hidden"
        animate="show"
      >
        <motion.div variants={textItem} className="flex items-center text-[13px] tracking-[5px] text-gold-deep">
          <span className="mr-3 inline-block h-px w-8 bg-gold-deep" />
          THE PERMANENT COLLECTION
        </motion.div>
        <motion.div
          variants={textItem}
          className="mt-3.5 font-serif text-4xl leading-tight text-ink sm:text-5xl lg:text-[54px]"
        >
          Own Your Signature Style
        </motion.div>
        <motion.div variants={textItem} className="mt-3.5 max-w-125 text-[15px] text-text-muted">
          Hand-finished suits and accessories, tailored and shipped to fit — yours to keep.
        </motion.div>

        <motion.div variants={textItem} className="mt-8 flex flex-wrap items-center gap-5">
          <button
            onClick={handleExplore}
            className="cursor-pointer rounded-sm bg-ink px-7.5 py-3.5 text-sm font-semibold tracking-wide text-cream transition-colors hover:bg-ink-soft"
          >
            Browse The Collection
          </button>
          <button
            onClick={handleExplore}
            aria-label="Scroll to collection"
            className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border border-gold-deep/50 text-gold-deep transition-colors hover:bg-gold-deep hover:text-cream"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </motion.div>

        <motion.div
          variants={textItem}
          className="mt-7 text-[11px] tracking-[2.5px] text-text-faint"
        >
          FREE ALTERATIONS &nbsp;—&nbsp; ISLANDWIDE DELIVERY &nbsp;—&nbsp; 7-DAY RETURNS
        </motion.div>
      </motion.div>
    </div>
  );
}
