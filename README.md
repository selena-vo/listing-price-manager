# Price Manager — Short-term Rental Price Manager

Track your listing's listed prices across **Airbnb, Booking.com, Trip.com** (customizable platforms), with per-platform **commission (hoa hồng)** and **discount campaigns**, and see the estimated **guest price** and **net you receive** on every channel.

Built on the [Next.js SaaS Starter](https://github.com/nextjs/saas-starter) (Next.js 15 + React 19 + Tailwind 4 + shadcn/ui + Drizzle ORM + Postgres + JWT auth).

| Doc | What it is |
|---|---|
| [docs/SPEC.md](docs/SPEC.md) | Product spec — **PO-owned**, v1.0 (all decisions confirmed Aug 23, 2026) |
| [docs/api.md](docs/api.md) | API contract (exact endpoints) |
| [docs/ui-ux.md](docs/ui-ux.md) | UI/UX design system + screen wireframes (S1–S4) |
| [PLAN.md](PLAN.md) | 1-month development plan |

## Project structure

```
app/            # Next.js App Router pages (marketing, (dashboard), (login), api routes)
components/ui/  # shadcn/ui primitives
lib/
  db/           # Drizzle schema (users/teams + platforms/listings/listing_prices/campaigns), migrations
  pricing/      # ★ domain core: discount rule engine (sum/best/priority/sequential) + presets + types (unit-tested)
  auth/         # JWT session (from starter)
  payments/     # Stripe (from starter — unused by MVP, see SPEC §8)
middleware.ts   # protects /dashboard
```

## Getting started (local)

You need a **Postgres** database — with colima + Docker on macOS:

```bash
brew install colima docker
colima start
docker run -d --name pm-postgres -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=price_manager -p 5432:5432 \
  -v pm-postgres-data:/var/lib/postgresql/data postgres:16
```

(or use a free [Neon](https://neon.tech) URL instead.)

```bash
pnpm install
cp .env.example .env        # fill POSTGRES_URL (and AUTH_SECRET)
pnpm db:migrate             # apply migrations
pnpm db:seed                # creates test@test.com / admin123 + default team + demo data
pnpm dev                    # http://localhost:3000
```

## Scripts

```bash
pnpm dev             # Next.js dev server (turbopack)
pnpm typecheck       # tsc --noEmit
pnpm test            # vitest (rule engine)
pnpm build           # production build
pnpm db:generate     # generate migration from schema
pnpm db:migrate      # apply migrations
pnpm db:seed         # seed default user/team
```
