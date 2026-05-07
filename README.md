# Blackjack Tutor

A web-based blackjack practice game with a built-in **basic-strategy tutor**. Play hands, get instant feedback on whether your decision matches optimal basic strategy, and track your bankroll over time.

🎲 **Live demo:** https://blackjack-tutor.vercel.app

## Features

- Play single-deck blackjack with bet controls and a persistent bankroll
- **Tutor button** that reveals the basic-strategy recommendation for the current hand
- Result banner showing wins, losses, pushes, and blackjacks
- Local-first: progress and bankroll persist in `localStorage` (no account, no backend)

## Tech stack

- [Next.js 15](https://nextjs.org/) (App Router) + [React 19](https://react.dev/)
- [TypeScript](https://www.typescriptlang.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- Fully static — no API routes, no database

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Build

```bash
npm run build
npm start
```

## Project layout

```
app/         — routes (/, /login, /play)
components/  — UI components (Hand, Card, GameControls, TutorPopover, …)
lib/         — game logic (deck, hand, game, strategy, storage)
types/       — shared TypeScript types
```

## Deploy

Push to GitHub and import the repo at [vercel.com/new](https://vercel.com/new) — the Next.js preset works with zero config.
