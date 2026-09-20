# Floor 80

A browser-based puzzle game. Climb the floors — each one is a different challenge (typed answers, math, circuits, chases, riddles, a cat boss, and more) until you reach the top.

Built with **Vite + React + Tailwind CSS**.

## Getting started

**Prerequisites:** [Node.js](https://nodejs.org/) 18+ and npm.

```bash
# 1. Install dependencies
npm install

# 2. Start the dev server
npm run dev
```

Then open the URL Vite prints (default: http://localhost:5173).

## Scripts

| Command           | Description                            |
| ----------------- | -------------------------------------- |
| `npm run dev`     | Start the local dev server             |
| `npm run build`   | Build for production into `dist/`      |
| `npm run preview` | Preview the production build locally   |
| `npm run lint`    | Run ESLint                             |

## Deploying

`npm run build` produces a static site in `dist/` that can be hosted on any static host (GitHub Pages, Netlify, Vercel, Cloudflare Pages, etc.).

## Project structure

```
src/
  pages/Game.jsx          # Top-level game state machine (intro → playing → win)
  components/game/         # One component per floor type
  data/                    # Floor generation, riddles, word lists
  components/ui/           # Reusable UI primitives
```
