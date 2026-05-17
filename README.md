# SupermarketList 🛒

A collaborative monthly shopping list for families. Organize your grocery runs by month, group items by category, and share lists with everyone in the house — no more lost WhatsApp messages.

## Features

- **Price comparison** — automatically fetches prices from Coto, Disco, and Carrefour for every item on your list; cheapest total is highlighted in green; results are cached per query for 4 hours to minimise external API calls
- **Monthly lists** — items are stored per month/year; navigate forward and backward to see purchase history
- **Categories** — Frutas y Verduras, Lácteos, Carnes, Panadería, Congelados, Despensa, Bebidas, Limpieza, Higiene Personal
- **Check off items** — mark products as purchased as you shop; see progress at a glance
- **Multiple lists** — create as many lists as you need (grocery, hardware store, pharmacy, etc.)
- **Sharing & invites** — invite family members or housemates by email; everyone sees changes live
- **Email verification** — accounts are secured with email verification on sign-up

## Tech stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, React 19) |
| Database (local) | SQLite via Prisma |
| Database (production) | Turso (libSQL) |
| Auth | Custom JWT session with `jose` |
| Email | Nodemailer |
| Styling | Tailwind CSS v4 |
| Hosting | Vercel |

## Getting started

### 1. Install dependencies

```bash
npm install
```

### 2. Set up environment variables

Copy `.env.example` to `.env` and fill in the values:

```
DATABASE_URL="file:./prisma/dev.db"
SESSION_SECRET="<run: openssl rand -base64 32>"
```

> **Do not add `TURSO_DATABASE_URL` to `.env`.** That variable is for Vercel only. Setting it locally connects your dev environment directly to the production database and risks data loss.

### 3. Run database migrations

```bash
npm run migrate:local
```

### 4. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Database migrations

This project uses **SQLite locally** and **Turso (libSQL) in production**. `prisma migrate deploy` does not support the `libsql://` scheme, so a custom migration script is used for Turso:

```bash
npm run migrate:turso
```

After every `prisma migrate dev` (local), run `npm run migrate:turso` to keep the production database in sync.

### Running `prisma migrate dev` locally

Since `TURSO_DATABASE_URL` is not set in `.env`, Prisma targets the local SQLite automatically — no workaround needed:

```bash
npx prisma migrate dev --name <migration-name>
npm run migrate:turso   # apply to Turso production
```

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server |
| `npm run build` | Migrate Turso + generate Prisma client + build |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm test` | Run tests (Vitest) |
| `npm run migrate:local` | Apply pending migrations to local SQLite (`dev.db`) |
| `npm run migrate:turso` | Apply pending migrations to Turso (production) |

## Deployment (Vercel)

Set the following environment variables in **Vercel → Settings → Environment Variables**:

| Variable | Description |
|---|---|
| `SESSION_SECRET` | JWT signing secret — `openssl rand -base64 32` |
| `TURSO_DATABASE_URL` | Turso database URL (`libsql://...`) |
| `TURSO_AUTH_TOKEN` | Turso auth token |
| `NEXT_PUBLIC_BASE_URL` | Deployed app URL (e.g. `https://your-app.vercel.app`) — used in emails, the OpenAPI spec, and the MCP snippet; falls back to `http://localhost:3000` locally |

The build command (`npm run build`) automatically runs Turso migrations and generates the Prisma client before Next.js builds.

## Project structure

```
app/
  (auth)/
    login/         # Login page
    signup/        # Sign-up page
  lists/
    page.tsx       # List of all your shopping lists
    [listId]/      # Individual list view (items, check-off, month nav)
    [listId]/share # Invite members by email
    new/           # Create a new list
  components/      # Shared UI components
  page.tsx         # Public landing page
lib/
  auth-actions.ts  # Login, signup, logout server actions
  list-actions.ts  # CRUD for lists and items
  invite-actions.ts# Email invite flow
  price-actions.ts # getItemPrices server action (auth guard + cache + fan-out)
  price-adapters.ts# vtexAdapter (Disco/Carrefour) and cotoAdapter (Coto)
  session.ts       # JWT session helpers
  dal.ts           # Data access layer (verifySession, etc.)
prisma/
  schema.prisma    # Data models: User, List, ListMember, ListInvite, Item, PriceCache
scripts/
  migrate-turso.ts # Custom Turso migration runner
workflows/
  email-verification.ts  # Email verification workflow
  list-invite.ts         # List invite email workflow
```
