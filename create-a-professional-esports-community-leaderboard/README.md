# TNFFM Community Rankings

Professional Free Fire MAX community leaderboard for **Tamilnadu Free Fire Max Esports (TNFFM)**, built with Next.js, TypeScript, Tailwind CSS, Framer Motion, and Google Sheets.

## Features

- Premium red, black, and yellow esports UI
- Live hero stats, top-three podium, sticky leaderboard table, search, filters, sorting, pagination
- Automatic Community Points calculation and ranking tie-breakers
- Team profile pages with tournament, championship, and match statistics
- Rank movement indicators, champion crown, team badges, recent updates feed
- Export leaderboard as PNG and share team profiles
- Password-gated admin dashboard preview
- Optional Google Apps Script webhook for dashboard write-back
- Google Sheets API or published CSV integration with 5-minute refresh
- SEO metadata, sitemap, robots rules, and responsive mobile layout

## Project Structure

```txt
src/app
  page.tsx                 Homepage
  admin/page.tsx           Password-protected admin dashboard
  teams/[slug]/page.tsx    Team profile pages
  api/teams/route.ts       Public leaderboard JSON endpoint
  api/admin/login/route.ts Server-side password verification
  api/admin/sync/route.ts  Optional Google Sheets webhook sync
src/components             Hero, podium, table, profiles, admin UI
src/lib                    Ranking formula, Sheets reader, sample data, types
outputs/sample-teams.csv   Ready-to-import 20-team sample sheet
```

## TNFFM Community Score Formula

```txt
Community Score =
(Championships x 100)
+ (Runner-Up x 70)
+ (2nd Runner-Up x 50)
+ (Top 5 Finishes x 25)
+ (Finalist Finishes x 15)
+ (Free Fire MAX Official Match Finalist x 100)
```

Tie-breakers are applied in this order:

1. Higher Community Points
2. More Championships
3. More Runner-Up finishes
4. More 2nd Runner-Up finishes
5. More Top 5 finishes
6. Fewer events played

## Google Sheet Columns

Use this header row:

```csv
Team Name,Logo URL,Kills,Booyahs,Championships,RunnerUp,SecondRunnerUp,Top5Finishes,FinalistFinishes,OfficialMatchFinalists,EventsPlayed,WinRate,KillRatio,Players,Status,Description
```

`Kills` and `Booyahs` remain visible stats, but TNFFM Community Score now uses the official placement-based ranking system.

## Environment Variables

Copy `.env.example` to `.env.local`.

```bash
ADMIN_PASSWORD=change-this-password
NEXT_PUBLIC_SITE_URL=https://your-vercel-domain.vercel.app
```

Use one of these Google Sheets options.

### Option A: Google Sheets API

```bash
GOOGLE_SHEETS_ID=your_sheet_id
GOOGLE_SHEETS_RANGE=Teams!A2:P
GOOGLE_SHEETS_API_KEY=your_api_key
```

### Option B: Published CSV

Publish your sheet to the web as CSV and set:

```bash
GOOGLE_SHEETS_CSV_URL=https://docs.google.com/spreadsheets/d/e/.../pub?gid=0&single=true&output=csv
```

### Optional Admin Write-Back

If you want `/admin` to push edits back into Google Sheets, deploy a Google Apps Script Web App that accepts JSON `{ teams: [...] }` and rewrites your sheet rows. Then set:

```bash
GOOGLE_SHEETS_WEBHOOK_URL=https://script.google.com/macros/s/.../exec
```

## Local Development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Admin Workflow

The public database is Google Sheets. For production, update team stats directly in the connected Google Sheet or configure `GOOGLE_SHEETS_WEBHOOK_URL` so the password-protected `/admin` panel can forward add, edit, delete, logo upload/remove, kills, championships, Booyahs, and qualification changes to your sheet. The website refreshes automatically every 5 minutes.

Default local password, if `ADMIN_PASSWORD` is not set:

```txt
admin123
```

## Deploy to Vercel

1. Push this project to GitHub.
2. Import the repository in Vercel.
3. Add the environment variables from `.env.example`.
4. Deploy.
5. Update `NEXT_PUBLIC_SITE_URL` to the live Vercel URL.

Vercel will serve the app with incremental refresh every 5 minutes for the Google Sheets-backed leaderboard.

## Sample Data

The app includes 20 sample teams in `src/lib/sample-data.ts`. If Google Sheets is not configured or temporarily fails, the leaderboard automatically falls back to the sample dataset so the website remains presentable.
