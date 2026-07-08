"use client";

import Link from "next/link";
import { Promotion } from "@/lib/promotions";

function discountLabel(promo: Promotion): string {
  if (promo.discount_type === "percentage") {
    return `${parseFloat(promo.discount_value)}% OFF`;
  }
  const n = parseFloat(promo.discount_value);
  return `Rs ${n.toLocaleString("en-LK", { maximumFractionDigits: 0 })} OFF`;
}

export function PromotionSlide({ promotion }: { promotion: Promotion | null | undefined }) {
  const hasImage = Boolean(promotion?.banner_image);

  return (
    <div className="relative h-full w-full overflow-hidden bg-ink">
      {hasImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={promotion!.banner_image!}
          alt={promotion!.title}
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 900px 500px at 50% 30%, rgba(217,176,84,0.25), transparent 62%), repeating-linear-gradient(100deg, #14110d 0px, #14110d 60px, #181410 60px, #181410 120px)",
          }}
        />
      )}

      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, rgba(11,11,12,0.35) 0%, rgba(11,11,12,0.35) 40%, rgba(5,4,3,0.88) 100%)",
        }}
      />

      <div className="absolute inset-x-0 bottom-[16%] z-10 px-6 text-center">
        {promotion ? (
          <>
            <div className="mb-4.5 text-[13px] tracking-[5px] text-gold">LIMITED TIME</div>
            <div className="font-serif text-4xl leading-tight text-cream sm:text-5xl lg:text-[56px]">
              {promotion.title}
            </div>
            <div className="mx-auto mt-4 inline-block rounded-sm bg-gold px-4 py-1.5 text-sm font-bold tracking-wide text-ink">
              {discountLabel(promotion)}
            </div>
            {promotion.description && (
              <div className="mx-auto mt-4.5 max-w-130 text-base text-cream-dim">
                {promotion.description}
              </div>
            )}
            <div className="mt-8 flex justify-center gap-4">
              <Link
                href="/promotions"
                className="rounded-sm bg-gold px-7.5 py-3.5 text-sm font-semibold tracking-wide text-ink"
              >
                View Promotions
              </Link>
            </div>
          </>
        ) : (
          <>
            <div className="mb-4.5 text-[13px] tracking-[5px] text-gold">STAY TUNED</div>
            <div className="font-serif text-4xl leading-tight text-cream sm:text-5xl lg:text-[56px]">
              New Offers Coming Soon
            </div>
            <div className="mx-auto mt-4.5 max-w-130 text-base text-cream-dim">
              Check back soon for exclusive rental and shop promotions.
            </div>
            <div className="mt-8 flex justify-center gap-4">
              <Link
                href="/promotions"
                className="rounded-sm border border-cream-soft px-7.5 py-3.5 text-sm font-semibold tracking-wide text-cream-soft"
              >
                View Promotions
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
