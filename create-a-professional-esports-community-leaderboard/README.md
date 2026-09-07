# TNFFM Community Rankings

Professional Free Fire MAX community leaderboard for **Tamilnadu Free Fire Max Esports (TNFFM)**, built with Next.js, TypeScript, Tailwind CSS, Framer Motion, and Google Sheets.

## Features

- Premium esports UI with responsive mobile layout
- Live leaderboard, podium, search, filters, sorting, and pagination
- Automatic Community Score calculation and ranking tie-breakers
- Team profile pages with tournament and match statistics
- Rank movement indicators, badges, recent updates, and sharing/export tools
- Password-protected admin dashboard
- Google Apps Script-backed production read/write flow
- News & Updates management and public news pages
- Team registration/login and team dashboard workflows
- SEO metadata, sitemap, and robots rules

## Project Structure

```txt
src/app
  page.tsx                         Homepage
  admin/page.tsx                   Admin dashboard
  teams/[slug]/page.tsx            Team profile pages
  news/page.tsx                    Public news page
  api/admin/login/route.ts         Admin authentication
  api/admin/save/route.ts          Unified admin write/verify flow
  api/admin/sheet/route.ts         Protected admin data read
  api/tracked-events/route.ts      Public tracked-events endpoint

src/components                     UI components and dashboard components
src/lib                            Ranking, Google Sheets, events, cache, types
.github/workflows/tnffm-ci.yml     TypeScript/build validation
```

## Community Score

The production ranking logic is defined by the application ranking module and should be treated as the source of truth. Do not manually maintain a second ranking formula in documentation or backend code.

## Production Data Architecture

Google Sheets is the canonical data source for production. The admin dashboard uses the protected Google Apps Script-backed save/read flow and verifies writes with a fresh read before reporting success.

The production flow is:

```txt
Admin login
   -> protected admin API
   -> Google Apps Script
   -> Google Sheets
   -> fresh read-back verification
   -> cache invalidation/revalidation
   -> updated public website
```

## Environment Variables

Copy `.env.example` to `.env.local` and configure the production secrets there or in Vercel environment settings.

```bash
ADMIN_PASSWORD=your-secure-admin-password
NEXT_PUBLIC_SITE_URL=https://your-live-domain.vercel.app
GOOGLE_SHEETS_WEBHOOK_URL=https://script.google.com/macros/s/.../exec
```

Never commit real passwords, API keys, service-account credentials, or private webhook secrets to GitHub.

## Admin Workflow

The `/admin` dashboard is password protected. Production administration should use the configured `ADMIN_PASSWORD` and the unified `/api/admin/save` flow. The backend must fail closed when the admin password is not configured; there is **no default or fallback admin password**.

Admin changes should be verified against Google Sheets before being reported as successfully saved.

## Local Development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Validation

The repository CI validates the application with:

```bash
npm ci
npx tsc --noEmit
npm run build
```

Run these checks before deploying backend changes.

## Deploy to Vercel

1. Import the repository into Vercel.
2. Set the project's Root Directory to `create-a-professional-esports-community-leaderboard`.
3. Configure the required environment variables.
4. Deploy the `main` branch.
5. Verify the public homepage, rankings, teams, news, team login, and admin workflows after deployment.

## Important Architecture Note

Use `create-a-professional-esports-community-leaderboard` as the production application directory. Do not introduce another duplicate application directory or maintain a second backend implementation. Legacy/local JSON admin routes should not be used as the production data path.
