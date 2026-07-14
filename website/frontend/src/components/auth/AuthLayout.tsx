"use client";

import Link from "next/link";
import { ReactNode } from "react";
import { motion } from "framer-motion";

function ImagePanel({ quote, imageFirst }: { quote: string; imageFirst: boolean }) {
  return (
    <motion.div
      className="relative flex items-center justify-center overflow-hidden bg-ink"
      style={{ minHeight: "50vh" }}
      initial={{ opacity: 0, x: imageFirst ? -40 : 40 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
    >
      <div
        className="absolute inset-0"
        style={{
          background:
            "repeating-linear-gradient(100deg, #14110d 0px, #14110d 60px, #181410 60px, #181410 120px)",
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 700px 700px at 50% 40%, rgba(217,176,84,0.18), transparent 65%)",
        }}
      />
      <motion.div
        className="relative px-10 py-14 text-center"
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.25 }}
      >
        <Link href="/" className="font-serif text-3xl tracking-wide text-cream-soft">
          OUTFIT <span className="text-gold">LOUNGE</span>
        </Link>
        <div className="mt-7 max-w-95 font-serif text-2xl text-cream-dim italic">{quote}</div>
      </motion.div>
    </motion.div>
  );
}

export function AuthLayout({
  quote,
  imageFirst = true,
  children,
}: {
  quote: string;
  imageFirst?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="grid min-h-screen grid-cols-1 md:grid-cols-2">
      {imageFirst && <ImagePanel quote={quote} imageFirst={imageFirst} />}
      <motion.div
        className="flex items-center justify-center bg-white px-6 py-14 sm:px-10"
        initial={{ opacity: 0, x: imageFirst ? 40 : -40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="w-full max-w-100">{children}</div>
      </motion.div>
      {!imageFirst && <ImagePanel quote={quote} imageFirst={imageFirst} />}
    </div>
  );
}
