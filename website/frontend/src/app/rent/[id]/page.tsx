"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { ProductCard } from "@/components/shop/ProductCard";
import { DateRangePicker, defaultDateRange } from "@/components/shop/DateRangePicker";
import { useAuth } from "@/lib/useAuth";
import { createBooking, BookingResult } from "@/lib/orders";
import {
  DateRange,
  ProductDetail,
  ProductSummary,
  fetchProduct,
  fetchProducts,
  imageUrl,
} from "@/lib/api";

function formatPrice(value: string | null | undefined): string {
  if (!value) return "—";
  const n = parseFloat(value);
  return `Rs ${n.toLocaleString("en-LK", { maximumFractionDigits: 0 })}`;
}

function dayCount(range: DateRange): number {
  const ms = new Date(range.endDate).getTime() - new Date(range.startDate).getTime();
  return Math.max(1, Math.round(ms / 86400000) + 1);
}

export default function RentProductPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { customer } = useAuth();
  const [dateRange, setDateRange] = useState<DateRange>(defaultDateRange());
  const [product, setProduct] = useState<ProductDetail | null | undefined>(undefined);
  const [activeImage, setActiveImage] = useState(0);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [related, setRelated] = useState<ProductSummary[]>([]);
  const [promoCode, setPromoCode] = useState("");
  const [booking, setBooking] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [bookingResult, setBookingResult] = useState<BookingResult | null>(null);

  useEffect(() => {
    queueMicrotask(() => {
      setProduct(undefined);
      setBookingResult(null);
      setBookingError(null);
    });
    fetchProduct(params.id, "rent", dateRange).then((p) => {
      setProduct(p);
      if (p) {
        const sizes = Array.from(new Set(p.variants.map((v) => v.size).filter(Boolean)));
        const colors = Array.from(new Set(p.variants.map((v) => v.color).filter(Boolean)));
        setSelectedSize((sizes[0] as string) ?? null);
        setSelectedColor((colors[0] as string) ?? null);
        if (p.category_slug) {
          fetchProducts("rent", { category: p.category_slug, limit: 4, dateRange }).then((res) =>
            setRelated(res.data.filter((r) => r.id !== p.id).slice(0, 4))
          );
        }
      }
    });
  }, [params.id, dateRange]);

  const sizes = useMemo(
    () => Array.from(new Set((product?.variants ?? []).map((v) => v.size).filter(Boolean))) as string[],
    [product]
  );
  const colors = useMemo(
    () => Array.from(new Set((product?.variants ?? []).map((v) => v.color).filter(Boolean))) as string[],
    [product]
  );

  const selectedVariant = useMemo(() => {
    if (!product) return null;
    return (
      product.variants.find(
        (v) =>
          (sizes.length === 0 || v.size === selectedSize) &&
          (colors.length === 0 || v.color === selectedColor)
      ) ?? product.variants[0]
    );
  }, [product, selectedSize, selectedColor, sizes, colors]);

  async function handleBookNow() {
    if (!selectedVariant) return;
    if (!customer) {
      router.push(`/login?next=/rent/${params.id}`);
      return;
    }
    setBookingError(null);
    setBooking(true);
    try {
      const res = await createBooking({
        variantId: selectedVariant.id,
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        promoCode: promoCode.trim() || undefined,
      });
      setBookingResult(res);
    } catch (err) {
      setBookingError(err instanceof Error ? err.message : "Booking failed");
    } finally {
      setBooking(false);
    }
  }

  if (product === undefined) {
    return (
      <div className="flex min-h-screen flex-col bg-white">
        <SiteNav theme="light" />
        <div className="flex-1 py-32 text-center text-sm text-text-faint">Loading…</div>
        <SiteFooter />
      </div>
    );
  }

  if (product === null) {
    return (
      <div className="flex min-h-screen flex-col bg-white">
        <SiteNav theme="light" />
        <div className="flex-1 py-32 text-center">
          <div className="font-serif text-2xl text-ink">Not available for rent</div>
          <div className="mt-2 text-sm text-text-faint">
            No sizes are free for {dateRange.startDate} → {dateRange.endDate}. Try different dates.
          </div>
          <Link href="/rent" className="mt-6 inline-block text-sm text-gold-deep underline">
            ← Back to Rent
          </Link>
        </div>
        <SiteFooter />
      </div>
    );
  }

  const pricePerDay = selectedVariant?.rental_price_per_day ?? product.rental_price_per_day;
  const days = dayCount(dateRange);
  const images = product.images;

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <SiteNav theme="light" />

      <div className="px-6 pt-5 text-[13px] text-text-faint sm:px-10 lg:px-14">
        <Link href="/rent" className="hover:text-gold-deep">
          Rent
        </Link>{" "}
        / <span className="text-ink">{product.name}</span>
      </div>

      <div className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-10 px-6 py-6 sm:px-10 lg:grid-cols-2 lg:px-14">
        {/* gallery */}
        <div className="flex flex-col gap-3.5">
          <div className="flex h-140 items-center justify-center overflow-hidden rounded-md bg-cream-soft">
            {images.length > 0 ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imageUrl(images[activeImage]?.id ?? images[0].id, 900)}
                alt={product.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="font-mono text-xs tracking-wide text-text-faint">NO IMAGE</span>
            )}
          </div>
          {images.length > 1 && (
            <div className="grid grid-cols-4 gap-3">
              {images.map((img, i) => (
                <button
                  key={img.id}
                  onClick={() => setActiveImage(i)}
                  className={
                    "h-25 overflow-hidden rounded border-2 " +
                    (i === activeImage ? "border-gold" : "border-transparent")
                  }
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={imageUrl(img.id, 200)} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* info */}
        <div className="flex flex-col gap-5 lg:pl-14">
          <div>
            <div className="text-xs tracking-[3px] text-gold-deep">
              {product.category_name?.toUpperCase()}
            </div>
            <div className="mt-2.5 font-serif text-3xl text-ink sm:text-4xl">{product.name}</div>
            {product.description && (
              <div className="mt-2.5 text-sm leading-relaxed text-text-muted">
                {product.description}
              </div>
            )}
          </div>

          <DateRangePicker value={dateRange} onChange={setDateRange} />

          <div>
            <div className="text-2xl font-semibold text-ink">
              {formatPrice(pricePerDay)}
              <span className="text-sm font-normal text-text-faint"> / day</span>
            </div>
            <div className="mt-1 text-[13px] text-text-faint">
              {days} day{days > 1 ? "s" : ""} ({dateRange.startDate} → {dateRange.endDate}) ≈{" "}
              {formatPrice(pricePerDay ? String(parseFloat(pricePerDay) * days) : null)}
            </div>
          </div>

          {sizes.length > 0 && (
            <div>
              <div className="mb-2.5 text-[13px] text-text-body">
                SIZE — available for selected dates
              </div>
              <div className="flex flex-wrap gap-2.5">
                {sizes.map((size) => (
                  <button
                    key={size}
                    onClick={() => setSelectedSize(size)}
                    className={
                      "flex h-11 min-w-11 items-center justify-center rounded border px-2 text-[13px] " +
                      (selectedSize === size
                        ? "border-ink bg-ink text-white"
                        : "border-border-light text-ink")
                    }
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>
          )}

          {colors.length > 1 && (
            <div>
              <div className="mb-2.5 text-[13px] text-text-body">COLOR</div>
              <div className="flex gap-2.5 text-[13px]">
                {colors.map((color) => (
                  <button
                    key={color}
                    onClick={() => setSelectedColor(color)}
                    className={
                      "rounded-full border px-4 py-1.5 " +
                      (selectedColor === color ? "border-gold text-gold-deep" : "border-border-light")
                    }
                  >
                    {color}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <div className="mb-1.5 text-[13px] text-text-body">Have a promo code?</div>
            <input
              type="text"
              value={promoCode}
              onChange={(e) => setPromoCode(e.target.value)}
              placeholder="e.g. AD1"
              className="w-full max-w-50 rounded border border-border-light px-3.5 py-2.5 text-sm uppercase focus:border-gold focus:outline-none"
            />
          </div>

          <div className="mt-2.5 flex gap-4">
            <button
              onClick={handleBookNow}
              disabled={!selectedVariant || booking}
              className="flex-1 rounded-sm bg-ink py-4 text-sm font-semibold text-white transition-colors hover:bg-gold hover:text-ink disabled:opacity-40"
            >
              {booking ? "Booking…" : "Book Now"}
            </button>
            <button className="rounded-sm border border-border-light px-6 py-4 text-sm">♡ Save</button>
          </div>
          {bookingError && <div className="text-[13px] text-red-600">{bookingError}</div>}
          {bookingResult && (
            <div className="rounded-sm border border-gold/40 bg-cream-soft p-4 text-[13px] text-text-body">
              <span className="font-semibold text-gold-deep">Booked!</span> Reservation{" "}
              <span className="font-semibold">{bookingResult.rental.booking_number}</span> is
              confirmed for {bookingResult.days} day{bookingResult.days > 1 ? "s" : ""} —{" "}
              {formatPrice(String(bookingResult.netCost))}
              {bookingResult.totalCost !== bookingResult.netCost && (
                <span className="text-text-faint"> (was {formatPrice(String(bookingResult.totalCost))})</span>
              )}
              . Visit the shop on your pickup date to collect it and complete payment.
              {(bookingResult.appliedPromotion || bookingResult.appliedPromoCode) && (
                <div className="mt-1.5 text-gold-deep">
                  You saved with{" "}
                  {bookingResult.appliedPromotion && `"${bookingResult.appliedPromotion.name}"`}
                  {bookingResult.appliedPromotion && bookingResult.appliedPromoCode && " and "}
                  {bookingResult.appliedPromoCode && `code ${bookingResult.appliedPromoCode.code}`}!
                </div>
              )}
            </div>
          )}

          <div className="flex flex-col gap-2 border-t border-border-light pt-5 text-[13px] text-text-muted">
            <div>✓ Free alterations included</div>
            <div>✓ Dry-cleaned and steamed before delivery</div>
            <div>✓ Returned by the end of your selected date range</div>
          </div>
        </div>
      </div>

      {related.length > 0 && (
        <div className="mx-auto w-full max-w-7xl px-6 pb-24 sm:px-10 lg:px-14">
          <div className="mb-6 font-serif text-2xl text-ink">You May Also Like</div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {related.map((r) => (
              <ProductCard key={r.id} product={r} context="rent" />
            ))}
          </div>
        </div>
      )}

      <SiteFooter />
    </div>
  );
}
