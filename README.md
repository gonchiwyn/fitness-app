# Forge

Your daily workout app. Built for training, not for scrolling.

- **11 categories** — CrossFit, Hyrox, Surf, Stretching, Athlete, Strength, Hypertrophy, Burn, Recovery, Beach, Cardio
- **Coach-informed recommendations** — Andy Galpin (3-5 framework, periodization, velocity-based training), Peter Attia (Zone 2, VO2 max), Andrew Huberman (weekly structure), Rhonda Patrick (HIIT/endurance balance), Chris Hemsworth (functional aesthetic)
- **Personalized to you** — onboarding captures age, weight, history, injuries, goals, strength maxes, and running benchmark. Load prescriptions become % of your estimated 1RM. Risky lifts get auto-swapped if they conflict with an injury you mention. Cardio paces come from your running pace.
- **Auto-generated warmup** every session — lower back, hips, shoulders (configurable)
- **Local-first** — all data lives on your device (IndexedDB). No accounts, no cloud, no tracking
- **Install as an app** on iPhone or Mac — works offline once installed

## Running it on your computer

You need **Node.js** installed (you have v24 — perfect). In Terminal:

```bash
cd ~/fitness-app
npm run dev
```

Open **http://localhost:3737** in any browser.

To stop: `Ctrl-C` in the terminal.

## Installing it on your iPhone (no App Store)

While the dev server is running on your Mac, find your Mac's local IP:

```bash
ipconfig getifaddr en0
```

That gives you something like `192.168.1.208`. Then on your iPhone (same WiFi):

1. Open Safari → go to `http://192.168.1.208:3737`
2. Tap the **Share** button (square with up arrow)
3. Scroll down → **Add to Home Screen**
4. Tap **Add**

Now Forge has its own icon on your home screen and opens full-screen like a real app.

> Note: your Mac needs to be on for the iPhone version to work. To make it work anywhere, deploy it (see below).

## Deploying for real (so it works everywhere)

The free way — push to GitHub, then Vercel auto-deploys:

1. Create a free [GitHub](https://github.com) account if you don't have one.
2. Make a new empty repo there called `fitness-app`.
3. In Terminal:
   ```bash
   cd ~/fitness-app
   git remote add origin https://github.com/YOUR-USERNAME/fitness-app.git
   git add -A
   git commit -m "Initial commit"
   git push -u origin main
   ```
4. Go to [vercel.com/new](https://vercel.com/new), sign in with GitHub, import the repo, click Deploy.
5. You get a URL like `forge-yourname.vercel.app`. Open it on your iPhone, Add to Home Screen.

Now it works anywhere, on any device.

## Roadmap (what's not in MVP yet)

- Weekly plan view (drag categories onto days)
- Multi-week programs (e.g. "8-week hypertrophy block") with auto-progression
- Claude-powered variation: "give me a leg day that doesn't use a barbell"
- Apple Health / Strava sync
- Sharing programs with friends

## Tech stack (for the curious)

- **Next.js 16** (React 19) + **TypeScript** + **Tailwind CSS 4**
- **Dexie** wrapping IndexedDB for local storage
- **PWA** (web manifest + Apple meta) — installable, works offline after first load
- Deterministic seeded generator — same date + category = same workout (until you reroll)

## Project structure

```
src/
  app/                       # pages (Next.js App Router)
    page.tsx                 # home — today's session
    workout/                 # category picker
    workout/[category]/      # generated workout + logging UI
    history/                 # past sessions
    settings/                # profile, warmup focus, units
    manifest.ts              # PWA manifest
    icon.tsx                 # app icon (generated)
  components/
    BottomNav.tsx
    SetLogger.tsx
  lib/
    types.ts                 # all data types
    db.ts                    # Dexie schema
    generator.ts             # workout generation logic
    data/
      exercises.ts           # exercise library (~90 exercises)
      templates.ts           # workout templates per category
```

Want a new exercise? Add it to `src/lib/data/exercises.ts`.
Want a new workout template? Add it to `src/lib/data/templates.ts`.
