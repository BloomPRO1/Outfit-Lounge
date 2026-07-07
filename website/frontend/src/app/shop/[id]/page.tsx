"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { ProductCard } from "@/components/shop/ProductCard";
import { useCart } from "@/components/cart/CartProvider";
import {
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

export default function ShopProductPage() {
  const params = useParams<{ id: string }>();
  const [product, setProduct] = useState<ProductDetail | null | undefined>(undefined);
  const [activeImage, setActiveImage] = useState(0);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [addedMessage, setAddedMessage] = useState<string | null>(null);
  const [related, setRelated] = useState<ProductSummary[]>([]);
  const { addItem } = useCart();

  useEffect(() => {
    fetchProduct(params.id, "sale").then((p) => {
      setProduct(p);
      if (p) {
        const sizes = Array.from(new Set(p.variants.map((v) => v.size).filter(Boolean)));
        const colors = Array.from(new Set(p.variants.map((v) => v.color).filter(Boolean)));
        setSelectedSize((sizes[0] as string) ?? null);
        setSelectedColor((colors[0] as string) ?? null);
        if (p.category_slug) {
          fetchProducts("sale", { category: p.category_slug, limit: 4 }).then((res) =>
            setRelated(res.data.filter((r) => r.id !== p.id).slice(0, 4))
          );
        }
      }
    });
  }, [params.id]);

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
          <div className="font-serif text-2xl text-ink">Product not available</div>
          <div className="mt-2 text-sm text-text-faint">
            It may be out of stock for sale or no longer active.
          </div>
          <Link href="/shop" className="mt-6 inline-block text-sm text-gold-deep underline">
            ← Back to Shop
          </Link>
        </div>
        <SiteFooter />
      </div>
    );
  }

  const price = selectedVariant?.selling_price ?? product.selling_price;
  const images = product.images;

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <SiteNav theme="light" />

      <div className="px-6 pt-5 text-[13px] text-text-faint sm:px-10 lg:px-14">
        <Link href="/shop" className="hover:text-gold-deep">
          Shop
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

          <div className="text-2xl font-semibold text-ink">{formatPrice(price)}</div>

          {sizes.length > 0 && (
            <div>
              <div className="mb-2.5 text-[13px] text-text-body">SIZE</div>
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

          <div className="mt-2.5 flex gap-4">
            <button
              onClick={() => {
                if (!selectedVariant) return;
                addItem({
                  variantId: selectedVariant.id,
                  productId: product.id,
                  name: product.name,
                  size: selectedVariant.size,
                  color: selectedVariant.color,
                  unitPrice: parseFloat(selectedVariant.selling_price ?? product.selling_price ?? "0"),
                  quantity: 1,
                  imageId: images[0]?.id ?? null,
                });
                setAddedMessage("Added to cart!");
              }}
              disabled={!selectedVariant}
              className="flex-1 rounded-sm bg-ink py-4 text-sm font-semibold text-white transition-colors hover:bg-gold hover:text-ink disabled:opacity-40"
            >
              Add to Cart
            </button>
            <button className="rounded-sm border border-border-light px-6 py-4 text-sm">♡ Save</button>
          </div>
          {addedMessage && <div className="text-[13px] text-gold-deep">{addedMessage}</div>}

          <div className="flex flex-col gap-2 border-t border-border-light pt-5 text-[13px] text-text-muted">
            <div>✓ Free alterations included</div>
            <div>✓ Dry-cleaned and steamed before delivery</div>
            <div>✓ Ships in 3–5 business days</div>
          </div>
        </div>
      </div>

      {related.length > 0 && (
        <div className="mx-auto w-full max-w-7xl px-6 pb-24 sm:px-10 lg:px-14">
          <div className="mb-6 font-serif text-2xl text-ink">You May Also Like</div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {related.map((r) => (
              <ProductCard key={r.id} product={r} context="sale" />
            ))}
          </div>
        </div>
      )}

      <SiteFooter />
    </div>
  );
}
