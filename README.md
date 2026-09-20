# floor-80webgame

The game lives in [`fl80r-game/`](./fl80r-game). See its [README](./fl80r-game/README.md) to run it locally.

## Deploying with Cloudflare

This deploys as a **Cloudflare Worker with static assets** (configured in
[`fl80r-game/wrangler.jsonc`](./fl80r-game/wrangler.jsonc)).

Build settings:

| Setting                    | Value           |
| -------------------------- | --------------- |
| **Root directory**         | `fl80r-game`    |
| **Build command**          | `npm run build` |
| **Deploy command**         | `npx wrangler deploy` |

SPA routing (deep links / refreshes resolving to the app) is handled by
`not_found_handling: "single-page-application"` in `wrangler.jsonc` — the
Workers equivalent of a `/* -> /index.html` fallback. A Pages-style
`_redirects` file is **not** used, because the Workers asset parser rejects
the `/* /index.html 200` rule as an infinite loop.
