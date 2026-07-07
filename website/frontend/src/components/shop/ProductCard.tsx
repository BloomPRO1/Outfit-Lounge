import Link from "next/link";
import { ProductSummary, ShopContext, imageUrl } from "@/lib/api";

function formatPrice(value: string | null): string {
  if (!value) return "—";
  const n = parseFloat(value);
  return `Rs ${n.toLocaleString("en-LK", { maximumFractionDigits: 0 })}`;
}

export function ProductCard({
  product,
  context,
}: {
  product: ProductSummary;
  context: ShopContext;
}) {
  const href = `/${context === "rent" ? "rent" : "shop"}/${product.id}`;
  const badge = context === "rent" ? "RENT" : "BUY";

  return (
    <div className="group overflow-hidden rounded-md border border-border-light transition-all duration-350 hover:-translate-y-2 hover:shadow-[0_20px_40px_-14px_rgba(0,0,0,0.25)]">
      <div className="relative flex h-75 items-center justify-center bg-cream-soft">
        {product.primary_image_id ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl(product.primary_image_id, 500)}
            alt={product.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="font-mono text-[11px] tracking-wide text-text-faint">NO IMAGE</span>
        )}
        <div className="absolute top-3 left-3 rounded-sm bg-ink px-2.5 py-1 text-[11px] font-bold text-gold">
          {badge}
        </div>
      </div>
      <div className="p-4.5">
        <div className="font-serif text-lg text-ink">{product.name}</div>
        <div className="mt-1 text-[13px] text-text-faint">{product.category_name}</div>
        {context === "rent" &&
          product.max_available_qty !== undefined &&
          product.max_available_qty <= 2 && (
            <div className="mt-1.5 text-[12px] text-gold-deep">
              Only {product.max_available_qty} left for these dates
            </div>
          )}
        <div className="mt-3.5 flex items-center justify-between">
          <div className="text-base font-semibold text-ink">
            From {formatPrice(product.from_price)}
            {context === "rent" && <span className="text-xs font-normal text-text-faint">/day</span>}
          </div>
          <Link
            href={href}
            className="rounded-sm bg-ink px-4 py-2 text-[13px] text-white transition-colors hover:bg-gold hover:text-ink"
          >
            View
          </Link>
        </div>
      </div>
    </div>
  );
}
