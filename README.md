[![make.fun · gta6-trophy-guide-01](https://make.fun/badge/gta6-trophy-guide-01.svg)](https://make.fun/bounty/gta6-trophy-guide-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)
[![rank](https://make.fun/badge/gta6-trophy-guide-01/rebahan149/gta6-trophy-guide-entry/rank.svg)](https://make.fun/bounty/gta6-trophy-guide-01/leaderboard)
[![reward](https://make.fun/badge/gta6-trophy-guide-01/rebahan149/gta6-trophy-guide-entry/reward.svg)](https://make.fun/bounty/gta6-trophy-guide-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)

# The Leonida Trophy Ledger — a GTA VI trophy guide & tracker

An offline guide and tracker for all 55 Grand Theft Auto VI PlayStation 5 trophies (1 platinum, 2 gold, 6 silver, 46 bronze), each shown with its official name, description and grade exactly as PlayStation publishes them.

What it does:

- **A guide for every trophy, in its own words, with sources cited beside it** — what to do, where and how, and when it can be missed. Sources are named and linked next to each trophy (the official list as mirrored by Exophase and PSNProfiles, Rockstar's GTA VI page and Newswire, the PlayStation Blog); nothing is copied from them.
- **A platinum roadmap in eight stages**, built from the official descriptions: the story chapters and named missions in order, the stranger strands, the collectible sweep, the activity counters (250 stunts, 42 Shooting Range challenges, 20 races, $250,000 laundered…), the free-roam feats, and the 100% finish.
- **Missable flags, derived and explained** — five trophies whose descriptions tie them to a single moment or a choice (among them Catch Me If You Can at VCIA and Actions Speak Louder) are flagged in the checklist, the roadmap and their own Missables view.
- **A real tracker** — tick trophies off and progress is saved in the browser (localStorage), with an overall percentage, per-grade counts and trophy points; export progress to a JSON file and import it back, or carry it in a share link (`?earned=2,3,8`).
- **Filters and a spoiler shield** — filter by kind (story, missable, collectibles, activities; the official list has no online trophies), by grade, or by search; the spoiler shield hides story trophies' names, descriptions and guides until you earn them.

The app is plain static files under `app/` with no build step and makes no network requests: it works with the network off.

## Run it

```sh
node serve.ts            # serves app/ at http://localhost:8080
```

or serve the `app/` folder with any static file server, with `app/` at the root, and open `index.html`.

Hand-in (what the grader runs): `mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts` copies `app/` and `screenshots/` to the output directory and writes `dossier.json` with the vendored make.fun library.

## Layout

- `app/index.html` — the page: progress panel, view tabs, filters, checklist, guide panel, roadmap, missables, sources.
- `app/app.js` — rendering and interaction for all four views.
- `app/js/tracker.js` — progress state: localStorage, export/import, share links, points.
- `app/js/roadmap.js` — the eight roadmap stages.
- `app/data/trophies.json` — the 55 trophies: official name, description and grade, plus kind, missable flag, roadmap stage, target count, guide and sources.
- `screenshots/` — renders of the finished app (checklist with a guide open, the silver filter, the bronze list, the roadmap).
