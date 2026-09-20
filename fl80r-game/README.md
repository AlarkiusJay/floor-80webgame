# FL80R — app

The FL80R game application. For an overview of the game itself, see the [root README](../README.md).

Built with **Vite + React + Tailwind CSS**. Fully client-side — no backend or accounts.

## Prerequisites

- [Node.js](https://nodejs.org/) 18+ and npm

## Run locally

```bash
npm install
npm run dev
```

Then open the URL Vite prints (default: http://localhost:5173).

## Scripts

| Command           | Description                          |
| ----------------- | ------------------------------------ |
| `npm run dev`     | Start the local dev server           |
| `npm run build`   | Build for production into `dist/`    |
| `npm run preview` | Preview the production build locally |
| `npm run lint`    | Run ESLint                           |

## Project structure

```
src/
  pages/Game.jsx        # Game state machine: intro -> playing -> win
  components/game/       # One component per floor type
  data/                  # Floor generation, riddles, word lists
  components/ui/          # Reusable UI primitives
public/                  # Static assets (favicon, etc.)
```

## Deploying (Cloudflare Workers)

This deploys as a Cloudflare Worker with static assets, configured in [`wrangler.jsonc`](./wrangler.jsonc):

```bash
npm run build
npx wrangler deploy
```

SPA routing (deep links and refreshes resolving to the app) is handled by
`not_found_handling: "single-page-application"` in `wrangler.jsonc` — the
Workers equivalent of a `/* -> /index.html` fallback.
