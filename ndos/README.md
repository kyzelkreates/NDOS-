# NDOS — Neurodiversity Support & Daily Structure OS

> A personal support and organisation tool for ADHD-style attention support,
> autistic-friendly routine structuring, and cognitive load reduction.
> **NOT a medical device. NOT a diagnostic tool.**

---

## What This Is

NDOS is a complete cognitive support operating system. It helps you:

- Structure your day without overwhelm
- Know exactly what to do next — always
- Build and follow flexible daily routines
- Track your energy, focus, and overwhelm in real-time
- Break large tasks into tiny, startable steps

---

## System Architecture

```
ndos/
├── index.html               ← App entry point (PWA-ready)
├── index.js                 ← Full public API barrel
│
├── core/                    ← Data models and storage (SSOT)
│   ├── storage.js           ← Single source of truth (localStorage SSOT)
│   ├── state.js             ← User state model (energy/focus/overwhelm)
│   ├── tasks.js             ← Task model (CRUD + micro-steps)
│   └── routines.js          ← Routine model (morning/midday/evening)
│
├── engine/                  ← Cognitive support engines
│   ├── cognitive-engine.js  ← Next-action generator + task reshaper
│   └── routine-engine.js    ← Routine stability + adaptive logic
│
├── ui/                      ← User interface
│   ├── ndos.css             ← Full design system (calm, accessible)
│   └── dashboard.js         ← Dashboard UI composer
│
└── pwa/                     ← Progressive Web App
    ├── manifest.json        ← PWA manifest
    └── sw.js                ← Service worker (offline-first)
```

---

## Core Data Models

### User State
```js
{
  energy_level:     0–10,
  focus_level:      0–10,
  overwhelm_level:  0–10,
  task_load:        "low" | "medium" | "high",
  sensory_load:     "low" | "medium" | "high",
  motivation_state: "starting" | "stuck" | "flowing" | "fatigued"
}
```

### Task
```js
{
  task_id, task_name, description,
  estimated_effort: "small" | "medium" | "large",
  cognitive_load:   "low" | "medium" | "high",
  status:           "not_started" | "in_progress" | "completed" | "paused",
  parent_id,        // set if this is a micro-step
  priority: 1|2|3
}
```

### Routine
```js
{
  morning_flow:      [{ step_id, label, duration_min, effort }],
  midday_reset:      [...],
  evening_shutdown:  [...]
}
```

---

## Cognitive Engine Rules

| Condition | Response |
|-----------|----------|
| `overwhelm_level > 7` | Reduce scope mode — 1 step at a time |
| `focus_level < 4` | Activation task (2–5 min starter) |
| `task_load=high` + `energy < 4` | Task reshaping into smaller steps |
| `motivation_state=stuck` | Reset sequence (hydrate → break → tiny step) |
| `motivation_state=fatigued` | Rest encouragement + evening shutdown |
| `motivation_state=flowing` | Protect flow — don't interrupt |

---

## Views

| View | Description |
|------|-------------|
| Today Focus Board | 3 priority tasks max + Start Now CTA |
| Routines | Morning / Midday / Evening blocks, adaptive |
| Reset / Calm Panel | Reset sequence + activation tasks + mood update |
| Settings | Clear tasks, about |

---

## Quick Start

```html
<!-- In your HTML -->
<link rel="stylesheet" href="ndos/ui/ndos.css" />
<div id="ndos-root"></div>

<script type="module">
  import { mountDashboard } from "./ndos/ui/dashboard.js";
  mountDashboard(document.getElementById("ndos-root"));
</script>
```

Or import the full API:
```js
import {
  getUserState, setUserState,
  createTask, getFocusTasks,
  evaluateState, getResetSequence,
  mountDashboard
} from "./ndos/index.js";
```

---

## Important Disclaimer

NDOS is a personal productivity and self-organisation tool.

- It is **NOT** a medical device
- It does **NOT** diagnose ADHD, autism, or any other condition
- It does **NOT** provide clinical treatment or therapy
- It does **NOT** replace professional support

For clinical support, please speak to a qualified professional.

---

## Architecture Contract

NDOS inherits the BCO architecture contract:

1. **One global state store** — `storage.js` — no duplicates
2. **Everything is an event** — state changes only after event processing
3. **Storage is always abstracted** — no direct localStorage calls from UI
4. **UI is read-only** — renders state, dispatches events only
5. **Engines are non-destructive** — suggest only, never force
6. **No LMS/training logic** — fully replaced with cognitive support model
