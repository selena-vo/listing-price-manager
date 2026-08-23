# SPEC — Short-term Rental Price Manager (working title)

> **Owner:** PO (you) · **Developer:** me
> **Status:** **v1.0 — MVP baseline, all open questions (Q1–Q10) confirmed by PO on Aug 23, 2026.** The developer codes **only** from this document.

---

## 1. Overview

A web app for **listing owners and listing managers** — a "short-term rental price manager" — that lets them see the **price currently displayed** for their listing on rental platforms such as Airbnb, Trip.com, Booking.com.

- Users can **customize the list of platforms** they track (add/remove platforms at any time).
- For each platform, users see the current price of their listing on that platform — comparing all channels in one screen instead of opening each platform's app/tab separately.
- Because each platform takes a different **commission (hoa hồng)** and may run **discount campaigns**, the app also shows the **estimated net the owner actually receives** per platform — so both "what guests see" and "what I actually earn" are clear at a glance.
- Each platform combines its campaigns with its **own rules** (Airbnb: only one "winning" promotion; Booking.com: discounts combine sequentially when combinable; Trip.com: stacking depends on configuration). The app provides a **configurable per-platform rule mechanism**; the initial real rules are seeded as reference data and can be refined later without code changes.

## 2. Target users

- **Lin, 35 — listing owner.** Owns 1–3 properties, lists them on 3–4 platforms, and wants to see all listing prices in one place without logging into each platform. Not very technical; needs a simple, obvious UI.
- **Nam, 28 — listing manager.** Manages several listings for owners and updates prices regularly; needs a quick board to check prices, spot missing/outdated values, and know the real earnings after each platform's commission and campaigns.

*(MVP: single shared workspace, no user accounts — see Q2. Authentication & authorization are planned for a later phase, after MVP.)*

## 3. User stories

Priority: **[M]** = must-have (this month) · **[N]** = nice-to-have (backlog).

- [M] As a listing owner, I want to **add my listings**, so that I can track prices for each one.
- [M] As a listing owner, I want to **add and remove platforms** (Airbnb, Booking.com, Trip.com, or custom), so that the app matches the platforms I actually use.
- [M] As a listing owner, I want to **set the commission rate (hoa hồng) for each platform**, so that net estimates are correct.
- [M] As a listing owner, I want to **create and activate one or more discount campaigns per platform** (e.g. "−10% autumn promo", "−5% weekday"), so that I know the price guests actually pay.
- [M] As a listing owner, I want to **choose the discount combination rule for each platform** (sum / best / priority / sequential), so that the final price matches that platform's real rules.
- [M] As a listing owner, I want to **set and update the price per night** for each listing on each platform, so that the board always reflects my current listings.
- [M] As a listing owner, I want to **see all my listings and their prices on every platform in one dashboard**, including the **estimated net after commission and campaigns**, so that I can compare channels at a glance.
- [M] As a listing manager, I want to **see when a price has not been set** on a platform, so that I know what needs updating.
- [N] As a listing owner, I want a **history of price changes**, so that I can review how my prices evolved.
- [N] As a listing owner, I want to **schedule campaigns with start/end dates**, so that they apply automatically.
- [N] As a listing owner, I want to **sort/filter** the board by property or platform, so that I can focus on part of my portfolio.
- [N] As a listing owner, I want **custom/free-form formulas** as a rule option, so that unusual platform rules can be represented exactly.

## 4. Screens & flows

- **S1 — Dashboard (price board):**
  - A table: rows = listings, columns = platforms (the customized list). Each column header shows the platform name and its commission % (e.g. "Airbnb · 15%").
  - Each cell shows: the **listed price** per night (e.g. "1.200.000₫"), a small **"guest ≈ …"** line with the final guest price after the platform's discount rule, a small **"net ≈ …"** line with the estimated amount received, and a **badge for each active campaign** (e.g. "−10%", "−5%"). With the `priority` rule, the winning campaign's badge is highlighted.
  - Empty cell → "—" means the price is not set for that listing+platform; highlighted visually so it's obvious.
  - Actions: "Add listing" (→ S3), "Add platform" (→ S4), click a price cell (→ S2), edit/delete a listing.
- **S2 — Set/Edit price (modal):** opened by clicking a price cell. Fields: listed price per night (number, required, > 0), optional note (e.g. "weekend rate"). As the user types, a **live preview** shows the guest price and net after that platform's discount rule and commission. Save → the cell updates and shows "updated just now".
- **S3 — Add/Edit listing (modal or page):** fields: name (required), location (optional), notes (optional). Save → new row appears on the dashboard with all price cells empty.
- **S4 — Platforms (settings):** lists platforms (pre-seeded: Airbnb, Booking.com, Trip.com). For each platform: name, optional color, **commission rate %**, and **discount rule** (dropdown: Sum / Best single / Priority winner / Sequential). Actions: add platform (preset picker pre-fills the known rule, or custom → defaults to Sum), rename, remove (removes its column and saved prices). Below each platform: its **campaigns** — add/edit/deactivate a campaign (name, discount %, optional start/end dates, active toggle, optional **priority number** and **campaign type**). Several campaigns may be active at once.

## Discount rules (mechanism — per platform)

Each platform carries a **discount rule** that defines how its active campaigns combine into the final guest price. Lower `priorityOrder` number = higher priority (1 = highest).

| Rule | How active campaigns combine | Result |
|---|---|---|
| `sum` | Discounts add up | total = d₁ + d₂ + … (capped at 100%) |
| `best` | Only the largest discount applies | total = max(d₁, d₂, …) |
| `priority` | **Single winner:** only the highest-priority active campaign applies | total = d of the campaign with lowest `priorityOrder` (Airbnb model) |
| `sequential` | Campaigns apply **in priority order**, each on the running price | guest = P × (1−d₍₁₎/100) × (1−d₍₂₎/100) × … (Booking-combinable / Trip-stackable model) |

## Reference: real platform rules (PO-provided, Aug 23, 2026)

Seeded as defaults when a preset platform is added — every value stays changeable in S4.

- **Airbnb — "priority over stacking":** if a stay matches several standard promotions (New Listing, Custom Discount, Length-of-Stay, Early-Bird, Last-Minute…), **only one applies per night**, chosen by a fixed priority order: **New Listing > Custom Discounts > Length-of-Stay > Early-Bird > Last-Minute** → rule `priority`; recommended priority numbers 1–5 in that order. Known nuance: Airbnb computes custom-promotion discounts on the **60-day median price**, not the current price, so the promo price shown to guests can differ from the listed % — noted as a platform-side limitation (see §8), the app shows the entered value.
- **Booking.com:** discounts **combine sequentially when combinable**, otherwise the system picks one per its predefined rules; its API reports the already-combined `deal.discount_percentage` → rule `sequential` for combinable deals, `best` for non-combinable. Hosts see the breakdown inside the reservation details (platform-side).
- **Trip.com / TripWorks:** a trip can carry several promo codes, each recorded as a separate discount; **stacking depends on code type and merchant configuration** (e.g. one code per order, or several with a total-% limit) → rule `sum` (with the 100% cap standing in for the total-% limit; the cap can be made per-platform configurable later) or `best` when only one code applies.

## Pricing math (contract)

For a listed price **P**, with the platform's discount rule applied to its active campaigns (yielding final discount **D**, or sequential application for `sequential`), and platform commission **c%**:

- `sum`: D = min(100, d₁ + d₂ + …) · `best`: D = max(dᵢ) · `priority`: D = d of the winning campaign
- guest price = P × (1 − D/100)
- `sequential`: guest price = P × (1−d₍₁₎/100) × (1−d₍₂₎/100) × … in priority order
- commission = guest price × c/100
- **net = guest price − commission**

*(Percentages only for MVP — fixed per-booking fees are out of scope, see §8. Commission on the guest-paid, discounted amount — confirmed by PO.)*

## 5. Data model

- **Platform** — id, name (text, unique), color (text, optional), sortOrder (number), **commissionRate (number, %, default 15)**, **discountRule (enum: `sum` \| `best` \| `priority` \| `sequential`, default `sum`)**, createdAt
- **Listing** — id, name (text), location (text, optional), notes (text, optional), createdAt
- **ListingPrice** — id, listingId → Listing, platformId → Platform, pricePerNight (number, > 0), currency (text, e.g. "VND"), note (text, optional), updatedAt
  - Constraint: **one price per (listing, platform) pair** — updating overwrites the previous value.
- **Campaign** — id, platformId → Platform, name (text), discountPercent (number, 0–100), active (boolean), **priorityOrder (integer, optional — used by `priority`/`sequential` rules; 1 = highest)**, **type (text, optional — e.g. `new_listing`, `custom`, `length_of_stay`, `early_bird`, `last_minute`, `other`; metadata for seeding priority numbers like Airbnb's fixed ranking, not used in calculation)**, startsAt (date, optional), endsAt (date, optional), createdAt
  - **Several campaigns may be active on one platform at the same time** (confirmed by PO); how they combine is decided by the platform's `discountRule`.
- *(Backlog: PriceHistory (snapshot on every update), User, FixedFee per platform, `custom` formula rule, per-platform sum cap)*

## 6. What the app must be able to do (API in plain words)

- List platforms; create / rename / remove a platform; **update a platform's commission rate and discount rule**
- List listings **with all their prices** — one call returns the whole dashboard, including each platform's commission %, discount rule, and active campaigns (with priority order); create / update / delete a listing
- Set or update the price for a (listing, platform) pair; read a single price
- Create / edit / deactivate a campaign on a platform
- The **discount-combination logic is one shared rule engine** (used by both the S2 live preview and the S1 dashboard) so the two can never disagree; the API returns raw values (listed price, commission %, rule, campaigns) and the display values are computed with that engine. Exact endpoints in `docs/api.md`.

## 7. Success criteria

- [ ] On the live URL: I can add a listing, add a platform, set prices per night, and see everything in the dashboard.
- [ ] I can set a different commission % per platform and see it reflected in the "net ≈" amounts.
- [ ] I can create and activate **several** discount campaigns on one platform at once; cells show the campaign badges and the math updates.
- [ ] I can switch a platform's **discount rule** (sum / best / priority / sequential) and the guest price and net recalculate correctly — including the Airbnb-style single-winner case and Booking-style sequential stacking.
- [ ] A platform can be added/removed and the dashboard columns update accordingly.
- [ ] Missing prices are clearly visible on the board.
- [ ] Data persists (Postgres — from the Next.js SaaS Starter base) across page reloads and server restarts.
- [ ] Works on desktop and mobile; empty states and validation errors are friendly, no dead ends.
- [ ] PO accepted all must-have stories at the final demo.

## 8. Out of scope (this month)

- Auto price sync / scraping from Airbnb, Booking.com, Trip.com — manual entry only (see Q1)
- **Replicating platform-side computations** — e.g. Airbnb's 60-day-median custom pricing, Booking.com's internal rate-plan/promotion breakdowns. The app computes from the values the user enters (Q1) and the configured rules; actual guest-facing prices may differ, and that difference is a platform-side matter
- Fixed per-booking fees (e.g. cleaning fee, fixed commission) — percentage commission only (see Q6)
- Hardcoding the real discount rules of each platform — they are **seeded reference data** (Aug 23, 2026) and remain changeable per platform in S4; refinements arrive as data, not code (see Q9–Q10)
- `custom` / free-form formula rule and per-platform sum cap — backlog ([N] story above)
- **Authentication & authorization** — single workspace for MVP (see Q2); login/roles planned for a later phase, after MVP
- Price history & charts (backlog)
- Multiple room types per listing / multi-unit pricing — one price per listing per platform (see Q3)
- Currency conversion, payments, booking, calendars
- Native mobile app — responsive web only

## 9. Open questions (all ✔ = confirmed by PO on Aug 23, 2026)

| # | Question | Answer | ✔ |
|---|----------|--------|---|
| 1 | How are prices updated — manual entry or auto-fetched from the platforms? | **Manual entry** (auto-sync is out of scope this month) | ✔ |
| 2 | Do users need accounts / login? | **No** for MVP — single shared workspace; **authentication & authorization planned for a later phase** | ✔ |
| 3 | Multiple rooms / room types per listing? Price unit? | **One price per listing per platform, per night** | ✔ |
| 4 | Currency? | **VND**, fixed for MVP | ✔ |
| 5 | Price history / notes? | **Current price only**; notes optional; history → backlog | ✔ |
| 6 | Are commissions percentage-based only, or are there fixed fees too? | **Percentage only** for MVP (fixed fees → backlog) | ✔ |
| 7 | Can several campaigns be active on one platform at once? | **Yes — multiple active campaigns allowed** | ✔ |
| 8 | Is the math correct? guest price = listed × (1 − discount); commission = guest price × commission %; net = guest price − commission | **Yes** — commission on the guest-paid (discounted) amount | ✔ |
| 9 | How do discounts combine when several campaigns are active? | **Per-platform configurable rule** — real rules provided by PO (Aug 23): **Airbnb = `priority` single winner** (New Listing > Custom > LOS > Early-Bird > Last-Minute); **Booking.com = `sequential` when combinable, `best` otherwise**; **Trip.com = `sum`/stacking per config** → rule enum `sum` \| `best` \| `priority` \| `sequential` | ✔ |
| 10 | Are the real combination rules of each platform available now? | **Yes — initial reference rules supplied Aug 23** (see §4 "Reference"); PO may refine later; the app stays configurable, no code change needed | ✔ |

## 10. Changelog

| Date | What changed | By |
|------|--------------|----|
| Aug 23, 2026 | Initial English draft — all sections filled: overview, personas, stories, screens, data model, API list, criteria, out of scope, open questions (recommended answers as assumptions) | Dev |
| Aug 23, 2026 | Added platform **commission (hoa hồng)** rates and **discount campaigns** (PO insight): new user stories, S1/S2/S4 updates, Campaign entity, pricing-math contract, Q6–Q8, success criteria & out-of-scope updates | Dev |
| Aug 23, 2026 | **PO confirmed Q6 (percentage commission), Q7 (multiple active campaigns allowed), Q8 (commission on discounted price)**; pricing math updated for stacked campaigns; Q9 added (discount combination rule) | PO |
| Aug 23, 2026 | **Discount-rule mechanism** added (PO input: each platform has its own combination/priority rules): per-platform `discountRule`, campaign `priorityOrder`, shared rule engine in §6, S4 rule selector, Q9 updated + Q10 added | Dev |
| Aug 23, 2026 | **PO supplied real per-platform rules** (Q9/Q10 ✔): rule enum extended to `sum` \| `best` \| `priority` \| `sequential`; §4 "Reference: real platform rules" (Airbnb priority-winner ranking incl. 60-day-median nuance, Booking combinable/sequential, Trip stacking per config) + preset seeding in S4; campaign `type` metadata; platform-side computations moved to out of scope | Dev |
| Aug 23, 2026 | **PO confirmed Q1–Q5** (manual entry, no login MVP with auth planned later, one price per listing–platform, VND, no price history) → **spec v1.0 MVP baseline approved**; changelog consolidated | PO |
| Aug 23, 2026 | **Stack re-initialized on the Next.js SaaS Starter** (dev decision, PO informed): Next.js 15 + React 19 + Tailwind 4 + shadcn/ui + Drizzle ORM + **Postgres** (replaces SQLite) + JWT auth (ships with the starter — MVP keeps single workspace per Q2; PO to confirm keep vs strip) + Stripe (kept, unused by MVP). Domain code (rule engine, presets) and the DB schema for platforms/listings/listing_prices/campaigns were added. Spec content unchanged | Dev |
