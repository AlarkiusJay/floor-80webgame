# Adding supporters (Meowspporters)

There is **one** supporter list, at [`fl80r-game/public/contributors.json`](./fl80r-game/public/contributors.json).
It is served at `/contributors.json` and read by both:

- the **game** Credits panel — shows the **latest few** supporters, and
- the **hub** Contributors page (`/hub/contributors.html`) — shows the **full list**.

## How to add a supporter

Edit `fl80r-game/public/contributors.json` and add an entry **at the top**
(newest first — the game shows the most recent ones):

```json
[
  { "name": "New Supporter", "tier": "FL80R Cat Tribute", "date": "2026-09-22" },
  { "name": "Older Supporter", "tier": "Tower Visitor", "date": "2026-09-20" }
]
```

- **name** — required. Displayed as-is.
- **tier** — optional. e.g. `"Tower Visitor"` or `"FL80R Cat Tribute"`.
- **date** — optional, `YYYY-MM-DD`. Shown on the hub list.

Commit, push, and redeploy — no code changes needed. An empty list (`[]`)
shows the "The cats are purring…" placeholder on both the game and the hub.
