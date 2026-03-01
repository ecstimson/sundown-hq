# Sundown HQ

Animal management, SOPs, and inventory drop planner for Sundown Reptiles. Employee PWA (mobile-first) and Admin Dashboard (desktop).

## Run Locally

**Prerequisites:** Node.js 18+

1. Install dependencies:
   ```bash
   npm install
   ```

2. (Optional) Create `.env.local` for API keys. Copy from `.env.example`:
   ```bash
   cp .env.example .env.local
   ```
   `GEMINI_API_KEY` is optional for now — the app runs without it.

3. Start the dev server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000)

## Deploy to Vercel

1. Push this repo to GitHub.
2. Go to [vercel.com](https://vercel.com) → New Project → Import your repo.
3. Framework preset: **Vite** (auto-detected).
4. Add environment variables in Project Settings if needed.
5. Deploy. Each push to `main` triggers a new deployment.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server (port 3000) |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |
| `npm run lint` | Type check |

## Project Structure

- `src/pages/` — Page components (Employee + Admin flows)
- `src/components/` — Layout and UI components
- `src/lib/` — Utilities
- See [sundown-hq-app-prd.md](sundown-hq-app-prd.md) for full product spec
