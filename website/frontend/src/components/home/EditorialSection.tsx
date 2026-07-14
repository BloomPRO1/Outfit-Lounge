"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";

export function EditorialSection() {
  return (
    <div className="relative h-[92vh] min-h-165 w-full overflow-hidden bg-black">
      <Image
        src="/assets/new-section.jpeg"
        alt="A tailored black suit, dramatically lit in a doorway of light"
        fill
        sizes="100vw"
        className="object-cover"
      />

      {/* legibility gradient — concentrated bottom-left, leaving the image's own drama untouched elsewhere */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(100deg, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.5) 30%, transparent 58%), linear-gradient(0deg, rgba(0,0,0,0.88) 0%, transparent 48%)",
        }}
      />

      <div className="relative z-10 flex h-full items-end px-6 pb-20 sm:px-10 lg:px-16">
        <motion.div
          className="max-w-165"
          initial={{ opacity: 0, y: 26, filter: "blur(14px)" }}
          whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          viewport={{ once: true, margin: "-120px" }}
          transition={{ duration: 1.5, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="flex items-center text-[13px] tracking-[6px] text-gold">
            <span className="mr-3 inline-block h-px w-10 bg-gold" />
            AN EDITORIAL MOMENT
          </div>
          <div className="mt-5 font-serif text-[42px] leading-[1.08] text-white sm:text-6xl lg:text-[76px]">
            Where Shadow
            <br />
            Meets Tailoring
          </div>
          <div className="mt-6 max-w-115 text-[15px] leading-relaxed text-white/70">
            Every line pressed, every silhouette considered — the suit that speaks before you do.
          </div>
          <Link
            href="/shop"
            className="group mt-8 inline-flex items-center gap-3 text-sm font-semibold tracking-wide text-gold"
          >
            Discover The Tailored Edit
            <span className="inline-block h-px w-8 bg-gold transition-all duration-300 group-hover:w-12" />
          </Link>
        </motion.div>
      </div>
    </div>
  );
}
