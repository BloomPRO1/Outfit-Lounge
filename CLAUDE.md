# Outfit Lounge — Repository Guide

This repository contains **two separate applications** that share one Postgres database:

1. **`client/` + `server/`** — the existing **Outfit Lounge Tailor Shop ERP system**. Live, in production, deployed to Railway.
2. **`website/`** — a **new, separate public-facing website** for the same business, currently under active development.

## Critical rule: do not touch `client/` or `server/`

The ERP system in `client/` and `server/` is **live production software deployed on Railway** (see `railway.toml`). It must not be modified as part of website work:

- Do not edit, refactor, "fix", or clean up any file under `client/` or `server/`.
- Do not change their `package.json`, dependencies, configs, migrations, or `.env.example` files.
- Do not run destructive DB operations (migrations, seeds, schema changes) that originate from ERP code as a side effect of website work.
- If a website feature seems to require a change to the ERP system, **stop and ask the user first** — do not make the change unilaterally.

**All new work happens inside `website/`.** See `website/CLAUDE.md` for that subproject's environment and structure.

## Existing ERP system (reference only — do not modify)

- `client/` — React 18 + Vite + TypeScript + Tailwind CSS. Dev server on port 5173.
- `server/` — Node + Express + TypeScript + PostgreSQL (`pg`). Dev server on port 3000 (`ts-node-dev`).
- Root `package.json` orchestrates both via `concurrently` (`npm run dev`, `npm run build`, `npm run db:migrate`, etc.).
- Auth via JWT (`JWT_SECRET`, `JWT_EXPIRES_IN`).
- SMS notifications via FitSMS gateway (`FITSMS_API_TOKEN`, `FITSMS_SENDER_ID`).
- Deployment: Railway, defined in `railway.toml`. Build installs/builds `client` then `server`; start runs DB migrations then `server/dist/index.js`; health check at `/api/health`.
- Root `.env.example` and `server/.env.example` document the ERP's own environment variables (`DATABASE_URL`, `JWT_SECRET`, `CLIENT_URL`, etc.).
- `backup_*.dump` files at repo root are Postgres dumps of the production database — do not delete or overwrite them.

## New website (`website/`)

- `website/frontend/` — Next.js (App Router) + TypeScript.
- `website/backend/` — Node + Express + TypeScript + PostgreSQL (`pg`).
- Connects to the **same Postgres database** as the ERP system (same `DATABASE_URL` value), but is otherwise an independent codebase with its own `package.json`, `tsconfig.json`, and `.env` files.
- `website/database.sql` — schema-only snapshot of the local database. **Must be regenerated any time the schema changes** (see `website/CLAUDE.md` for the exact command and rule).
- Full details, dev commands, and conventions: `website/CLAUDE.md`.

## Never commit, push, or touch GitHub yourself

**The user (Tharusha) does all git/GitHub actions personally — always.** This applies everywhere in this repo, not just `website/`:

- Never run `git commit`, `git push`, `git add` as a step toward committing, `git merge`, `git rebase`, or create/modify branches on your own initiative.
- Never create, comment on, close, or modify GitHub issues or pull requests (`gh` commands that mutate state).
- Development only: write code, edit files, run builds/tests/dev servers locally. Leave the working tree's changes unstaged/uncommitted for the user to review and commit themselves.
- If the user explicitly asks you to commit or push in a given message, that instruction applies only to that specific request — it does not override this standing rule for future turns.

## Working across this repo

- When asked to work on "the website" / "the new site", scope all changes to `website/`.
- When asked to work on "the ERP", "the shop system", "client", or "server", treat that as read-only reference unless the user explicitly asks for a change there.
- Because both apps share one database, be careful with any schema-affecting change made from `website/backend` — the existing ERP queries against the same tables must keep working. When in doubt, ask before altering shared tables.
