# EverydayLoop: REA Clone Demo Guide
**How to Demonstrate You Cloned the App Using `morluto/rea`**

This project demonstrates the end-to-end reverse engineering workflow using the official **[morluto/rea](https://github.com/morluto/rea)** repository.

---

## 🎤 5-Minute Presentation Script

### Step 1: Show the REA Submodule & Official Skill
* **Action:** Point to the file tree (`tools/rea` and `.agents/skills/reverse-engineer-anything/`).
* **Talking Point:**
  > *"To ensure we were using the real REA toolchain, we integrated the official `morluto/rea` repository directly as a Git submodule in `tools/rea` and imported the official `reverse-engineer-anything` agent skill."*

### Step 2: Show the Target Bundle Being Analyzed
* **Action:** Open `target-bundle/bundle.min.js`.
* **Talking Point:**
  > *"Here is the original compiled target application in `target-bundle/`. It's a minified production bundle where the business logic is bundled together."*

### Step 3: Run the REA Analysis Command
* **Action:** In your terminal, run:
  ```bash
  npm run rea:analyze
  ```
* **Talking Point:**
  > *"We run `npm run rea:analyze`. REA's static bundle analyzer inspects the target code, checks cryptographic digests, identifies function signatures, and recovers the state machine."*

### Step 4: Show the REA Reports
* **Action:** Open `rea-reports/01-architecture-spec.md` and `rea-reports/03-evidence-log.json`.
* **Talking Point:**
  > *"REA extracted the exact consecutive streak formula and storage schema with 96.4% confidence score, documented in `rea-reports/`."*

### Step 5: Demo the Resulting Application
* **Action:** Open `index.html` in your browser.
* **Demonstrate:**
  1. **Daily Checklist:** Click any day pill to mark a habit done. Hear the harmonic chime sound.
  2. **100% Completion:** Check all habits for today to trigger the celebration confetti.
  3. **90-Day Contribution Heatmap:** Click on any habit card to open the detail modal and hover over the heatmap cells.
  4. **Analytics Tab:** Click **Analytics** in the sidebar to show the weekly consistency pattern bar chart and habit leaderboard.
  5. **Settings Tab:** Click **Settings** to show the JSON export/backup feature and REA spec inspection box.
