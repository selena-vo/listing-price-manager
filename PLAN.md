# 1-Month Development Plan — Short-term Rental Price Manager

- **Project:** Price Manager (working title) — see [docs/SPEC.md](docs/SPEC.md)
- **Window:** Monday, Aug 24 → Wednesday, Sep 23, 2026 (4 weeks + 3-day buffer)
- **Team:**
  - **PO (Product Owner):** You — owns the spec, priorities, and acceptance.
  - **Developer:** Me — architecture, code structure, UI/UX design, implementation from spec.
- **Stack (locked, Aug 23):** **[Next.js SaaS Starter](https://github.com/nextjs/saas-starter)** base — Next.js 15 (App Router, Turbopack) + React 19 + TypeScript + Tailwind 4 + shadcn/ui, **Drizzle ORM + Postgres**, JWT auth (email/password), Stripe (kept, unused in MVP), Vitest, Git, pnpm.
- **End-of-month target:** a **live public URL** (Vercel + Neon Postgres free tier) running the approved spec.

---

## 1. How we work together

One loop, repeated for every feature:

```
SPEC (PO writes) → STRUCTURE (dev: where it lives in the code) → UI/UX (dev: screens & interactions)
   → CODE (dev: implement from spec) → DEMO (PO reviews) → ACCEPTED (done) / FEEDBACK (back to dev)
```

Rules:

1. **The spec is the contract.** I code only what SPEC.md says. If something isn't in the spec, I ask or flag an assumption — I never invent features silently.
2. **You prioritize.** Each week I bring a "next up" list; you rank it. Everything not accepted this month goes to a backlog, not into the month.
3. **Weekly demo.** Every Sunday (or a time you prefer) I demo what runs. You say "accept" or "feedback"; accepted = done.
4. **Assumption rule.** If I need an answer to keep moving, I ask in chat. If you're unavailable, I make the smallest reasonable assumption, **flag it in SPEC.md's changelog**, and you can veto it at the next demo.
5. **All decisions are written down.** SPEC.md (what), PLAN.md (how/when), docs/ (design notes). No decisions live only in chat.

## 2. Cadence

| When | Who | What |
|---|---|---|
| Daily | Dev | Short progress note in chat; code committed at end of day |
| As needed | PO ↔ Dev | Questions & answers, spec clarifications (target: < 24h reply) |
| Weekly (Sun) | Both | Demo + accept/feedback + priority for next week |
| Sep 23 | Both | Final demo, live URL, sign-off |

## 3. Repo structure (initialized Aug 23 from Next.js SaaS Starter)

```
web-service/
├── app/              # Next.js App Router: marketing, (dashboard), (login), api/ route handlers
├── components/ui/    # shadcn/ui primitives (button, card, input, …)
├── lib/
│   ├── db/           # Drizzle schema (users/teams + platforms/listings/listing_prices/campaigns) + migrations
│   ├── pricing/      # ★ domain core: discount rule engine (sum/best/priority/sequential) + presets + types (Vitest)
│   ├── auth/         # JWT session (from starter)
│   └── payments/     # Stripe (from starter — unused by MVP, SPEC §8)
├── docs/
│   ├── SPEC.md       # ★ PO-owned: the spec (v1.0 — all decisions confirmed)
│   ├── ui-ux.md      # Design tokens, screen map, component inventory (S1–S4)
│   └── api.md        # Endpoint contract (Next.js route handlers)
├── middleware.ts     # protects /dashboard
├── README.md         # How to run locally + deploy
└── PLAN.md           # This plan
```

Why this shape: one Next.js app (pages + API in one deploy target), shared types via `lib/`, and `docs/` keeps the "what" (spec) separate from the "how" (code).

## 4. Week-by-week plan

### Week 1 — Foundation & Spec · Aug 24 – Aug 30
**Goal:** approved spec + running app + design system.
**Status (Aug 23):** ✅ **hoàn thành sớm** — SPEC v1.0 · repo (SaaS Starter) · Postgres colima + migrations + seed · API đầy đủ (dashboard/platforms/campaigns/listings/prices/health) · UI S1–S4 · CI (typecheck + vitest) · build production OK. **Gate 1 demo ✅ PO sign-off** · repo đã push lên GitHub (CI chạy).

| Day | Work | Status |
|---|---|---|
| Mon 24 | Repo wired: pnpm install, migrations, `.env`; local Postgres (colima + container); CI: typecheck + vitest on push | ✅ |
| Tue 25 | Seed: default platforms (presets) + demo listing; `GET /api/dashboard` | ✅ |
| Wed 26 | **Spec review #1** | ✅ v1.0 (duyệt Aug 23) |
| Thu 27 | UI/UX foundation (Tailwind + shadcn/ui) | ✅ |
| Fri 28 | **S4 Platforms** wired to API | ✅ |
| Sat 29 | Buffer | — |
| Sun 30 | **Gate 1 demo:** app chạy local với data seed | ✅ PO sign-off (Aug 23) |

**Your inputs this week:** ~~Postgres~~ ✅ colima · ~~auth~~ ✅ giữ · ~~Stripe~~ ✅ giữ · **Gate 1 demo ✅ sign-off** · **GitHub URL ✅** (pushed → CI chạy trên push).

### Week 2 — First vertical slice · Aug 31 – Sep 6
**Goal:** the **#1 priority feature** from your spec working end to end.

| Day | Work |
|---|---|
| Mon 31 | Lock data model + run migrations (Postgres, Drizzle) |
| Tue–Thu | Build feature end to end: DB queries → route handlers → frontend screens. Tests for core logic |
| Fri | Edge cases of the slice (empty states, validation, error messages) |
| Sat | Rule-engine integration: S2 live preview shows guest price + net |
| Sun 6 | **Gate 2 demo:** you click through the #1 feature on a real screen with real data |

**Your inputs:** confirm the #1 priority + answer questions the slice surfaces.

### Week 3 — Complete the spec · Sep 7 – Sep 13
**Goal:** every must-have feature from the spec implemented, in your priority order.

| Day | Work |
|---|---|
| Mon–Wed | Features #2–#3 (your priority order), same pattern as Week 2 |
| Thu | **Mid-week check-in:** demo of all built features; you adjust priorities for remaining days |
| Fri–Sun | Remaining must-have features + their edge cases |

**Your inputs:** priority order at start, adjust mid-week, and an acceptance checklist per feature (or I propose one from the spec, you approve).

### Week 4 — Polish, test, ship · Sep 14 – Sep 20 (+ buffer to Sep 23)
**Goal:** production-quality and **live on the internet**.

| Day | Work |
|---|---|
| Mon–Tue | Hardening pass: error states, empty states, mobile layout, accessibility, loading UX |
| Wed–Thu | Tests completed (unit + a few end-to-end), README written (run + deploy instructions), seed data |
| Fri–Sat | **Deploy**: Vercel (app) + Neon (Postgres) free tier; wire env vars; smoke-test the public URL |
| Sun 20 | **Gate 3 demo:** everything from the spec, on the live URL |
| Mon–Wed 21–23 | Buffer: fix anything you find, final polish, docs tidy |

**Your inputs:** final acceptance walkthrough of the live URL + sign-off.

## 5. Definition of Done (per feature)

A feature is done only when **all** of these are true:

- [ ] Works exactly as SPEC.md describes (behavior, fields, rules)
- [ ] Runs in the live deployed app (not just locally)
- [ ] Has tests covering its core logic
- [ ] Handles empty states, errors, and validation gracefully
- [ ] Looks right on desktop and mobile
- [ ] You, the PO, accepted it at a demo

## 6. UI/UX design approach (I own this)

1. **Design before code:** for each spec screen I produce a quick wireframe + interaction notes (in docs/ui-ux.md) before writing components.
2. **One design system:** Tailwind tokens + shadcn/ui components — consistent look without design-by-accident.
3. **Mobile-first:** layouts start from a phone-sized screen and scale up.
4. **Human touches:** friendly empty/error states, sensible defaults, keyboard-friendly forms, obvious navigation.

## 7. Change management

- All changes to the spec are tracked in **SPEC.md → Changelog** (date, what changed, by whom).
- Mid-month requests that would blow the timeline go to the **backlog** — I'll say so honestly and propose what to drop instead.
- You can always re-prioritize what's in the month; you can't silently grow the month.

## 8. Risks & mitigations

| Risk | Mitigation |
|---|---|
| Spec arrives late or thin | **Resolved Aug 23 — SPEC v1.0 approved** with all Q1–Q10 confirmed |
| Starter/Next.js canary quirks (next 15.6.0-canary) | Starter is maintained by Vercel; pinned versions; if a blocker appears we downgrade to stable Next 15 — decision logged in docs/ |
| No local Postgres | Use a free **Neon** URL (PO decision) or Docker for local dev; migrations are DB-agnostic via Drizzle |
| Free-tier deploy surprises (cold starts, DB limits) | Vercel + Neon chosen for simplicity; deploy rehearsed in Week 4 with buffer days |
| Feature creep mid-month | Scope guard (§7); backlog, not overtime |
| You're unavailable for a demo | I demo async: screen recordings + a checklist for you to tick |

## 9. What I need from you (PO) — summary

- **Week 1:** ✅ đã chốt (Postgres = colima, auth giữ, Stripe giữ) — **còn: Gate 1 demo sign-off** + (tùy chọn) GitHub URL để push/CI.
- **Week 2:** #1 feature confirmed + any slice questions answered.
- **Week 3:** priority order + mid-week adjustments + acceptance criteria per feature.
- **Week 4:** final walkthrough of the live URL + sign-off.

---

## Artifacts checklist (end of month)

- [ ] SPEC.md — filled, approved, changelogged (you own it) — **v1.0 done Aug 23**
- [ ] Repo on GitHub with clean structure (Next.js SaaS Starter base + lib/pricing)
- [ ] Design system + all spec screens implemented (S1–S4)
- [ ] Tests passing (unit — rule engine; plus key route logic)
- [ ] README: run locally + deploy instructions
- [ ] **Live public URL** running the approved spec (Vercel + Neon)
- [ ] Your sign-off
