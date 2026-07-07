import { PoolClient } from 'pg';

type Scope = 'pos' | 'rental';

type LineItem = { unitPrice: number; quantity: number };

export type AppliedPromotion = { id: string; name: string; discount: number };
export type AppliedPromoCode = { id: string; code: string; name: string; discount: number };

/**
 * Finds every currently-active automatic promotion (no code) matching the
 * given scope, date range, min order amount, and usage limit — computes each
 * one's discount using the exact same per-type formulas as the ERP's POS
 * checkout / rental booking — and returns the single best (largest discount).
 * Mirrors posController.checkout / rentalController.createRental, generalized
 * to auto-pick since there's no staff at a register to choose one.
 */
export async function findBestAutomaticPromotion(
  client: PoolClient,
  scope: Scope,
  baseAmount: number,
  items: LineItem[]
): Promise<AppliedPromotion | null> {
  const candidates = await client.query(
    `SELECT * FROM promotions
     WHERE is_active = true
       AND CURRENT_DATE BETWEEN start_date AND end_date
       AND (scope = $1 OR scope = 'both')
       AND (max_usage_count IS NULL OR usage_count < max_usage_count)
       AND (min_order_amount IS NULL OR min_order_amount <= $2)`,
    [scope, baseAmount]
  );

  let best: AppliedPromotion | null = null;

  for (const promo of candidates.rows) {
    let discount = 0;

    if (promo.type === 'percentage') {
      discount = baseAmount * (parseFloat(promo.percentage_value) / 100);
    } else if (promo.type === 'flat_amount') {
      discount = Math.min(parseFloat(promo.flat_amount_value), baseAmount);
    } else if (promo.type === 'buy_x_get_y') {
      const totalQty = items.reduce((s, i) => s + i.quantity, 0);
      if (totalQty >= promo.buy_quantity) {
        const cheapest = Math.min(...items.map((i) => i.unitPrice));
        discount = promo.get_quantity * cheapest;
      }
    } else if (promo.type === 'free_item') {
      const fv = await client.query(
        `SELECT selling_price FROM product_variants WHERE id = $1`,
        [promo.free_variant_id]
      );
      discount = parseFloat(fv.rows[0]?.selling_price || '0');
    }

    discount = Math.max(0, Math.min(discount, baseAmount));
    if (discount > 0 && (!best || discount > best.discount)) {
      best = { id: promo.id, name: promo.name, discount };
    }
  }

  return best;
}

export async function applyPromotionUsage(
  client: PoolClient,
  promotion: AppliedPromotion,
  ref: { saleId?: string; rentalId?: string }
): Promise<void> {
  await client.query(
    `INSERT INTO promotion_usages (promotion_id, sale_id, rental_id, discount_amount, used_by)
     VALUES ($1, $2, $3, $4, NULL)`,
    [promotion.id, ref.saleId ?? null, ref.rentalId ?? null, promotion.discount]
  );
  await client.query(
    `UPDATE promotions SET usage_count = usage_count + 1, updated_at = NOW() WHERE id = $1`,
    [promotion.id]
  );
  await client.query(
    `UPDATE promotions SET is_active = false, updated_at = NOW()
     WHERE id = $1 AND max_usage_count IS NOT NULL AND usage_count >= max_usage_count`,
    [promotion.id]
  );
}

/**
 * Validates and computes a customer-entered promo code's discount. Throws if
 * the code doesn't exist / isn't active / doesn't match scope — matching the
 * ERP's behavior of rejecting the whole transaction on a bad code.
 */
export async function applyPromoCode(
  client: PoolClient,
  code: string,
  scope: Scope,
  baseAmount: number
): Promise<AppliedPromoCode> {
  const res = await client.query(
    `SELECT * FROM promotion_codes
     WHERE UPPER(code) = UPPER($1) AND is_active = true AND (scope = $2 OR scope = 'both')`,
    [code, scope]
  );
  const pc = res.rows[0];
  if (!pc) throw new Error('Invalid or inactive promotion code.');

  let discount = 0;
  if (pc.discount_type === 'percentage') {
    discount = baseAmount * (parseFloat(pc.discount_value) / 100);
  } else if (pc.discount_type === 'flat_amount') {
    discount = Math.min(parseFloat(pc.discount_value), baseAmount);
  }
  discount = Math.max(0, discount);

  return { id: pc.id, code: pc.code, name: pc.name, discount };
}

export async function applyPromoCodeUsage(
  client: PoolClient,
  promoCode: AppliedPromoCode,
  ref: { saleId?: string; rentalId?: string }
): Promise<void> {
  await client.query(
    `INSERT INTO promotion_code_usages (promotion_code_id, sale_id, rental_id, discount_amount, used_by)
     VALUES ($1, $2, $3, $4, NULL)`,
    [promoCode.id, ref.saleId ?? null, ref.rentalId ?? null, promoCode.discount]
  );
  await client.query(
    `UPDATE promotion_codes SET usage_count = usage_count + 1, updated_at = NOW() WHERE id = $1`,
    [promoCode.id]
  );
}
