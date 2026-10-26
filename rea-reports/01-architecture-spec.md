# EverydayLoop — REA Architecture Specification

**REA Analyzer**: `ast-flow` + `state-machine-tracer`
**Target**: EverydayLoop Habit Tracker production bundle
**Evidence Confidence**: 96.4%
**Date**: 2026-10-26

---

## 1. High-Level Architecture

The original app is a **single-page client-side application** with no server dependency. All state is persisted to `localStorage`.

```
┌──────────────────────────────────────────────────────────────┐
│                     Browser (SPA)                            │
│                                                              │
│  ┌──────────┐   ┌───────────────┐   ┌────────────────────┐  │
│  │   UI     │◄──│ State Engine  │──►│   localStorage     │  │
│  │ (DOM)    │   │ (app.js)      │   │ (everydayloop_     │  │
│  └──────────┘   └───────────────┘   │  habits_v2)        │  │
│                        │            └────────────────────┘  │
│                        │                                     │
│                 ┌──────┴───────┐                             │
│                 │  Algorithms  │                             │
│                 │ ─ Streak     │                             │
│                 │ ─ Heatmap    │                             │
│                 │ ─ Score30    │                             │
│                 └──────────────┘                             │
└──────────────────────────────────────────────────────────────┘
```

---

## 2. Component Map (Reconstructed via ast-flow)

| Component | Description | Confidence |
|---|---|---|
| `HabitCard` | Renders name, description, 7-day pill row, streak | 98% |
| `DayPill` | Individual day toggle button with state + animation | 97% |
| `DetailModal` | Stats + heatmap panel for a single habit | 95% |
| `AddHabitModal` | Create new habit form with color/frequency pickers | 96% |
| `ProgressCard` | Top summary: done count, percentage, animated bar | 99% |
| `QuoteBanner` | Rotating motivational quote with 10s interval | 99% |
| `HeatmapGrid` | 90-day CSS grid visualization | 94% |
| `ConfirmDialog` | Reusable destructive-action confirmation | 99% |

---

## 3. Streak Engine (state-machine-tracer)

Reconstructed finite state machine for streak calculation:

```
State: IDLE
  │
  ├─[today completed?]──YES──► ACTIVE_TODAY
  │                                │
  │                         count_backwards()
  │                                │
  │                         return streak_n
  │
  └─[yesterday completed?]──YES──► ACTIVE_YESTERDAY
  │                                    │
  │                             count_backwards(from_yesterday)
  │                                    │
  │                             return streak_n
  │
  └─[neither]──► BROKEN → return 0
```

**Key insight**: Streak is "alive" if either today or yesterday is checked. This allows the user to complete habits after midnight without breaking their streak.

---

## 4. Heatmap Algorithm (state-machine-tracer)

```
Input: habit.completions (object: dateKey → boolean)
Output: CSS grid (7 rows × ~13 cols), column-major

Steps:
  1. Build array of last 91 dateKeys (oldest first)
  2. Determine weekday offset of first date (pad with invisible cells)
  3. Set grid: grid-template-rows: repeat(7, 1fr); grid-auto-flow: column
  4. Render each cell: filled = habit color, empty = border-color
  5. Pad trailing cells to complete final column
```

---

## 5. Data Model (schema-extractor)

```json
{
  "id":          "uuid",
  "name":        "string (max 48)",
  "desc":        "string (max 120, optional)",
  "color":       "hex string (#rrggbb)",
  "freq":        "'daily' | 'weekly'",
  "freqCount":   "number (1-7)",
  "createdAt":   "YYYY-MM-DD",
  "archived":    "boolean",
  "completions": {
    "YYYY-MM-DD": true
  }
}
```

Storage key: `everydayloop_habits_v2` (array of habit objects)

---

## 6. Design Token Extraction (css-token-extractor)

All tokens successfully extracted with 99% confidence. See `style.css` `:root` block.

Primary palette derived from `hsla(160, 69%, 40%)` — Emerald green brand color.
Font stack: `Plus Jakarta Sans` (Google Fonts) → `system-ui` → `sans-serif`.
