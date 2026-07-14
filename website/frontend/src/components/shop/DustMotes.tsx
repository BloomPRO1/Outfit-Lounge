"use client";

import { useEffect, useState } from "react";

type Mote = { x: number; dur: number; delay: number };

export function DustMotes({
  count = 14,
  className = "bg-gold",
}: {
  count?: number;
  className?: string;
}) {
  const [motes, setMotes] = useState<Mote[]>([]);

  useEffect(() => {
    setMotes(
      Array.from({ length: count }, () => ({
        x: Math.round(Math.random() * 96),
        dur: 7 + Math.random() * 7,
        delay: Math.random() * 7,
      }))
    );
  }, [count]);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {motes.map((d, i) => (
        <div
          key={i}
          className={`absolute bottom-[8%] h-[3px] w-[3px] rounded-full ${className}`}
          style={{ left: `${d.x}%`, animation: `dust ${d.dur}s linear infinite ${d.delay}s` }}
        />
      ))}
    </div>
  );
}
