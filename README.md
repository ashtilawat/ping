# PING

A daily web game: find the hidden signal on a 12×12 grid in 4 taps.

## Rules

One hidden cell **H** is chosen for each UTC calendar day. Tap unused on-grid cells; after each tap you see the Manhattan distance to **H**. A distance of **0** wins. You have **4** taps. Retaps and off-grid taps are ignored and do not consume a tap.

## Puzzle numbering

Puzzle numbers are 1-based UTC-date counts from **PING_EPOCH_UTC**:

```
PING_EPOCH_UTC = 2025-01-01
```

Puzzle `#1` is the game for `2025-01-01` UTC. Puzzle `#n` is the game for the UTC date that is `n - 1` days after the epoch.

## Share format

**Win** in `k` taps:

```
PING #<n> <k>/4
📡<d>   (one line per miss, in order; never 📡0)
🎯
```

**Honest lose** (4 taps, none 0):

```
PING #<n> X/4
📡<d>   (exactly four lines)
```

Share text never reveals **H** or coordinates.

## Development

```bash
npm install
npm test
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Seed generator

**H** is a deterministic function of the UTC calendar date. Candidates are rejected if:

- Two cells would share a 3-tap distance triple (ambiguous feedback)
- **H** is in `{(5,5),(5,6),(6,5),(6,6)}` or within Manhattan distance ≤ 2 of the center midpoint `(5.5, 5.5)`
- Manhattan distance from **H** to any corner is ≥ 18
- **H(D+1) = H(D)** for consecutive UTC days

Unit tests may force `H = (5,5)` for scoring; the published generator still rejects center seeds.

## Tech

Next.js App Router, no auth, no database, no API routes. Public and playable on a cold URL.
