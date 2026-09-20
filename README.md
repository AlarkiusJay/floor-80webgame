<img width="1653" height="926" alt="srcnsht-png-01-11" src="https://github.com/user-attachments/assets/0c38a7f8-0664-410e-b2d8-6a75d380c74e" />

---

<img width="1651" height="925" alt="srcnsht-png-01-11_1" src="https://github.com/user-attachments/assets/4b49ee4d-ad2c-4148-9d69-932a7b9f0de4" />

<div align="center">

# FL80R

**80 floors. No saves. No checkpoints. No mercy.**

A browser-based puzzle-logic game. Climb a mysterious building one floor at a time — every floor is its own puzzle, and it won't let you go back.

▶ **Play at [fl80r.party](https://www.fl80r.party)**

</div>

---

## What is FL80R?

FL80R (*"Floor 80"*) drops you partway up an 80-storey building and dares you to reach the top. Each floor is a self-contained challenge — a riddle, a bit of math, something hidden in plain sight, a chase, a boss. Solve it to climb. There are no saves and no checkpoints: it's one continuous run to the top.

It's wrapped in a retro terminal / CRT aesthetic — green phosphor glow, scanlines, glitching text — and it's built to be played out loud: solo, with friends taking turns, or on stream with an audience shouting answers.

## What makes it tick

- **One run, 80 floors.** No saved progress, no going back. You finish it in a sitting or you start over.
- **Freshly generated every time.** Each new session — or just a page refresh — rolls a brand-new set of riddles. No two runs are the same. Only the **boss floors** (10, 20, 30, 40, 50, 60, 70) and the **final Floor 80** are fixed.
- **Bring a pen and paper.** Some floors are *memory* floors: they ask what your answer was several floors ago. The game warns you up front — memory is not optional.
- **Look closely.** On hidden floors the answer is buried in the screen itself. The obvious is rarely correct.
- **Made for an audience.** Streamer-friendly by design — challenge chat to spot the hidden text before you do.

## The building

Eight zones, ten floors each — each with its own mood and color palette:

| Floors  | Zone              |
| ------- | ----------------- |
| 1–10    | The Lobby         |
| 11–20   | The Archives      |
| 21–30   | The Machine Room  |
| 31–40   | The Labyrinth     |
| 41–50   | The Observatory   |
| 51–60   | The Crypts        |
| 61–70   | The Glass Tower   |
| 71–80   | The Final Ascent  |

## Floor types

- **Hidden** — the answer is camouflaged somewhere on the screen.
- **Typed riddle** — read the clue, type the answer.
- **Math** — a numeric puzzle to work out.
- **Chase** — think fast under pressure.
- **Circuit** — a wiring/logic puzzle that guards each boss (floors 9, 19, 29 …).
- **Memory** — recall an answer from an earlier floor.
- **Boss** — a fixed showdown every tenth floor.
- **Floor 80** — the fixed finale at the top.

## Tech

A fully client-side static site — no backend, no accounts, no tracking. Built with **Vite**, **React**, and **Tailwind CSS**.

## Development & deployment

The app lives in [`fl80r-game/`](./fl80r-game). See its [README](./fl80r-game/README.md) for the full run/build/deploy details. In short:

```bash
cd fl80r-game
npm install
npm run dev      # local dev server
npm run build    # production build into dist/
```

It deploys as a **Cloudflare Worker with static assets** (config in [`fl80r-game/wrangler.jsonc`](./fl80r-game/wrangler.jsonc)); SPA routing is handled by `not_found_handling: "single-page-application"`.

## License

See [LICENSE](./LICENSE).
