"use client";

import { useEffect, useRef, useState } from "react";

const ITEMS = [
  {
    label: "JACKET",
    background:
      "url('https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?fm=jpg&q=75&w=300&auto=format&fit=crop') center/cover",
  },
  {
    label: "SHIRT",
    background:
      "url('https://images.unsplash.com/photo-1564595037946-dcb73763aa57?fm=jpg&q=75&w=300&auto=format&fit=crop') center/cover",
  },
  {
    label: "TIE",
    background:
      "repeating-linear-gradient(120deg,#2a1420,#2a1420 10px,#1c0d15 10px,#1c0d15 20px)",
  },
  {
    label: "SHOES",
    background:
      "repeating-linear-gradient(120deg,#3a2a1a,#3a2a1a 10px,#2a1e12 10px,#2a1e12 20px)",
  },
  {
    label: "WATCH",
    background:
      "url('https://images.unsplash.com/photo-1491336477066-31156b5e4f35?fm=jpg&q=75&w=300&auto=format&fit=crop') center/cover",
  },
];

const RADIUS_X = 220;
const RADIUS_Y = 270;

function orbitTransform(progress: number, index: number, total: number) {
  const baseAngle = progress * 340;
  const angle = ((baseAngle + (index * 360) / total) * Math.PI) / 180;
  const depth = Math.sin(angle);
  const x = Math.cos(angle) * RADIUS_X;
  const y = depth * RADIUS_Y * 0.55;
  const scale = 0.8 + depth * 0.28;
  return `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px) scale(${scale.toFixed(4)})`;
}

export function OrbitShowcase() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const el = sectionRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const total = rect.height - window.innerHeight;
        const passed = -rect.top;
        setProgress(Math.max(0, Math.min(1, total > 0 ? passed / total : 0)));
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div ref={sectionRef} className="relative h-[280vh] bg-ink">
      <div className="sticky top-0 flex h-screen items-center justify-center overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 700px 700px at 50% 45%, rgba(217,176,84,0.14), transparent 65%)",
          }}
        />
        <div className="absolute inset-x-0 top-16 z-5 text-center">
          <div className="text-[13px] tracking-[5px] text-gold">THE COMPLETE LOOK</div>
          <div className="mt-3 font-serif text-4xl text-cream">Styled Around You</div>
        </div>

        <div className="relative h-115 w-37.5">
          <div
            className="relative h-115 w-37.5 overflow-hidden rounded-t-[70px] rounded-b-[24px] border shadow-[0_30px_60px_-10px_rgba(0,0,0,0.6)]"
            style={{
              borderColor: "rgba(217,176,84,0.4)",
              background:
                "url('https://images.unsplash.com/photo-1618886614638-80e3c103d31a?fm=jpg&q=75&w=400&auto=format&fit=crop') center 20% / cover",
            }}
          >
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(180deg, rgba(217,176,84,0.08), transparent 30%, rgba(11,11,12,0.35))",
              }}
            />
          </div>

          {ITEMS.map((item, i) => (
            <div
              key={item.label}
              className="absolute top-1/2 left-1/2 -mt-10.5 -ml-10.5 h-21 w-21 overflow-hidden rounded-full border-2 shadow-[0_10px_28px_rgba(0,0,0,0.55)]"
              style={{
                transform: orbitTransform(progress, i, ITEMS.length),
                background: item.background,
                borderColor: "rgba(217,176,84,0.7)",
              }}
            >
              <div
                className="absolute inset-0"
                style={{ background: "linear-gradient(0deg, rgba(11,11,12,0.6), transparent 55%)" }}
              />
              <span
                className="absolute right-0 bottom-1.5 left-0 text-center font-mono text-[8px] tracking-wide text-[#f7ecd3]"
                style={{ textShadow: "0 1px 3px rgba(0,0,0,0.8)" }}
              >
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
