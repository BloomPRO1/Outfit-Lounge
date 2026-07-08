import { PoolClient } from 'pg';

export type PromotionScope = 'sale' | 'rental';

export type CartLine = { categoryId: string | null; amount: number };

export type BestWebsitePromotion = {
  id: string;
  title: string;
  discount: number;
};

/**
 * Website-only promotions: fully separate from the ERP's `promotions` /
 * `promotion_codes` tables (which stay ERP/in-store only). No codes — the
 * admin targets a promotion at specific categories (or all, if category_ids
 * is empty/NULL), a scope (sale/rental/both), an optional weekend-only
 * restriction, and a date range; it auto-applies at checkout/booking.
 *
 * For each active, currently-in-window candidate, the "eligible base" is the
 * sum of cart-line amounts whose category matches the promotion's targets
 * (or the whole cart if the promotion targets all categories). The single
 * promotion producing the largest discount is auto-picked — same "best of
 * several automatic candidates" pattern used for the ERP promotions
 * previously, just with a category-eligibility filter layered in.
 */
export async function findBestWebsitePromotion(
  client: PoolClient,
  scope: PromotionScope,
  lines: CartLine[]
): Promise<BestWebsitePromotion | null> {
  const wholeCartTotal = lines.reduce((s, l) => s + l.amount, 0);
  if (wholeCartTotal <= 0) return null;

  const candidates = await client.query(
    `SELECT * FROM website_promotions
     WHERE is_active = true
       AND CURRENT_DATE BETWEEN start_date AND end_date
       AND (scope = $1 OR scope = 'both')
       AND (NOT weekend_only OR EXTRACT(DOW FROM CURRENT_DATE) IN (0, 6))`,
    [scope]
  );

  let best: BestWebsitePromotion | null = null;

  for (const promo of candidates.rows) {
    const categoryIds: string[] | null = promo.category_ids;
    const eligibleBase =
      categoryIds && categoryIds.length > 0
        ? lines
            .filter((l) => l.categoryId && categoryIds.includes(l.categoryId))
            .reduce((s, l) => s + l.amount, 0)
        : wholeCartTotal;

    if (eligibleBase <= 0) continue;
    if (promo.min_order_amount && eligibleBase < parseFloat(promo.min_order_amount)) continue;

    let discount = 0;
    if (promo.discount_type === 'percentage') {
      discount = eligibleBase * (parseFloat(promo.discount_value) / 100);
    } else if (promo.discount_type === 'flat_amount') {
      discount = Math.min(parseFloat(promo.discount_value), eligibleBase);
    }
    discount = Math.max(0, discount);

    if (discount > 0 && (!best || discount > best.discount)) {
      best = { id: promo.id, title: promo.title, discount };
    }
  }

  return best;
}

export async function recordWebsitePromotionUsage(
  client: PoolClient,
  promotion: BestWebsitePromotion,
  ref: { saleId?: string; rentalId?: string }
): Promise<void> {
  await client.query(
    `INSERT INTO website_promotion_usages (website_promotion_id, sale_id, rental_id, discount_amount)
     VALUES ($1, $2, $3, $4)`,
    [promotion.id, ref.saleId ?? null, ref.rentalId ?? null, promotion.discount]
  );
}
