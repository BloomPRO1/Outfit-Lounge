"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Dust = { x: number; dur: number; delay: number };

export function VideoSlide() {
  const [doorsOpen, setDoorsOpen] = useState(false);
  const [dust, setDust] = useState<Dust[]>([]);

  useEffect(() => {
    const dustTimer = setTimeout(() => {
      setDust(
        Array.from({ length: 16 }, () => ({
          x: Math.round(Math.random() * 90),
          dur: 6 + Math.random() * 6,
          delay: Math.random() * 6,
        }))
      );
    }, 0);
    const doorsTimer = setTimeout(() => setDoorsOpen(true), 400);
    return () => {
      clearTimeout(dustTimer);
      clearTimeout(doorsTimer);
    };
  }, []);

  const doorTransition = "transform 2.2s cubic-bezier(0.7,0,0.2,1)";

  return (
    <div className="relative h-full w-full overflow-hidden bg-ink">
      {/* video backdrop — object-position anchored to top so cover-cropping
          (when the viewport aspect ratio doesn't match the video's 16:9)
          only ever trims the bottom, keeping the subject's head in frame. */}
      <video
        className="absolute inset-0 h-full w-full object-cover object-top"
        src="/assets/Video_Project.mp4"
        autoPlay
        muted
        loop
        playsInline
      />

      {/* gold + dark gradient grade over the footage */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 1000px 600px at 50% 25%, rgba(217,176,84,0.28), transparent 62%), linear-gradient(180deg, rgba(11,11,12,0.35) 0%, rgba(11,11,12,0.15) 35%, rgba(11,11,12,0.55) 75%, rgba(5,4,3,0.92) 100%)",
        }}
      >
        <div
          className="absolute inset-x-0 bottom-0 h-[45%]"
          style={{ background: "linear-gradient(180deg, transparent, #050403 90%)" }}
        />

        <div
          className="absolute top-0 left-[14%] h-full w-40 animate-[shimmer_6s_ease-in-out_infinite]"
          style={{ background: "linear-gradient(180deg, rgba(217,176,84,0.16), transparent 55%)" }}
        />
        <div
          className="absolute top-0 right-[16%] h-full w-40 animate-[shimmer_7s_ease-in-out_infinite_1s]"
          style={{ background: "linear-gradient(180deg, rgba(217,176,84,0.14), transparent 55%)" }}
        />

        {dust.map((d, i) => (
          <div
            key={i}
            className="absolute bottom-[20%] h-[3px] w-[3px] rounded-full bg-gold"
            style={{
              left: `${d.x}%`,
              animation: `dust ${d.dur}s linear infinite ${d.delay}s`,
            }}
          />
        ))}
      </div>

      {/* sliding doors */}
      <div
        className="absolute inset-y-0 left-0 z-5 w-1/2 border-r-2 border-gold"
        style={{
          background: "linear-gradient(120deg,#1c140b,#0b0805)",
          transform: doorsOpen ? "translateX(-102%)" : "translateX(0)",
          transition: doorTransition,
        }}
      />
      <div
        className="absolute inset-y-0 right-0 z-5 w-1/2 border-l-2 border-gold"
        style={{
          background: "linear-gradient(240deg,#1c140b,#0b0805)",
          transform: doorsOpen ? "translateX(102%)" : "translateX(0)",
          transition: doorTransition,
        }}
      />

      {/* headline */}
      <div
        className="absolute inset-x-0 bottom-[14%] z-10 px-6 text-center"
        style={{
          opacity: doorsOpen ? 1 : 0,
          transition: "opacity 1.4s ease 1.6s",
        }}
      >
        <div className="mb-4.5 text-[13px] tracking-[5px] text-gold">MENSWEAR, REDEFINED</div>
        <div className="font-serif text-5xl leading-tight text-cream sm:text-6xl lg:text-[68px]">
          Step Into The Lounge
        </div>
        <div className="mx-auto mt-4.5 max-w-130 text-base text-cream-dim">
          Rent or own the finest tuxedos, suits and accessories — curated for every occasion.
        </div>
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
      <div
        className="absolute bottom-9 left-1/2 -translate-x-1/2 text-[11px] tracking-[3px] text-text-faint"
        style={{ opacity: doorsOpen ? 1 : 0, transition: "opacity 1.4s ease 1.6s" }}
      >
        SCROLL
      </div>
    </div>
  );
}
