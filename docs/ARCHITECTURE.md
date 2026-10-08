# JAMO Textile Platform — Architecture

B2B portal for branded corporate clothing. Client companies design and order
uniforms with their logo, then follow production online. JAMO staff run the
pipeline from a separate back office.

The original single-file demo lives in [`prototype/main.html`](../prototype/main.html)
and remains the reference for UX that is not built yet (garment mockup
renderer, AI variants, campaigns).

---

## 1. Goals of this architecture

| Goal | How |
| --- | --- |
| Two fully separate logins (admin vs customer) | Separate URL spaces, user tables, cookies, signing secrets, login methods |
| No factory login (for now) | Workshops are data that admins assign; factory UI can be added later as a third realm |
| One codebase, easy to extend | Next.js monolith with strict layers: `domain` → `services` → `actions` → `app` |
| Data isolation between client companies | Every customer query is scoped by `companyId` taken from the session, never from the request |
| Dashboards that grow without rewrites | View-model per dashboard + reusable widgets |

## 2. Stack

| Layer | Choice | Why |
| --- | --- | --- |
| Web framework | **Next.js 15 (App Router)** + React 19 + TypeScript | Server components and server actions mean no separate API to maintain; one deploy |
| Styling | **Tailwind CSS 3** with CSS-variable tokens | Same palette/fonts as the prototype; light and dark themes |
| Database | **PostgreSQL 16** via **Prisma 6** | Relational data (orders, items, events), migrations, typed queries |
| Auth | **jose** (signed JWT in HttpOnly cookies), **bcryptjs**, HMAC-hashed OTP | No third-party auth vendor; full control of the two realms |
| Validation | **zod** | Every server action validates its input |
| Tests | Node test runner (`node --test`) + tsx | Domain rules are pure and tested without a database |

## 3. Two login realms

```
                    ┌──────────────────────────── Browser ───────────────────────────┐
                    │                                                                │
   Customer         │  /login, /register  ──►  /portal/**                            │
   (client company) │  phone + 6-digit SMS code                                      │
                    │  cookie: jamo_portal   (30 days, AUTH_CUSTOMER_SECRET)          │
                    │                                                                │
   JAMO staff       │  /admin/login       ──►  /admin/**                             │
                    │  email + password (bcrypt)                                     │
                    │  cookie: jamo_admin    (12 hours, AUTH_ADMIN_SECRET)            │
                    └────────────────────────────────────────────────────────────────┘
```

|  | Customer realm | Admin realm |
| --- | --- | --- |
| URL space | `/portal/**` | `/admin/**` |
| Login page | `/login` (+ `/register`) | `/admin/login` (not linked publicly, `noindex`) |
| Identity table | `CustomerUser` (belongs to a `Company`) | `AdminUser` |
| Credential | Phone (E.164) + one-time SMS code | Email + password |
| Roles | `HEAD`, `BUYER`, `ACCOUNTANT`, `HR` | `OWNER`, `MANAGER` |
| Session cookie | `jamo_portal`, 30 days | `jamo_admin`, 12 hours |
| Token audience | `jamo:portal` | `jamo:admin` |
| Signing secret | `AUTH_CUSTOMER_SECRET` | `AUTH_ADMIN_SECRET` |

A token from one realm fails verification in the other three ways over
(different secret, audience and `realm` claim), so a customer cookie can never
open `/admin`, and vice versa.

### Access control is checked twice

1. **Middleware** (`src/middleware.ts`, runs on every request to `/admin/**`,
   `/portal/**`, `/login`, `/register`): verifies the realm's token signature
   and expiry. No token → redirect to that realm's login with `?next=`.
   Already signed in → login pages redirect to the dashboard.
2. **Guards** (`src/server/auth/guards.ts`): every layout, page and server
   action calls `requireAdmin()` / `requireCustomer()`, which loads the user
   from the database. A deactivated user or a blocked company loses access
   immediately, without waiting for the token to expire. Failed guards go to
   `/auth/signout/[realm]`, which clears the stale cookie.

### Customer login (OTP)

1. Customer enters phone → `normalizeUzPhone` → if an active user exists, a
   6-digit code is generated with `crypto.randomInt`, stored as an HMAC hash
   (5 min TTL, max 5 attempts) and sent through `SmsProvider`.
2. The response is identical whether or not the number exists (no account
   probing).
3. Code verified with a constant-time comparison → session cookie issued.
4. Rate limits: 5 code requests and 10 verify attempts per phone per 15 min.

`SMS_PROVIDER=console` prints codes to the server log; in development the
code is also shown on the login screen. Eskiz.uz / Play Mobile plug in behind
the same `SmsProvider` interface.

### Admin login

Email + password checked with bcrypt (cost 12). Unknown emails are compared
against a dummy hash so timing doesn't reveal which accounts exist.
Rate-limited per IP + email (8 per 15 min). The first owner account comes from
`SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`.

### Other protections

* Cookies: `HttpOnly`, `SameSite=Lax`, `Secure` in production.
* Server actions: Next.js checks the `Origin` header (CSRF), each action
  validates input with zod and re-checks the session.
* Security headers: `X-Frame-Options: DENY`, `nosniff`, strict referrer.
* Money and quantities are recomputed on the server; the client's price
  preview is never trusted.

## 4. Code layout and layers

```
prisma/
  schema.prisma          data model (single source of truth)
  migrations/            SQL migrations
  seed.ts                catalog + demo clients/orders from the prototype
prototype/main.html      original clickable demo (reference only)
src/
  domain/                PURE business rules — no I/O, unit-tested
    order-stages.ts      lifecycle, labels, transition rules (canAdvance)
    pricing.ts           tiers, unit/line price, VAT
    phone.ts, catalog.ts
  server/                server-only code
    auth/                realms (JWT), session cookies, guards, OTP, rate limit
    sms/                 SmsProvider interface (+ console provider)
    services/            all database access, one module per area
      orders.ts          reads (scoped) and state-changing operations
      clients.ts, catalog.ts, lookups.ts
      dashboard/
        admin.ts         getAdminDashboard()    → AdminDashboard view model
        customer.ts      getCustomerDashboard() → CustomerDashboard view model
    actions/             "use server" entry points called by forms
  app/                   routes (thin: guard → service → render)
    page.tsx             public landing
    (auth)/login, (auth)/register      customer sign-in
    portal/**                          customer portal
    admin/login                        staff sign-in
    admin/(panel)/**                   back office (guarded layout)
    auth/signout/[realm]               clears a stale session cookie
  components/
    ui/                  primitives (Button, Card, Badge, Progress, …)
    layout/app-shell     shared dashboard frame (sidebar, top bar, mobile drawer)
    dashboard/           widgets (KpiCard, PipelineStrip, AttentionList, …)
    orders/              order table, stage badge/stepper, order detail parts
  config/navigation.ts   sidebar items per realm
  middleware.ts          realm gate
```

**Dependency rule:** `app` → `actions` → `services` → `domain`. Components
never import Prisma. `domain` imports nothing from the app. This keeps the
business rules testable and lets a mobile app or Telegram bot reuse
`services` later.

### Request flow example — admin moves an order forward

```
<form action={advanceOrderAction}>                       components/orders/action-form
  → advanceOrderAction (server action)                   server/actions/admin-orders
      requireAdmin()                                     server/auth/guards  (DB check)
      orders.advanceOrder(id, actor)                     server/services/orders
          canAdvance(order, "ADMIN")                     domain/order-stages (rule)
          UPDATE … WHERE stage = <old>                   optimistic concurrency
          INSERT OrderEvent (audit trail)
      revalidatePath(...)                                page re-renders with new state
```

## 5. Data model (summary)

```
AdminUser ─┬─< Company (manager) ─┬─< CustomerUser ─< Order (createdBy)
           │                      ├─< DeliveryAddress
           └─< Order (manager)    └─< Order ─┬─< OrderItem >─ Product
                                             │              >─ DecorationMethod
Workshop ─< Order                            ├─< OrderEvent   (timeline / audit)
DiscountTier, Color, OtpCode                 └─< OrderMessage (customer ↔ JAMO chat)
```

* **Order stages:** `MOCKUP → QUOTE → PAYMENT → CUTTING → SEWING → BRANDING →
  QC → PACKING → DELIVERY → DONE` (+ `CANCELLED`). Transition rules live in
  `domain/order-stages.ts`: customers may only accept a quote; moving from
  `PAYMENT` into production requires payment and an assigned workshop.
* **Prices are snapshotted** on `OrderItem` (unit price, discount, setup,
  line total) and VAT on `Order`, so later catalog changes don't rewrite
  history.
* **Money** is whole UZS in integer columns.
* **Order numbers** (`O-2041`) are human-facing; primary keys are cuids.

## 6. Dashboard architecture

Each dashboard is built from three parts:

```
 page.tsx (server component)
   ├─ requireX()                      who is asking
   ├─ getXDashboard(scope)            ONE service call → typed view model
   └─ <KpiGrid> <PipelineStrip> …     presentational widgets, props only
```

* **View model per dashboard** (`server/services/dashboard/*.ts`) runs all
  queries in parallel and returns exactly what the screen shows: numbers,
  lists, labels. Its return type (`AdminDashboard`, `CustomerDashboard`) is
  the contract between data and UI.
* **Widgets** (`components/dashboard/*`) are reusable, stateless and never
  touch the database. The same `KpiCard` serves both realms.
* **Shell** (`components/layout/app-shell.tsx`) is shared; each realm passes
  its own navigation from `config/navigation.ts`, label and sign-out action.
  Adding a section = one nav entry + one page.

### Customer dashboard (`/portal`)

| Widget | Data |
| --- | --- |
| KPIs | Active orders · in production · waiting for customer decision · paid this year |
| "Needs your action" | Orders in `QUOTE` or unpaid `PAYMENT`, with a direct button |
| Orders in progress | Each active order with stage badge, progress bar, due date, amount |
| "Time to renew" | Products last ordered more than `Company.reminderMonths` ago → one-click reorder |

### Admin dashboard (`/admin`)

| Widget | Data |
| --- | --- |
| KPIs | Revenue this month (gross, vs last month) · open orders · units in production · overdue |
| Order pipeline | Count and value per column (New, Quote, Payment, Production, Shipping, Closed) → filtered list |
| Needs attention | Companies awaiting approval · paid orders not yet handed off · overdue orders |
| Workshop load | Units in production vs monthly capacity per workshop (green → amber → red) |
| Recent orders | Last 6 orders |
| Units by product | Ranked bar list |

### Scaling the dashboards

Today the view models aggregate in memory, which is fine for thousands of
orders. When volumes grow: move aggregates to SQL (`groupBy` / raw queries),
then to a nightly materialized view, without changing the widgets: only the
view-model function changes.

## 7. Running locally

```bash
cp .env.example .env            # then set strong AUTH_* secrets
npm install
npm run db:migrate              # create tables
npm run db:seed                 # demo data
npm run dev                     # http://localhost:3000
```

| Who | Where | Credentials (demo) |
| --- | --- | --- |
| Customer | `/login` | `+998 90 123-45-67`. The code appears on screen in dev |
| Admin (owner) | `/admin/login` | `admin@jamotextile.uz` / `SEED_ADMIN_PASSWORD` |
| Admin (manager) | `/admin/login` | `timur@jamotextile.uz` / same password |

Checks: `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`.

## 8. Roadmap

| Phase | Scope |
| --- | --- |
| **1 — Foundation (this change)** | Two realms, guarded dashboards, order lifecycle, new-order form, admin pipeline, client approval, catalog view |
| 2 — Product depth | Port the SVG garment mockup and logo upload (S3-compatible storage); multi-item orders; size collection by link; editable catalog/pricing; staff management (OWNER only); company profile editing and employee invites |
| 3 — Integrations | Eskiz SMS · Telegram bot (notifications, login codes) · Payme / Click payments (webhooks → `setPaid`) · Didox / Faktura.uz e-documents · PDF quote/invoice generation |
| 4 — Growth | Campaigns and seasonal triggers, AI mockup variants, Uzbek/Russian/English i18n, analytics page, factory realm (`/factory`) for workshop staff |
| Ops | Redis rate limiting for multi-instance, error tracking (Sentry), backups, CI (lint, typecheck, test, build) |
