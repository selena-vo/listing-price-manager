# SPEC — Short-term Rental Price Manager (working title)

> **Owner:** PO (you) · **Developer:** me
> **Status:** **v1.1 — MVP baseline + dashboard redesign (day price board) per PO mockup (Aug 23). All Q1–Q15 confirmed by PO.** The developer codes **only** from this document.

---

## 1. Overview

A web app for **listing owners and listing managers** — a "short-term rental price manager" — that lets them see the **price displayed** for their listing (per day) on rental platforms such as Airbnb, Trip.com, Booking.com.

- Users can **customize the list of platforms** they track (add/remove platforms at any time).
- The app shows a **month-by-day price board**: for every day of a month, the **"Giá cài đặt"** (set price) and **"Ròng (sau phí)"** (net after fee) on each platform — so an owner sees daily earnings at a glance, promo days highlighted, and can hop between months or back to today.
- Because each platform takes a different **commission (hoa hồng)** and may run **discount campaigns** (with date ranges), the board derives each day's set price (= base price adjusted by that day's active campaigns) and its net (= set price − fee).
- Each platform combines its campaigns with its **own rules** (Airbnb: only one "winning" promotion; Booking.com: sequential when combinable; Trip.com: stacking depends on config). The app provides a **configurable per-platform rule mechanism**; reference rules are seeded and can be refined without code changes.

## 2. Target users

- **Lin, 35 — listing owner.** Owns 1–3 properties, lists them on 3–4 platforms, and wants to see daily prices in one place without logging into each platform. Not very technical; needs a simple, obvious UI.
- **Nam, 28 — listing manager.** Manages several listings, updates prices and promos regularly; needs a quick month board to check daily set vs net and spot promo days.

*(MVP: single shared workspace, no user accounts — see Q2. Authentication & authorization planned for a later phase.)*

## 3. User stories

Priority: **[M]** = must-have (this month) · **[N]** = nice-to-have (backlog).

- [M] As a listing owner, I want to **add my listings**, so that I can track prices for each one.
- [M] As a listing owner, I want to **add and remove platforms** (Airbnb, Booking.com, Trip.com, or custom), so that the app matches the platforms I actually use.
- [M] As a listing owner, I want to **set the commission rate (hoa hồng) for each platform**, so that net is correct.
- [M] As a listing owner, I want to **create and activate discount campaigns with date ranges** (Khuyến mãi, e.g. "−10% from 05/08 to 09/08"), so that the board marks promo days and shows the adjusted set price.
- [M] As a listing owner, I want to **choose the discount combination rule for each platform** (sum / best / priority / sequential), so that the final price matches that platform's real rules.
- [M] As a listing owner, I want to **set a base price ("Giá cài đặt") per listing per platform**, so that every day starts from it (promos adjust it per date).
- [M] As a listing owner, I want a **month-by-day price board** for the selected listing: rows = days, columns = platform × {Giá cài đặt, Ròng (sau phí)}, with promo days highlighted and today marked — so that I can review daily earnings at a glance.
- [M] I want to **navigate months** (← previous / next →, "Về hôm nay") and **pick which listing** the board shows.
- [M] As a listing manager, I want to **see when a platform has no base price set** (empty state), so that I know what needs filling in.
- [N] As a listing owner, I want a **currency selector** (VND-first; multi-currency in a future phase), so that I can switch display currency later.
- [N] As a listing owner, I want to **override the price of one specific day**, so that I can set a bespoke daily rate.
- [N] As a listing owner, I want a **history of price changes**, so that I can review how prices evolved.
- [N] As a listing owner, I want **custom/free-form formulas** as a rule option, so that unusual platform rules can be represented exactly.

## 4. Screens & flows

Top-level **tabs** (per PO mockup): **Bảng giá theo ngày** (S1) · **Khuyến mãi** (S5) · **Nền tảng** (S4).

- **S1 — Bảng giá theo ngày (day price board):**
  - Toolbar: **listing selector** (which listing), **currency unit** (VND only for MVP — multi-currency in a future phase; Q13), **month navigation** (← Tháng trước · "Tháng 8 năm 2026" · Tháng sau → · **Về hôm nay**). *(Xuất/Nhập JSON not in MVP — Q14.)*
  - Table: rows = **days of the selected month** (with weekday label, e.g. "01/08 (Thứ 7)"); the **today** row is highlighted. Columns = each platform → two sub-columns: **Giá cài đặt** and **Ròng (sau phí)**.
  - Each **Giá cài đặt** cell: the effective price that day (base price, or base × (1 − discount) when a campaign covers that date) + a small **"phí X% · Y₫"** line. On promo days a **"Khuyến mãi …"** indicator is shown.
  - Each **Ròng (sau phí)** cell (green): set price − fee.
  - Click a **Giá cài đặt** cell → **S2** (edit the base price for that platform; per-day override is S2b / [N]).
- **S2 — Set base price (modal):** opened from a platform's "Giá cài đặt" cell. Field: base price per night (number, > 0, VND) + optional note. Live preview shows fee and net for that platform. Save → updates the base, which recalculates every day of the month.
- **S3 — Add/Edit listing:** name (required), location (optional), notes (optional).
- **S4 — Nền tảng (Platforms):** list platforms. **Each platform:** name, color, **commission rate %**, **discount rule** (dropdown, with plain-language hints). Actions: add (preset picker pre-fills rule + commission, or custom → defaults), rename, remove. *(Campaign management moved to S5.)*
- **S5 — Khuyến mãi (Promotions):** list all **campaigns** with their date windows (name, discount %, start–end dates, active toggle, priority, type). Add/edit/deactivate a campaign; deleting a promo removes its badge from the board.

## Discount rules (mechanism — per platform)

Each platform's **discount rule** defines how its campaigns — **only those active on a given date** — combine for that day's price. Lower `priorityOrder` = higher priority (1 = highest).

| Rule | How active campaigns (on a date) combine | Result for that day |
|---|---|---|
| `sum` | Discounts add up | total = d₁ + d₂ + … (capped at 100%) |
| `best` | Only the largest applies | total = max(d₁, d₂, …) |
| `priority` | **Single winner** (Airbnb) | total = d of the campaign with lowest `priorityOrder` |
| `sequential` | Applied **in priority order**, each on the running price | price × (1−d₍₁₎/100) × (1−d₍₂₎/100) × … |

## Reference: real platform rules (PO-provided, Aug 23, 2026)

Seeded as defaults when a preset platform is added — every value is changeable in S4/S5.

- **Airbnb — "priority over stacking":** a stay matching several standard promotions uses **only one per night**, chosen by a fixed priority: **New Listing > Custom > Length-of-Stay > Early-Bird > Last-Minute** → rule `priority`, priority numbers 1–5. Nuance: custom promos are computed on the **60-day median price**, so the promo price can differ from the listed % — platform-side (see §8). PO mockup shows example commission **3%**.
- **Booking.com:** discounts **combine sequentially when combinable** (else one per its rules); API reports combined `deal.discount_percentage` → rule `sequential` (combinable) or `best`. Mockup shows commission **15%**.
- **Trip.com / TripWorks:** several promo codes per trip; **stacking depends on config** (one per order, or several with a total-% limit) → rule `sum` (100% cap) or `best`. Mockup shows commission **10%**.

> **Preset commissions (PO mockup, Aug 23):** Airbnb **3%** · Booking.com **15%** · Trip.com **10%** — seeded as reference defaults (editable in S4).

## Pricing math (contract)

For a **base price P** on a platform, and a given **date D**, let **D** = the platform's discount rule applied to the campaigns **whose date range covers D** (total discount; for `sequential`, applied multiplicatively):

- set price (D) = P × (1 − total/100) — or the sequential product for `sequential`
- fee (D) = set price × commission c/100
- **net (D) = set price − fee**

*(Percentages only for MVP — fixed fees out of scope, see §8. Commission on the set (guest-paid) amount — confirmed by PO.)*

## 5. Data model

- **Platform** — id, name (unique), color, sortOrder, **commissionRate (%, default 15 — presets 3/15/10 per mockup)**, **discountRule (`sum`\|`best`\|`priority`\|`sequential`)**, createdAt
- **Listing** — id, name, location (optional), notes (optional), createdAt
- **ListingPrice** — id, listingId → Listing, platformId → Platform, **pricePerNight (base "Giá cài đặt", number > 0)**, currency (text, "VND"), note (optional), updatedAt
  - Constraint: **one base price per (listing, platform)** — updating overwrites.
  - The **day board derives each day's set price** = base adjusted by that day's active campaigns (see Pricing math); no per-day price rows in MVP (per-day override → backlog).
- **Campaign** — id, platformId → Platform, name, discountPercent (0–100), active, **startsAt / endsAt (date range — marks the promo window on the board)**, priorityOrder (optional; for `priority`/`sequential`), type (optional metadata), createdAt
  - Several campaigns may be active on one platform at once; only those **covering date D** apply to D.
- *(Backlog: PriceHistory, per-day price override, User, FixedFee per platform, `custom` formula rule, per-platform sum cap)*

## 6. What the app must be able to do (API in plain words)

- List platforms (with commission %, discount rule, and campaigns); create / rename / remove / update a platform's commission & rule
- List listings (with base prices); create / update / delete a listing
- Set / update / read the base price for a (listing, platform) pair
- Create / edit / deactivate a campaign (with date range) on a platform
- **Day board data:** the API returns raw values (base price per listing–platform, each platform's commission % + rule + campaigns, incl. dates); the client computes each day's set price / fee / net with the shared rule engine — or a `GET /api/calendar?month=…&listingId=…` returns precomputed per-day values. Exact endpoints in `docs/api.md`.

## 7. Success criteria

- [ ] On the live URL: I can add a listing, add platforms, set base prices, and see the **month-by-day board** with Giá cài đặt + Ròng (sau phí) for each platform.
- [ ] I can **navigate months**, jump **back to today** (today row highlighted), and **switch listing**.
- [ ] A campaign with a **date range** marks those days as "Khuyến mãi" on the board and shows the adjusted set price (via that platform's discount rule).
- [ ] I can set a different **commission %** per platform and the fee/net recalculate for every day.
- [ ] A platform's **discount rule** (sum/best/priority/sequential) changes the math correctly, incl. Airbnb single-winner and Booking sequential.
- [ ] Missing base prices are clearly visible (empty state).
- [ ] Data persists (Postgres) across reloads/restarts.
- [ ] Works on desktop and mobile; empty states and validation errors are friendly.
- [ ] PO accepted all must-have stories at the final demo.

## 8. Out of scope (this month)

- Auto price sync / scraping (manual entry only — Q1)
- Replicating platform-side computations (Airbnb 60-day-median custom pricing, Booking internal breakdowns) — the app uses entered values + configured rules
- Fixed per-booking fees (percentage commission only — Q6)
- **Per-day price override** on the board (base price + date-ranged campaigns for MVP — Q12)
- Hardcoding platform discount rules (seeded reference data, changeable in S4)
- **Export/Import JSON** (Q14 — not in MVP, backlog)
- **Multi-currency display beyond VND** (Q13 — future phase)
- `custom` / free-form formula rule and per-platform sum cap — backlog
- Authentication & authorization (single workspace MVP — Q2); login/roles later
- Price history & charts (backlog)
- Multiple room types per listing / multi-unit pricing (Q3)
- Currency conversion (VND display only — Q4/Q13); payments, booking, calendars
- Native mobile app (responsive web only)

## 9. Open questions (Q1–Q10 ✔ by PO on Aug 23; Q11–Q15 added Aug 23, pending)

**Confirmed earlier:**

| # | Question | Answer | ✔ |
|---|----------|--------|---|
| 1 | Prices updated manually or auto-fetched? | **Manual entry** | ✔ |
| 2 | Accounts / login? | **No** for MVP; auth later | ✔ |
| 3 | Multiple rooms/room types; price unit? | **One base price per listing per platform, per night** | ✔ |
| 4 | Currency? | **VND** for MVP | ✔ |
| 5 | Price history / notes? | **Current price only**; history → backlog | ✔ |
| 6 | Commissions % only or fixed fees? | **Percentage only** | ✔ |
| 7 | Several campaigns active at once? | **Yes** | ✔ |
| 8 | Math? commission on discounted (set) amount | **Yes** | ✔ |
| 9 | Discount combination rule | **Per-platform configurable** (priority/sequential/best/sum per real rules) | ✔ |
| 10 | Real combination rules available? | **Yes — reference rules supplied Aug 23** | ✔ |

**New (from the Aug 23 dashboard mockup):**

| # | Question | Recommended answer | ✔ |
|---|----------|--------------------|---|
| 11 | Is the day board for **one listing** (with a listing selector) or **all listings at once**? | **One listing + selector** (matches the mockup; all-listings grid → backlog) | ✔ |
| 12 | Is "Giá cài đặt" a **base price** (days derived from date-ranged campaigns) or **independently editable per day**? | **Base price + date-ranged campaigns**; per-day override → backlog | ✔ |
| 13 | Currency selector — **VND only** (display format) or real multi-currency conversion? | **VND only for MVP; multi-currency update in a future phase** | ✔ |
| 14 | **Export/Import JSON** in MVP? | **No — not in MVP** (backlog) | ✔ |
| 15 | Use the mockup's sample commissions as **preset defaults** (Airbnb 3%, Booking 15%, Trip 10%)? | **Yes — presets updated** (still editable in S4) | ✔ |

## 10. Changelog

| Date | What changed | By |
|------|--------------|----|
| Aug 23, 2026 | Initial English draft + commission/campaigns + discount-rule mechanism + real platform rules (see earlier rows) | Dev |
| Aug 23, 2026 | **PO confirmed Q1–Q10** → spec v1.0 baseline | PO |
| Aug 23, 2026 | **Stack re-initialized on Next.js SaaS Starter** (Postgres, auth & Stripe from starter, rule engine + schema added) | Dev |
| Aug 23, 2026 | **Dashboard redesigned per PO mockup (spec v1.1):** S1 becomes a **month-by-day price board** (Giá cài đặt + Ròng sau phí per platform, promo-day highlight, today marked, month nav, listing selector, currency selector); added **S5 Khuyến mãi** tab; S4 Platforms no longer holds campaigns; base-price + per-day derivation model; Q11–Q15 added | Dev |
| Aug 23, 2026 | **PO confirmed Q11–Q15**: one listing + selector · base-price + date-ranged campaigns · VND only (multi-currency future) · **no Export/Import JSON in MVP (backlog)** · presets = mockup commissions (3/15/10) | PO |
