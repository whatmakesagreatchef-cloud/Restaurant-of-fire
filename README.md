# Bear Mode — Turn-Based Restaurant Strategy Sim (GitHub Pages Ready)

This repo is a **playable single-player "multiplayer simulator" MVP**:
- Turn-based Lunch/Dinner services
- **Clientele / customer base** as a core system (segment mix + satisfaction + retention)
- **Cities as Seasons (Ages)** and **Neighbourhoods as Kingdoms**
- Restaurant creation: **Dining Type → Style → City → Neighbourhood**
- Dish system: **Library dishes + Template-driven Signature R&D**
- Competitive layer (offline): AI restaurants in the same city you can **scout** and **poach staff** from (and they can poach you)
- Michelin-style inspection + Best Restaurant leaderboard (simple, tunable)

> Multiplayer backend is **not included** (needs Supabase/Firebase/your own server), but the code is structured so you can swap the local AI+localStorage layer for an API later.

---

## Quick start (local)
Just open `index.html` in a browser.

## Deploy to GitHub Pages
1. Create a new GitHub repo and upload these files.
2. In GitHub repo settings → **Pages**
3. Set source to **Deploy from a branch** → branch `main` → folder `/ (root)`
4. Visit your Pages URL.

---

## Folder structure
- `index.html` — app shell
- `style.css` — UI styling
- `data.js` — cities, neighbourhoods, segments, templates, dishes, staff, problems
- `engine.js` — the simulation (service resolver, customers, scouting, poaching)
- `main.js` — UI + state management
- `tools/rubric-tester/` — the rubric tester (offline)

---

## Tunables (start here)
Open `engine.js` and search for:
- `TUNING` (retention, review chance, inspection cadence, poach chance)
- `CITY_ROTATION` (season length, city list)

---

## Notes
This is a **GitHub-ready playable framework**. If you want, the next step is:
- Replace `localStorage` with a backend
- Move AI restaurants to real players
- Add secure server-side turn resolution
