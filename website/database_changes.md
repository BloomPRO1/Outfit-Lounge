# Database Schema Changes

Log of every schema change (tables, columns, indexes, constraints, functions, triggers) made to the local `tailorshop_website` database as part of website work. Every entry here must be approved by the user *before* the change is made (see `website/CLAUDE.md`). Most recent first.

Each entry: what changed, why, and the exact SQL run.

---

## 2026-07-07 — `website_customers` table (customer login/registration)

**Approved by user**: yes (implicit in the request to build login/registration; investigated first and confirmed no ERP tables were suitable).

**What**: created a new, fully isolated table for website customer accounts — no FK to any ERP-owned table.

```sql
CREATE TABLE website_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT website_customers_email_key UNIQUE (email)
);

CREATE INDEX idx_website_customers_email ON website_customers (email);
```

**Why**: the ERP's `customers` table has no auth fields (just contact info staff enter for a sale/rental) and `users` is the ERP staff/admin login table — neither fits public customer accounts. `website_customers` is not linked to `customers` via FK; at checkout/booking time the website looks up (or creates) a matching `customers` row by email so `sales`/`rentals` can still reference a normal `customers.id`, without needing any schema change to do so.

---

## 2026-07-08 — `website_admins`, `website_promotions`, `website_promotion_usages` (website admin dashboard + website-only promotions)

**Approved by user**: yes, explicitly, before running (asked via the schema-change gate, user picked "Yes, create all 3").

**What**: three new, isolated tables — no ERP-owned table altered. `website_promotion_usages` has FKs *to* `sales`/`rentals` (read-only references, same pattern the ERP's own `promotion_usages` already uses) but nothing writes to or alters those tables' structure.

```sql
CREATE TABLE website_admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE website_promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  banner_image TEXT,
  discount_type VARCHAR(20) NOT NULL CHECK (discount_type IN ('percentage','flat_amount')),
  discount_value NUMERIC(10,2) NOT NULL CHECK (discount_value > 0),
  scope VARCHAR(20) NOT NULL DEFAULT 'both' CHECK (scope IN ('sale','rental','both')),
  category_ids UUID[],
  weekend_only BOOLEAN NOT NULL DEFAULT false,
  min_order_amount NUMERIC(10,2),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES website_admins(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_website_promotions_active_dates ON website_promotions (is_active, start_date, end_date);

CREATE TABLE website_promotion_usages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  website_promotion_id UUID NOT NULL REFERENCES website_promotions(id) ON DELETE CASCADE,
  sale_id UUID REFERENCES sales(id) ON DELETE SET NULL,
  rental_id UUID REFERENCES rentals(id) ON DELETE SET NULL,
  discount_amount NUMERIC(10,2) NOT NULL,
  used_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_website_usage_has_ref CHECK (sale_id IS NOT NULL OR rental_id IS NOT NULL)
);

CREATE INDEX idx_website_promotion_usages_promo ON website_promotion_usages (website_promotion_id);
CREATE INDEX idx_website_promotion_usages_sale ON website_promotion_usages (sale_id);
CREATE INDEX idx_website_promotion_usages_rental ON website_promotion_usages (rental_id);
```

Also seeded one row into `website_admins`: `admin@gmail.com` / password `admin123` (bcrypt-hashed, 10 rounds) — the fixed admin credentials the user requested.

**Why**: the user wants the website's promotions to be entirely separate from the ERP's `promotions`/`promotion_codes` tables (those stay ERP/in-store only), managed instead by a website admin dashboard, with no promo codes — promotions auto-apply based on category/scope/weekend-only rules the admin sets, each with its own banner image. `website_admins` is a separate identity from `website_customers` (not reused) so a customer registering with the admin's email can never collide with or impersonate the admin account. `category_ids UUID[]` stores which `product_categories.id`s a promotion targets (empty/NULL = all categories); no FK on array elements (Postgres doesn't support that), validated at the application layer instead.
