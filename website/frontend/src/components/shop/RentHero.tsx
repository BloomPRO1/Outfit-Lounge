"use client";

import { motion } from "framer-motion";
import { DustMotes } from "./DustMotes";

const WALL_COLORS = [
  "linear-gradient(180deg,#2a231a,#0e0b08)",
  "linear-gradient(180deg,#241d15,#0e0b08)",
  "linear-gradient(180deg,#1e2436,#0b0d14)",
  "linear-gradient(180deg,#2a1420,#100609)",
  "linear-gradient(180deg,#2a231a,#0e0b08)",
  "linear-gradient(180deg,#241d15,#0e0b08)",
];

const wallContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};
const wallItem = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 1, ease: [0.22, 1, 0.36, 1] as const } },
};
const textContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12, delayChildren: 0.35 } },
};
const textItem = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] as const } },
};

export function RentHero({ scrollTargetId }: { scrollTargetId: string }) {
  const handleCheck = () => {
    document.getElementById(scrollTargetId)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="relative flex h-[64vh] min-h-140 items-center overflow-hidden bg-ink">
      {/* wardrobe wall, staggered reveal */}
      <motion.div
        className="absolute inset-0 flex gap-0.5 opacity-90"
        variants={wallContainer}
        initial="hidden"
        animate="show"
      >
        {WALL_COLORS.map((bg, i) => (
          <motion.div key={i} variants={wallItem} className="flex-1" style={{ background: bg }} />
        ))}
      </motion.div>

      {/* gold light beams catching the rail */}
      <div
        className="absolute inset-y-0 left-[12%] w-40 animate-[shimmer_6s_ease-in-out_infinite] opacity-90"
        style={{ background: "linear-gradient(180deg, rgba(217,176,84,0.18), transparent 55%)" }}
      />
      <div
        className="absolute inset-y-0 right-[20%] w-32 animate-[shimmer_7s_ease-in-out_infinite_1s] opacity-90"
        style={{ background: "linear-gradient(180deg, rgba(217,176,84,0.15), transparent 55%)" }}
      />

      <DustMotes count={16} className="bg-gold" />

      {/* legibility fade */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(90deg, rgba(11,11,12,0.92), rgba(11,11,12,0.35) 60%, rgba(11,11,12,0.9))",
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
          THE RENTAL WALL
        </motion.div>
        <motion.div
          variants={textItem}
          className="mt-3.5 font-serif text-4xl leading-tight text-cream sm:text-5xl lg:text-[54px]"
        >
          Rent The Perfect Look
        </motion.div>
        <motion.div variants={textItem} className="mt-3.5 max-w-125 text-[15px] text-cream-dim">
          Premium suits and blazers, ready for your next occasion — cleaned, pressed and fitted
          for you.
        </motion.div>

        <motion.div variants={textItem} className="mt-8 flex flex-wrap items-center gap-5">
          <button
            onClick={handleCheck}
            className="cursor-pointer rounded-sm bg-gold px-7.5 py-3.5 text-sm font-semibold tracking-wide text-ink transition-colors hover:bg-gold-pale"
          >
            Check Availability
          </button>
          <button
            onClick={handleCheck}
            aria-label="Scroll to availability"
            className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border border-gold/50 text-gold transition-colors hover:bg-gold hover:text-ink"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </motion.div>

        <motion.div variants={textItem} className="mt-7 text-[11px] tracking-[2.5px] text-text-faint">
          SAME-DAY FITTING &nbsp;—&nbsp; DRY CLEANED &amp; PRESSED &nbsp;—&nbsp; DAMAGE COVER INCLUDED
        </motion.div>
      </motion.div>
    </div>
  );
}
