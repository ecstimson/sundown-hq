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

## Push to GitHub

The repo is initialized with an initial commit. To push to GitHub:

1. Create a new repository on [GitHub](https://github.com/new) (e.g. `sundown-hq`).
2. Add the remote and push:
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/sundown-hq.git
   git push -u origin main
   ```

## Deploy to Vercel

1. Go to [vercel.com](https://vercel.com) → New Project → Import your GitHub repo.
2. Framework preset: **Vite** (auto-detected).
3. Add environment variables in Project Settings if needed (e.g. `GEMINI_API_KEY`).
4. Deploy. Each push to `main` triggers a new deployment.

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
