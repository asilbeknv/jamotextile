# JAMO Textile

JAMO Textile loyihasi uchun — B2B platform for ordering branded corporate
clothing (uniforms, hoodies, caps, workwear with the client's logo).

* **Customer portal** (`/portal`): companies sign in with phone + SMS code, place
  orders with live pricing, accept quotes, chat with their manager and follow
  production stage by stage.
* **Admin back office** (`/admin`): JAMO staff sign in separately with email +
  password, run the order pipeline, approve new companies and see dashboards
  for revenue, workshop load and overdue orders.

Architecture, security model and the dashboard design are described in
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md). The original clickable demo is
kept in [prototype/main.html](prototype/main.html).

## Quick start

Requirements: Node.js 20+, PostgreSQL 14+.

```bash
cp .env.example .env     # set DATABASE_URL and two different AUTH_* secrets
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

Open http://localhost:3000.

| Role | Sign in at | Demo account |
| --- | --- | --- |
| Customer | `/login` | `+998 90 123-45-67` (code shown on screen in development) |
| Admin | `/admin/login` | `admin@jamotextile.uz` / value of `SEED_ADMIN_PASSWORD` |

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build / server |
| `npm run typecheck` · `npm run lint` · `npm test` | Checks |
| `npm run db:migrate` | Apply schema changes (creates a migration) |
| `npm run db:seed` | Load the catalog and demo data |
