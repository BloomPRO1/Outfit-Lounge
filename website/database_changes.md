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
