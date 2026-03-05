# DevArena

A verified coding leaderboard that connects to GitHub and shows who's building the hardest in real time. Track commits, contributions, and coding activity with verified stats.

## Tech Stack

- **Next.js 14** with App Router
- **TypeScript**
- **Tailwind CSS** with Neobrutalism design
- **Supabase** for backend and database
- **NextAuth.js** for GitHub OAuth
- **Recharts** for data visualization

## Features

- 🔐 GitHub OAuth authentication
- 📊 Real-time coding leaderboard (week/month/all-time)
- 📈 Builder score calculation (commits, PRs, active days)
- 📉 Contribution charts and language breakdowns
- 🏆 Public profiles with rankings
- 🎨 Neobrutalism UI design

## Setup

1. **Clone the repository:**
```bash
git clone <repository-url>
cd terminaluse
```

2. **Install dependencies:**
```bash
npm install
```

3. **Set up environment variables:**
   - Copy `.env.example` to `.env.local`
   - Fill in all required environment variables (see `.env.example` for reference)

4. **Set up Supabase:**
   - Create a new Supabase project
   - Run the migrations in `supabase/migrations/` in order (001 through 008)
   - Get your Supabase URL and keys from the project settings

5. **Set up GitHub OAuth:**
   - Go to GitHub Settings → Developer settings → OAuth Apps
   - Create a new OAuth App
   - Set Authorization callback URL to: `http://localhost:3000/api/auth/callback/github`
   - Copy the Client ID and Client Secret to `.env.local`

6. **Generate NextAuth secret:**
```bash
openssl rand -base64 32
```
   - Add the output to `NEXTAUTH_SECRET` in `.env.local`

7. **Run the development server:**
```bash
npm run dev
```

8. **Open [http://localhost:3000](http://localhost:3000) in your browser.**

## Environment Variables

See `.env.example` for all required environment variables. Never commit `.env.local` or any `.env` files to version control.

## Database Migrations

Run the Supabase migrations in order:
1. `001_initial.sql` - Base tables (users, stats_snapshots)
2. `002_waitlist.sql` - Waitlist table
3. `003_github_support.sql` - GitHub integration columns
4. `004_github_followers.sql` - GitHub follower metrics
5. `005_builder_score.sql` - Builder score calculation
6. `006_language_breakdown.sql` - Language breakdown
7. `007_add_missing_columns.sql` - Ensure all columns exist
8. `008_year_alltime_commits.sql` - Year and all-time commits

## Project Structure

```
/app
  /api          - API routes (auth, sync, cron)
  /components   - React components
  /dashboard    - User dashboard
  /u            - Public user profiles
  /how          - How it works page
/lib            - Utility functions and clients
/supabase
  /migrations   - Database migration files
```

## Deployment

1. Push to GitHub
2. Connect to Vercel (or your preferred hosting)
3. Add all environment variables in the hosting platform
4. Deploy!

## Security

- All secrets are stored in environment variables
- Never commit `.env` files
- Service role key is server-side only
- Cron endpoints are protected with `CRON_SECRET`
