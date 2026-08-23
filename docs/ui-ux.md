# UI/UX Design — docs/ui-ux.md

> Source of truth: SPEC.md §4 (screens S1–S4). Goals: **simple, obvious, calm** — built for non-technical homestay owners (persona Lin), mobile-first, desktop-friendly. No decoration for its own sake; every element earns its place.

## 1. Design principles

1. **One job per screen.** Dashboard = compare prices. Settings = configure platforms/rules. No mixing.
2. **Numbers first.** Prices are the hero; everything else (badges, notes, dates) is secondary type.
3. **Empty is an instruction.** Every empty state tells the user what to do next (a call-to-action).
4. **Safe by default.** Destructive actions (delete platform/homestay) always confirm; edits save explicitly.

## 2. Design tokens

### Color

| Token | Value | Use |
|---|---|---|
| `--color-primary` | `#0D9488` (teal-600) | buttons, active nav, links, focus ring |
| `--color-primary-soft` | `#CCFBF1` | selected cell, badges background |
| `--color-bg` | `#F8FAFC` | page background |
| `--color-surface` | `#FFFFFF` | cards, table, modals |
| `--color-border` | `#E2E8F0` | dividers, table grid |
| `--color-text` | `#0F172A` | primary text |
| `--color-text-muted` | `#64748B` | secondary text ("guest ≈", "updated just now") |
| `--color-success` | `#16A34A` | net amounts, saved toasts |
| `--color-danger` | `#DC2626` | delete, validation errors |
| `--color-warning` | `#D97706` | missing-price highlight, campaign badges |

### Type & spacing

- Font stack: system (`-apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`); no webfont for MVP (fast, Vietnamese-safe).
- Scale: `13 / 15 / 17 / 20 / 24px`. Price = 17 semibold; cell secondary = 13.
- Spacing: 4 · 8 · 12 · 16 · 24 · 32. Table cell padding 12; card padding 24; modal padding 24.
- Radius: 8 (inputs/buttons), 12 (cards/modals). Shadow for modal: `0 20px 50px rgba(15,23,42,.25)`.
- Currency format: `1.200.000₫` (vn-VN grouping + "₫").

## 3. Layout

- **Header bar** (always visible): app name **"Price Manager"** + nav: **Dashboard** · **Platforms** (right side: nothing else in MVP).
- **Content**: max-width 1100px, centered, 24px padding.
- Mobile: table collapses to **stacked cards** (one homestay = one card; each platform shown as a labeled row inside).

## 4. S1 — Dashboard (price board)

- Table: `sticky` first column (homestay name) for horizontal scroll on small screens.
- **Column header**: `Airbnb` (medium) + `15%` (muted, small) + rule icon-letter hint (`P` = priority, `S` = sum, `B` = best, `Q` = sequential — with tooltip explaining in plain words).
- **Cell** (clickable → S2): stacked lines, centered:

```
1.200.000₫          ← price, 17 semibold
−10% · −5%          ← active campaign badges (chips, warning color); on `priority`, winning chip filled
guest ≈ 1.020.000₫  ← muted 13px (computed)
net ≈ 867.000₫      ← success 13px (computed)
```

- **Missing price cell**: dashed border + `—` in muted, subtle warning tint; whole cell still clickable.
- Row actions (hover reveals): edit homestay (pencil), delete (trash → confirm dialog).
- **Empty states**: no homestays → centered illustration-less message + primary button **"Add your first homestay"** (→ S3). No platforms → CTA in S4.
- Top-right of the board: **"Add homestay"** (primary) and **"Platforms"** link.

## 5. S2 — Set/Edit price (modal)

- Trigger: click any price cell (also on "—").
- Fields: **Price per night (₫)** — number input, required, > 0, large focus; **Note** — optional text ("weekend rate", "peak season").
- **Live preview panel** (updates on every keystroke): shows `Guest pays ≈ …` and `You receive ≈ …` computed with the platform's rule + active campaigns + commission — proves the math before saving.
- Actions: **Save** (primary, disabled until valid) · **Cancel** (secondary).
- After save: toast `Saved` (success, 2.5s) + cell shows `updated just now`.

## 6. S3 — Add/Edit homestay (modal)

- Fields: **Name** (required), **Location** (optional), **Notes** (optional).
- Same button pattern as S2. After save: row appears (empty prices, all "—").

## 7. S4 — Platforms (settings)

- **Platform cards**, one per platform: colored dot (platform color), name, **commission %** (number input, 0–100), **discount rule** (dropdown, 4 options with a one-line plain-language hint):

| Option | Hint shown |
|---|---|
| Sum | "Cộng dồn các giảm giá (tối đa 100%)" |
| Best single | "Chỉ áp dụng mức giảm cao nhất" |
| Priority winner | "Chỉ một khuyến mãi thắng theo thứ tự ưu tiên (Airbnb)" |
| Sequential | "Áp dụng tuần tự từng mức giảm (Booking)" |

- **Campaigns** under each card: list rows — name, `−10%`, active toggle (switch), priority number (shown/editable when rule is `priority` or `sequential`), campaign type (optional select, seeds priority for Airbnb presets: New Listing=1, Custom=2, LOS=3, Early-Bird=4, Last-Minute=5), delete (confirm).
- **Add campaign** (inline form, opens per card): name, %, active, priority, type, dates.
- **Add platform**: preset picker (Airbnb / Booking.com / Trip.com — pre-fills rule + reference config) or **Custom** (defaults: Sum, 15%).
- Delete platform → confirm dialog warns: *"This removes the platform column and all its saved prices."*

## 8. Feedback & states

- Toasts: success (save) / error (network, validation) — bottom-right, auto-dismiss.
- Buttons: disabled state while invalid/submitting; spinner on save.
- Validation inline under fields (red, 13px): e.g. "Enter a number greater than 0".
- Confirm dialog component reused for all destructive actions.

## 9. Accessibility & responsiveness

- All inputs labelled; focus ring = primary color, 2px.
- Color contrast ≥ AA (muted text on white = 4.6:1).
- Keyboard: modals trap focus, Esc closes, Enter submits.
- Breakpoints: ≥ 900px table layout; < 900px stacked cards.
- Touch targets ≥ 44px on mobile (cell tap area covers the whole cell).
