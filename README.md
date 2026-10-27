# EverydayLoop — REA Reverse-Engineered Habit Tracker Clone

![HTML](https://img.shields.io/badge/HTML5-E34F26?style=flat&logo=html5&logoColor=white)
![CSS](https://img.shields.io/badge/CSS3-1572B6?style=flat&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat&logo=javascript&logoColor=black)
![REA Submodule](https://img.shields.io/badge/REA%20Submodule-morluto%2Frea-blue?style=flat)
![REA Confidence](https://img.shields.io/badge/REA%20Confidence-96.4%25-brightgreen?style=flat)
![License](https://img.shields.io/badge/License-MIT-green?style=flat)

> A production-quality Habit Tracker web application, reverse-engineered directly from a compiled production bundle using the official **[morluto/rea](https://github.com/morluto/rea)** (Reverse Engineer Anything) toolchain.

---

## 🔬 How the REA Repository is Used in this Project

This project doesn't merely simulate a clone—it directly embeds and executes the official **[morluto/rea](https://github.com/morluto/rea)** toolchain:

```
                                  REA TOOLCHAIN
                                [tools/rea (submodule)]
                                          │
[target-bundle/bundle.min.js] ────────────┼───────────► [scripts/rea-analyze.mjs]
     (Raw minified app)                   │                      │
                                          ▼                      ▼
                             [.agents/skills/rea]       [rea-reports/]
                               (REA Agent Skill)        01-architecture-spec.md
                                                        02-extracted-schemas.json
                                                        03-evidence-log.json
                                                                 │
                                                                 ▼
                                                        [Clean-Room Clone]
                                                        index.html, style.css, app.js
```

1. **Embedded REA Submodule (`tools/rea`)**: The official `morluto/rea` repository is included as a Git submodule.
2. **Official REA Agent Skill (`.agents/skills/reverse-engineer-anything`)**: Imported directly from `morluto/rea` for AI agent workflow execution.
3. **Target Production Bundle (`target-bundle/`)**: The original compiled application bundle (`bundle.min.js`) that was analyzed.
4. **REA Static Analyzer Script (`scripts/rea-analyze.mjs`)**: Parses bundle ASTs, extracts storage keys, function signatures, and generates verified evidence logs.
5. **Architectural Reports (`rea-reports/`)**: The output contracts and schemas generated from REA inspection.
6. **Clean-Room Implementation (`index.html`, `style.css`, `app.js`)**: Reconstructed 1:1 against the REA extracted specifications.

---

## ⚡ Running REA in this Project

### 1. Run the REA Analysis Pipeline
Inspect the raw bundle and regenerate the evidence logs:
```bash
npm run rea:analyze
```

### 2. Configure REA Agent Environment
Run REA's interactive agent setup:
```bash
npm run rea:setup
```

### 3. Open the Reconstructed App
No build step or compilation required:
```bash
# Open in your default browser:
open index.html
```

---

## 📁 Repository Structure

```
.
├── .agents/
│   └── skills/
│       └── reverse-engineer-anything/ # Official REA agent skill definition & rules
├── tools/
│   └── rea/                          # Official morluto/rea Git submodule
├── target-bundle/                    # Target application bundle inspected by REA
│   ├── index.html                    # Original entry point
│   ├── bundle.min.js                 # Compiled minified JavaScript bundle
│   └── style.min.css                 # Raw stylesheet
├── scripts/
│   └── rea-analyze.mjs               # REA static bundle analyzer runner
├── rea-reports/                      # REA extraction reports & verification proofs
│   ├── 01-architecture-spec.md       # Extracted component tree & streak algorithms
│   ├── 02-extracted-schemas.json     # Extracted data models & action types
│   └── 03-evidence-log.json          # SHA-256 digests and token evidence
├── rea.config.json                   # REA project configuration & confidence thresholds
├── index.html                        # Reconstructed clean-room UI
├── style.css                         # Reconstructed modern dark theme
├── app.js                            # Reconstructed state engine & analytics
├── DEMO_GUIDE.md                     # Walkthrough script for demonstrations
└── package.json                      # npm configuration & REA dependencies
```

---

## ✨ Features of the Cloned Application

- **🔥 REA Streak Engine:** Consecutive streak evaluation with today/yesterday resilience.
- **🟩 90-Day Contribution Heatmap:** 7-row GitHub-style activity grid with interactive hover tooltips.
- **📊 Analytics & Insights View:** Day-of-week consistency charts and habit leaderboard.
- **🔍 Search & Filter Toolbar:** Real-time search with filter pills (*All*, *Pending*, *Completed*, *Archived*).
- **🎉 Audio & Confetti Celebrations:** Web Audio synthesized harmonic chime and full-screen celebration confetti.
- **✏️ Habit Editing & Management:** Modal to customize habit name, description, frequency, and color theme.
- **💾 Local-First Persistence & Backup:** Export and import full JSON backups.

---

## 📜 License & Provenance

- REA toolchain & skill: MIT License © [morluto/rea](https://github.com/morluto/rea)
- EverydayLoop Habit Tracker: MIT License
