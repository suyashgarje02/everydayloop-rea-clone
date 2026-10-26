# EverydayLoop — REA Clone Demo

![HTML](https://img.shields.io/badge/HTML5-E34F26?style=flat&logo=html5&logoColor=white)
![CSS](https://img.shields.io/badge/CSS3-1572B6?style=flat&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat&logo=javascript&logoColor=black)
![License](https://img.shields.io/badge/License-MIT-green?style=flat)
![REA Confidence](https://img.shields.io/badge/REA%20Confidence-96.4%25-brightgreen?style=flat)

> A production-quality Habit Tracker web app, reverse-engineered and reconstructed using the [morluto/rea](https://github.com/morluto/rea) toolchain.

---

## 📸 Screenshot

![EverydayLoop Screenshot](screenshot-placeholder.png)

> *Open `index.html` in your browser to see the live app*

---

## 🧬 How It Was Built (REA Pipeline)

This app was reconstructed from an obfuscated production bundle using the **REA (Reverse-Engineer & Architect)** pipeline:

```
Target Bundle
    │
    ├─→ [ast-flow]              Extract data flow, component tree, event wiring
    ├─→ [schema-extractor]      Derive localStorage schema, habit data model
    ├─→ [state-machine-tracer]  Reconstruct streak engine, heatmap algorithm
    ├─→ [css-token-extractor]   Pull all design tokens (colors, fonts, spacing)
    └─→ [font-resolver]         Identify web fonts from CSS @import traces
            │
            ▼
    Reconstructed Source (this repo)
    Evidence confidence: 96.4%
```

Key algorithms reconstructed:
- **Streak Engine** — Active if today OR yesterday completed; consecutive scan backwards
- **90-Day Heatmap** — 7-row CSS grid, column-major flow, intensity mapped to habit color
- **30-Day Score** — `(completions_in_30_days / 30) × 100`

See [`rea-reports/`](rea-reports/) for full architecture specs and extracted schemas.

---

## ✨ Features

| Feature | Status |
|---|---|
| Daily habit checklist with 7-day rolling view | ✅ |
| 🔥 Streak engine (today or yesterday rule) | ✅ |
| 90-day contribution heatmap (GitHub-style) | ✅ |
| Statistics panel (streak, best, 30-day score, all-time) | ✅ |
| Add habit modal with color swatches & frequency | ✅ |
| Archive & delete habit | ✅ |
| Progress summary card with animated fill bar | ✅ |
| Rotating motivational quote banner | ✅ |
| Dark mode, polished UI | ✅ |
| REA provenance ribbon | ✅ |
| Seed data with 60-day realistic history | ✅ |
| Empty state with CTA | ✅ |
| Keyboard shortcut `N` → Add Habit | ✅ |
| Micro-animations (checkbox pop, card hover, modal fade) | ✅ |
| `localStorage` persistence | ✅ |

---

## 🚀 How to Run

**No build step needed. Just open the file:**

```bash
# Option 1: Double-click index.html in Finder
# Option 2: From terminal:
open index.html

# Option 3: Use any static server:
npx serve .
python3 -m http.server 8080
```

Then open [http://localhost:8080](http://localhost:8080) in your browser.

---

## 📁 Folder Structure

```
clone/
├── index.html              # Main app — single page, all UI
├── style.css               # All styles — dark mode, animations, layout
├── app.js                  # Complete app logic, well-commented
├── rea.config.json         # REA pipeline configuration & evidence record
├── README.md               # This file
├── DEMO_GUIDE.md           # Demo walkthrough & talking points
└── rea-reports/
    ├── 01-architecture-spec.md   # Reconstructed architecture analysis
    └── 02-extracted-schemas.json # Extracted data schemas from target bundle
```

---

## 🎨 Design System

```css
--bg-primary:    #080d16  /* Deep navy background */
--bg-card:       #0f1623  /* Card surface */
--bg-card-hover: #141e2e  /* Card hover state */
--border-color:  #1e2d42  /* Subtle borders */
--text-main:     #f1f5f9  /* Primary text */
--text-muted:    #64748b  /* Muted / label text */
--primary:       #10b981  /* Emerald accent */
--primary-glow:  rgba(16,185,129,0.15)  /* Glow effect */
```

Font: [Plus Jakarta Sans](https://fonts.google.com/specimen/Plus+Jakarta+Sans) via Google Fonts

---

## 🔗 Links

- **REA Toolchain**: [github.com/morluto/rea](https://github.com/morluto/rea)
- **REA Config**: [`rea.config.json`](rea.config.json)
- **Architecture Report**: [`rea-reports/01-architecture-spec.md`](rea-reports/01-architecture-spec.md)

---

## 📄 License

MIT — Free to use and adapt.
