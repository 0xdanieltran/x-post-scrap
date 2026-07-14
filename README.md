# X Job Fetch

A production-ready job discovery SaaS platform that aggregates public hiring posts from **X (Twitter)** into a searchable job board. All job extraction, filtering, classification, and matching uses **deterministic rule-based logic** — no AI or LLMs.

## Features

- **Job Discovery** — Infinite-scroll job feed with search, filters, and sorting
- **X API Integration** — Server-only client with cursor pagination, retry, and rate limiting
- **Rule-Based Parsing** — Regex, keyword dictionaries, and pattern matching extract structured job fields
- **Spam Detection** — Configurable filters reject scams, retweets, and low-quality posts
- **Match Engine** — Weighted scoring matches jobs to user preferences
- **Saved Jobs** — List view and Kanban board for application tracking
- **Notifications** — Email alerts with daily/weekly/instant digest options
- **Admin Panel** — Manage queries, ingestion, spam filters, and analytics
- **Auth** — Email/password, magic link, forgot password via Supabase Auth

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS + shadcn/ui |
| Database | PostgreSQL via Supabase |
| Auth | Supabase Auth + RLS |
| State | Zustand + TanStack Query |
| Validation | Zod + React Hook Form |
| Deployment | Vercel |

## Project Structure

```
src/
├── app/                    # Next.js App Router pages & API routes
│   ├── api/                # REST API endpoints
│   ├── auth/               # Auth callback
│   ├── dashboard/          # User dashboard pages
│   └── admin/              # Admin panel pages
├── components/             # React components
│   ├── ui/                 # shadcn/ui primitives
│   ├── jobs/               # Job feed, cards, kanban
│   ├── layout/             # Sidebar, navigation
│   └── providers/          # Theme, Query providers
├── lib/                    # Utilities
│   ├── supabase/           # Supabase clients (browser, server, admin)
│   ├── validations/        # Zod schemas
│   ├── constants/          # Job dictionaries, tech stacks
│   └── api/                # API helpers, rate limiting
├── repositories/           # Data access layer
├── services/               # Business logic
│   ├── x-api/              # X (Twitter) API client
│   ├── parser/             # Rule-based job parser
│   ├── spam/               # Spam detection
│   ├── matching/           # Match scoring engine
│   └── ingestion/          # Scheduled ingestion
├── stores/                 # Zustand stores
└── types/                  # TypeScript types
supabase/
└── migrations/             # SQL migrations with RLS
```

## Getting Started

### Prerequisites

- Node.js 20+
- A [Supabase](https://supabase.com) project
- An [X Developer](https://developer.x.com) account with API v2 Bearer Token

### 1. Clone and Install

```bash
git clone <repo-url>
cd x-job-fetch
npm install
```

### 2. Environment Variables

Copy the example env file and fill in your credentials:

```bash
cp .env.example .env.local
```

Required variables:

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-only) |
| `X_API_BEARER_TOKEN` | X API v2 Bearer Token |
| `NEXT_PUBLIC_APP_URL` | App URL (http://localhost:3000 for dev) |
| `CRON_SECRET` | Secret for Vercel cron authentication |

### 3. Database Setup

Run the migration in your Supabase SQL Editor:

```bash
# Copy contents of supabase/migrations/001_initial_schema.sql
# Paste and run in Supabase Dashboard → SQL Editor
```

Or use the Supabase CLI:

```bash
npx supabase db push
```

### 4. Create Admin User

After signing up, promote a user to admin in Supabase SQL Editor:

```sql
UPDATE profiles SET role = 'admin' WHERE id = '<your-user-uuid>';
```

### 5. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## API Routes

| Method | Route | Description |
|--------|-------|-------------|
| `POST` | `/api/x/fetch` | Test X API query (admin) |
| `POST` | `/api/x/sync` | Trigger ingestion (admin/cron) |
| `GET` | `/api/jobs` | List jobs with filters |
| `GET` | `/api/jobs/[id]` | Get job details + match score |
| `POST` | `/api/jobs/save` | Save a job |
| `PATCH` | `/api/saved-jobs/[id]` | Update saved job status |
| `GET` | `/api/search` | Search jobs + log history |
| `GET` | `/api/admin/stats` | Admin analytics |
| `POST` | `/api/admin/query` | Create search query |
| `PATCH` | `/api/admin/query/[id]` | Update search query |
| `DELETE` | `/api/admin/query/[id]` | Delete search query |
| `GET` | `/api/cron/ingest` | Vercel cron ingestion endpoint |

## Deployment (Vercel)

### 1. Push to GitHub

```bash
git add .
git commit -m "Initial production-ready job discovery platform"
git push origin main
```

### 2. Import to Vercel

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your repository
3. Add all environment variables from `.env.example`
4. Deploy

### 3. Configure Cron

The `vercel.json` configures hourly ingestion at `/api/cron/ingest`. Vercel automatically sends the `Authorization: Bearer <CRON_SECRET>` header.

### 4. Configure Supabase Auth

In Supabase Dashboard → Authentication → URL Configuration:

- **Site URL**: `https://your-domain.vercel.app`
- **Redirect URLs**: `https://your-domain.vercel.app/auth/callback`

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│  X API v2   │────▶│  Ingestion   │────▶│  PostgreSQL │
│  (Server)   │     │  Service     │     │  (Supabase) │
└─────────────┘     └──────┬───────┘     └──────┬──────┘
                           │                     │
                    ┌──────▼───────┐      ┌──────▼──────┐
                    │ Rule Parser  │      │  Next.js    │
                    │ Spam Filter  │      │  App Router │
                    └──────────────┘      └──────┬──────┘
                                                 │
                                          ┌──────▼──────┐
                                          │  Dashboard  │
                                          │  + Admin    │
                                          └─────────────┘
```

### Ingestion Flow

1. Cron or admin triggers sync
2. Acquire global lock (prevent concurrent runs)
3. For each enabled search query:
   - Fetch tweets from X API (cursor pagination)
   - Skip duplicates by `tweet_id`
   - Parse job fields with rule-based parser
   - Run spam filter → assign quality score
   - Store in `x_posts` + `jobs` tables
4. Log run in `ingestion_runs`
5. Release lock

### Match Scoring

| Factor | Weight |
|--------|--------|
| Technology match | +25 |
| Role match | +20 |
| Remote preference | +15 |
| Country match | +10 |
| Seniority match | +10 |
| Salary match | +10 |

## Security

- X API keys are server-only (`server-only` package)
- Supabase Row Level Security on all tables
- Zod validation on all API inputs
- Rate limiting on public endpoints
- CSRF protection via Supabase Auth cookies
- Admin routes protected by role check in middleware

## License

MIT
