# EverydayLoop — Demo Guide

> Use this guide when walking through the app live with an audience or stakeholder.

---

## 🎬 Demo Flow (5-Minute Walkthrough)

### 1. First Impression (30s)
- Open `index.html` — note the **REA provenance ribbon** at the top (links to `morluto/rea`)
- Point out the **dark UI** with polished typography and the sidebar layout
- Read aloud the rotating motivational quote

### 2. Progress Card (30s)
- Show the **"X of Y habits done today"** card at the top
- Watch the **animated green fill bar** load on startup
- Explain: *"This gives instant motivation before even opening a habit"*

### 3. Habit Card — Toggle a Day (1 min)
- Click a **day pill** on any habit card — see the **pop animation** and checkmark appear
- Toggle it back off — watch it reset smoothly
- Point out the **🔥 streak counter** updating in real time

### 4. Detail Modal — Stats & Heatmap (1.5 min)
- Click anywhere on a **habit card** (not a day pill) to open the detail modal
- Highlight the **4 stats**: Current Streak, Best Streak, 30-Day Score, All-Time
- Scroll down to the **90-day heatmap** — explain it's GitHub-style, color matches the habit
- *"This was the hardest part to reconstruct — the REA `state-machine-tracer` helped identify the grid algorithm"*

### 5. Add a New Habit (1 min)
- Press **N** on the keyboard — modal opens with a keyboard shortcut
- Fill in a name, pick a **color swatch**, choose frequency
- Hit **Create Habit** — watch it appear instantly at the top of the list

### 6. Archive / Delete (30s)
- Open a habit detail, show the **Archive** and **Delete** buttons in the footer
- Demonstrate the **confirmation dialog** before destructive action

---

## 💬 Talking Points

| Topic | What to Say |
|---|---|
| REA ribbon | *"The ribbon proves provenance — which bundle this was reconstructed from and with what confidence"* |
| Seed data | *"First-load seeds 4 demo habits with 60 days of history so heatmaps look impressive immediately"* |
| localStorage | *"Zero backend — all data lives in the browser, loads instantly"* |
| Code quality | *"Every algorithm is commented with its REA source — `ast-flow`, `state-machine-tracer`, etc."* |
| Streak engine | *"Streak is active if today OR yesterday is done — this matches the original app's logic exactly"* |

---

## 🛠️ Technical Q&A

**Q: How is the streak calculated?**
> Walk backwards from today. If today or yesterday is done, count consecutive completed days.

**Q: What's the 30-Day Score formula?**
> `(completions in last 30 days / 30) × 100` — capped at 100%.

**Q: Why no framework?**
> Pure HTML + CSS + Vanilla JS means zero build step, zero dependencies, opens by double-clicking. The REA pipeline reconstructed it in its simplest possible form.

**Q: Where is data stored?**
> `localStorage` under the key `everydayloop_habits_v2`. Clear it to reset to seed data.
