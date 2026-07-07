# Website — Project Guide

This folder is the **new, separate public website** for Outfit Lounge. It is independent from the existing ERP system in the repo root's `client/` and `server/` folders — see the root `CLAUDE.md` for the boundary rule: **never modify `client/` or `server/` while working here.**

## Structure

```
website/
  frontend/   Next.js (App Router) + TypeScript
  backend/    Node + Express + TypeScript + PostgreSQL
```

## `frontend/`

- Next.js, App Router, `src/` directory, TypeScript, ESLint, Tailwind CSS.
- Import alias: `@/*`.
- Env: `.env.local` (local, gitignored) / `.env.example` (template).
  - `NEXT_PUBLIC_API_URL` — base URL of `backend/` (default `http://localhost:4000/api`).
- Dev: `npm run dev` (inside `website/frontend`) — runs on port 3000 by default (change with `-p` if it collides with the ERP client).
- Build: `npm run build`.

## `backend/`

- Express + TypeScript, plain `pg` (`node-postgres`) — no ORM.
- Entry point: `src/index.ts`. Structure mirrors the ERP server's layout (`config/`, `routes/`, `controllers/`, `middleware/`, `services/`, `db/`, `utils/`) for consistency, but the code itself is entirely separate.
- Env: `.env` (local, gitignored) / `.env.example` (template).
  - `DATABASE_URL` — **must be set to the same Postgres connection string as the ERP's `server/.env`**, since both apps share one database.
  - `PORT` — default `4000` (kept distinct from the ERP server's `3000`).
  - `CLIENT_URL` — this website's frontend origin, for CORS (default `http://localhost:3001`).
- Dev: `npm run dev` (inside `website/backend`), uses `ts-node-dev`.
- Build: `npm run build` (`tsc` → `dist/`), run with `npm start`.
- Health check: `GET /api/health` — verifies DB connectivity.

## Database

Conceptually this website shares **one Postgres database** with the ERP (`client/`+`server/`), which runs on Railway (project `inspiring-hope`, `Postgres` service, `production` environment).

**Local dev setup:** rather than developing against the live Railway DB directly, `website/backend/.env`'s `DATABASE_URL` points at a **local Postgres restore** of that database:

- Local server: PostgreSQL 18, running as a Windows service, binaries at `E:\Software\PostgresSQL\18\bin` (not under `Program Files` — that path only has the data directory).
- Local database name: `tailorshop_website`, user `postgres`, port `5432`.
- It was created by `pg_dump`-ing the Railway Postgres (via `DATABASE_PUBLIC_URL` from `railway variables -s Postgres`) and `pg_restore`-ing into a fresh local DB — a **read-only export of production**, not a live connection. Railway itself was never modified.
- This local copy is a **snapshot** — it does not auto-sync. Re-run the dump/restore steps to refresh it if the ERP's production data has since changed.
- Password note: if the local Postgres password contains special characters (e.g. `@`), percent-encode them in the `DATABASE_URL` connection string (e.g. `@` → `%40`).

Implications for schema/data changes:

- Never run migrations, schema changes, or destructive queries from `website/backend` against shared tables without explicit confirmation from the user — the ERP depends on that schema staying intact, and any change meant for real production data must go through the actual Railway DB, not just the local copy.
- Prefer additive, isolated tables/columns for anything website-specific over altering tables the ERP already owns.
- If a website feature needs to read/write data the ERP also owns (e.g. products, orders), confirm the exact tables/columns with the user before writing queries against them.

## Ports (local dev)

| App              | Port |
|------------------|------|
| ERP client       | 5173 |
| ERP server       | 3000 |
| Website frontend | 3001 (adjust if run alongside ERP client) |
| Website backend  | 4000 |

## Never commit, push, or touch GitHub yourself

Same rule as the root `CLAUDE.md`: only develop (write/edit code, run it locally). Never `git commit`, `git push`, `git add` toward a commit, or touch GitHub (PRs/issues) on your own initiative in this folder either — the user commits and pushes everything themselves.

## Scope reminder

All work for "the website" happens inside this folder. Do not touch the repo root's `client/`, `server/`, `railway.toml`, root `package.json`, or the `backup_*.dump` files as part of website tasks.

## Log every change in `changes.md`

`website/changes.md` is a running change log for this subproject. **Every time you develop or change something in `website/`, add an entry to `changes.md`** (most-recent-first), briefly describing what changed and why. This includes code changes, new dependencies, config/env changes, and database setup — not just large features. Do this as part of the same turn you make the change, don't wait to be asked.

## Keep `database.sql` in sync with the database

`website/database.sql` is a **schema-only** snapshot (tables, columns, indexes, constraints, functions, triggers — no data) of the local `tailorshop_website` database, regenerated with:

```
pg_dump -U postgres -h localhost -p 5432 -d tailorshop_website --schema-only --no-owner --no-privileges -f website/database.sql
```

**Any time the database schema changes** — a new table, column, index, constraint, function, or trigger, whether made directly against the local DB or as a result of website work — **regenerate `website/database.sql` immediately, in the same turn.** Don't let it drift out of sync with the real schema. (Data changes constantly through normal use and are not tracked here — only structure.)

## Ask before any database schema change

**Never alter the database schema (new/changed/dropped tables, columns, indexes, constraints, functions, triggers) without asking the user first and getting an explicit go-ahead**, even though it's only the local DB. Explain what you want to change and why before running it. This applies regardless of whether the change would be additive/isolated or touches an ERP-owned table — both require asking first. (Ordinary reads/writes of *rows* in existing tables — e.g. inserting a sale, updating stock counts — are not schema changes and don't require asking, unless the user's instructions say otherwise for that specific case.)

If a schema change is approved and made:

1. Regenerate `website/database.sql` (see above).
2. Add an entry to **`website/database_changes.md`** (most-recent-first) — create the file if it doesn't exist yet — describing exactly what changed, why, and any data backfill/migration performed.
