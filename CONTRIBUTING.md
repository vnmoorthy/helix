# Contributing to Helix

Thanks for helping sequence the internet's videos. 🧬

## Dev setup
```bash
cd app
npm install
cp .env.example .env.local   # ORIANE_API_KEY=… (optional — sample data works without it)
npm run dev
```

## The golden rule
**Every gene must be provable.** A gene is only accepted if it is read from a concrete Oriane field and carries an evidence string (and a timestamp when one exists). No LLM-guessed genes.

## Adding a gene (5 minutes)
1. Add an entry to `GENES` in `app/lib/genes.ts` (id, label, track, blurb, recipe).
2. Detect it in `extractGenes()` with `add(id, evidence, field, t?)`.
3. If it should shape forks, map it in `app/lib/fork.ts`.
4. Sequence a niche and check the leaderboard + video genome.

## Pull requests
- Keep PRs focused; include a screenshot for UI changes.
- `npx tsc --noEmit` and `npm run build` must pass (CI runs both).
