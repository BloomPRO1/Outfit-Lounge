"use client";

import { useEffect, useState } from "react";
import { VideoSlide } from "./VideoSlide";
import { PromotionSlide } from "./PromotionSlide";
import { fetchPromotions, Promotion } from "@/lib/promotions";

const SLIDE_COUNT = 2;

export function Hero() {
  const [slide, setSlide] = useState(0);
  const [featuredPromotion, setFeaturedPromotion] = useState<Promotion | null | undefined>(
    undefined
  );

  useEffect(() => {
    fetchPromotions()
      .then((res) => setFeaturedPromotion(res.promotions[0] ?? null))
      .catch(() => setFeaturedPromotion(null));
  }, []);

  return (
    <div className="relative h-[calc(100vh-84px)] w-full overflow-hidden bg-ink">
      <div
        className="flex h-full transition-transform duration-700 ease-in-out"
        style={{ width: `${SLIDE_COUNT * 100}%`, transform: `translateX(-${slide * (100 / SLIDE_COUNT)}%)` }}
      >
        <div style={{ width: `${100 / SLIDE_COUNT}%` }} className="h-full">
          <VideoSlide />
        </div>
        <div style={{ width: `${100 / SLIDE_COUNT}%` }} className="h-full">
          <PromotionSlide promotion={featuredPromotion} />
        </div>
      </div>

      {/* slideshow arrow */}
      <button
        onClick={() => setSlide((s) => (s + 1) % SLIDE_COUNT)}
        aria-label="Next slide"
        className="absolute top-1/2 right-6 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-gold/50 bg-ink/40 text-gold backdrop-blur-sm transition-colors hover:bg-gold hover:text-ink sm:right-9"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {/* dot indicators */}
      <div className="absolute bottom-5 left-1/2 z-20 flex -translate-x-1/2 gap-2">
        {Array.from({ length: SLIDE_COUNT }).map((_, i) => (
          <button
            key={i}
            onClick={() => setSlide(i)}
            aria-label={`Go to slide ${i + 1}`}
            className={
              "h-1.5 rounded-full transition-all " + (slide === i ? "w-5 bg-gold" : "w-1.5 bg-cream-dim/40")
            }
          />
        ))}
      </div>
    </div>
  );
}
