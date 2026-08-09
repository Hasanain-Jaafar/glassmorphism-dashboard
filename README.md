# Sales Management Dashboard

A premium, internal Sales Management Dashboard built with Next.js, Tailwind CSS v4, shadcn/ui, Framer Motion, and Supabase. Tracks the sales workflow (Appointment → Quotation → Deal → Invoice → Paid) with role-based access for Admins and Sales Representatives.

## Tech Stack

- Next.js (App Router) + TypeScript + React
- Tailwind CSS v4 + shadcn/ui
- Framer Motion
- Supabase (PostgreSQL, Auth, Row Level Security, Storage)
- TanStack Table, React Hook Form + Zod, Recharts

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure Supabase

Copy `.env.example` to `.env.local` and fill in your Supabase project's URL and publishable key (Supabase dashboard → Settings → API):

```bash
cp .env.example .env.local
```

### 3. Set up the database

Run the SQL migrations and seed data against your Supabase project. See [supabase/README.md](supabase/README.md) for step-by-step instructions, including how to promote the first admin account.

### 4. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). New accounts sign up via the sign-in page and default to the Sales Representative role; promote the first admin using the SQL in `supabase/README.md`.

## Deploying to Vercel

1. Push this repository to GitHub.
2. Import the repo into [Vercel](https://vercel.com/new).
3. In Vercel → Project Settings → Environment Variables, add the same two variables from `.env.example` (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`).
4. Deploy. Make sure your Supabase migrations and seed data (step 3 above) have already been applied to the production project before go-live.

## Project Structure

```
app/            Next.js routes (App Router)
components/     UI components (dashboard, charts, tables, sales, settings, ui)
lib/            Supabase clients, data-fetching helpers, utilities
supabase/       SQL migrations, RLS policies, storage config, seed data
```
