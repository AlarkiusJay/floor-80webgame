# floor-80webgame

The game lives in [`fl80r-game/`](./fl80r-game). See its [README](./fl80r-game/README.md) to run it locally.

## Deploying with Cloudflare Pages

Point Cloudflare Pages at this repo and use these build settings:

| Setting                  | Value          |
| ------------------------ | -------------- |
| **Root directory**       | `fl80r-game`   |
| **Framework preset**     | Vite           |
| **Build command**        | `npm run build`|
| **Build output directory** | `dist`       |

Client-side routing is handled by `fl80r-game/public/_redirects` (`/* → /index.html 200`), so deep links and refreshes resolve correctly.
