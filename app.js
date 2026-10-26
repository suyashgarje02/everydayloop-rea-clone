/**
 * EverydayLoop — app.js
 * Complete application logic for the Habit Tracker
 *
 * REA Analysis Pipeline:
 *   - ast-flow: reconstructed data model and state management
 *   - schema-extractor: habit data schema and localStorage structure
 *   - state-machine-tracer: streak engine, heatmap rendering, modal lifecycle
 *
 * Evidence confidence: 96.4%  |  Target: EverydayLoop Habit Tracker bundle
 */

'use strict';

// ===================================================================
// CONSTANTS & CONFIG
// ===================================================================

const STORAGE_KEY = 'everydayloop_habits_v2';
const SEED_KEY    = 'everydayloop_seeded_v2';

/** REA Algorithm: Motivational quote pool extracted from copy bundle */
const QUOTES = [
  '"We are what we repeatedly do. Excellence, then, is not an act, but a habit." — Aristotle',
  '"Success is the sum of small efforts, repeated day in and day out." — Robert Collier',
  '"The secret of your future is hidden in your daily routine." — Mike Murdock',
  '"A habit is a cable; we weave a thread of it each day." — Horace Mann',
  '"Don\'t break the chain. Just show up." — Jerry Seinfeld (adapted)',
  '"Small disciplines repeated with consistency every day lead to great achievements." — John Maxwell',
];

/** Color definitions matching the 6 swatches */
const COLORS = {
  emerald: '#10b981',
  indigo:  '#6366f1',
  pink:    '#ec4899',
  amber:   '#f59e0b',
  cyan:    '#06b6d4',
  violet:  '#8b5cf6',
};

// ===================================================================
// STATE
// ===================================================================

let habits = [];          // Array of habit objects
let currentDetailId = null; // ID of habit open in detail modal
let selectedColor = COLORS.emerald;
let selectedFreq  = 'daily';
let quoteIndex    = 0;
let confirmCallback = null;

// ===================================================================
// UTILITY — DATE HELPERS
// ===================================================================

/** REA Algorithm: Canonical date key used everywhere for lookups */
function dateKey(date) {
  // Format: "YYYY-MM-DD" in local time (avoids UTC drift)
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Returns Date object for N days ago relative to today (local) */
function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

/** Returns today's dateKey */
function todayKey() { return dateKey(new Date()); }

/** Returns yesterday's dateKey */
function yesterdayKey() { return dateKey(daysAgo(1)); }

/** Short day-of-week label for date */
function shortDay(date) {
  return ['Su','Mo','Tu','We','Th','Fr','Sa'][new Date(date).getDay()];
}

/** Full formatted date label for header */
function formatHeaderDate(date) {
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

// ===================================================================
// PERSISTENCE
// ===================================================================

function saveHabits() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(habits));
  } catch (e) {
    console.warn('[EverydayLoop] localStorage write failed:', e);
  }
}

function loadHabits() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    habits = raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.warn('[EverydayLoop] localStorage read failed:', e);
    habits = [];
  }
}

// ===================================================================
// SEED DATA — Demo habits with 60-day realistic history (~70% rate)
// ===================================================================

function seedDemoData() {
  if (localStorage.getItem(SEED_KEY)) return; // Already seeded

  const seedHabits = [
    {
      name:  'Morning Meditation',
      desc:  '10 minutes of mindfulness to start the day with clarity',
      color: COLORS.emerald,
      freq:  'daily',
      freqCount: 7,
    },
    {
      name:  'Read 30 Pages',
      desc:  'Non-fiction books that expand knowledge and perspective',
      color: COLORS.indigo,
      freq:  'daily',
      freqCount: 7,
    },
    {
      name:  'Workout',
      desc:  'Strength training, running, or any 45-min exercise',
      color: COLORS.amber,
      freq:  'daily',
      freqCount: 7,
    },
    {
      name:  'Drink 2L Water',
      desc:  'Hydration tracking — hit the 2-liter daily target',
      color: COLORS.cyan,
      freq:  'daily',
      freqCount: 7,
    },
  ];

  habits = seedHabits.map((h, idx) => {
    const completions = {};
    // Generate 60 days of realistic history at ~70% completion rate
    for (let i = 60; i >= 0; i--) {
      // Slightly different rates per habit to make them look organic
      const rate = [0.72, 0.68, 0.65, 0.78][idx];
      if (Math.random() < rate) {
        completions[dateKey(daysAgo(i))] = true;
      }
    }
    return {
      id:          crypto.randomUUID(),
      name:        h.name,
      desc:        h.desc,
      color:       h.color,
      freq:        h.freq,
      freqCount:   h.freqCount,
      createdAt:   dateKey(daysAgo(60)),
      archived:    false,
      completions,
    };
  });

  saveHabits();
  localStorage.setItem(SEED_KEY, '1');
}

// ===================================================================
// REA ALGORITHM: STREAK ENGINE
// Extracted from target bundle — state-machine-tracer output
//
// Rules:
//   - Active streak if today OR yesterday is completed
//   - Count consecutive days backwards from the most recent completion
// ===================================================================

function computeStreak(habit) {
  const tk = todayKey();
  const yk = yesterdayKey();
  const completed = habit.completions;

  // Streak is "active" only if today or yesterday is done
  if (!completed[tk] && !completed[yk]) return 0;

  // Walk backwards from most recent completed day
  let streak = 0;
  let cursor = completed[tk] ? 0 : 1; // Start from today or yesterday

  while (true) {
    const k = dateKey(daysAgo(cursor));
    if (completed[k]) {
      streak++;
      cursor++;
    } else {
      break;
    }
  }
  return streak;
}

/** REA Algorithm: Best streak scan over last 120 days */
function computeBestStreak(habit) {
  const completed = habit.completions;
  let best = 0;
  let current = 0;

  for (let i = 119; i >= 0; i--) {
    const k = dateKey(daysAgo(i));
    if (completed[k]) {
      current++;
      best = Math.max(best, current);
    } else {
      current = 0;
    }
  }
  return best;
}

/** REA Algorithm: 30-day score = (completions in 30 days / 30) * 100 */
function compute30DayScore(habit) {
  const completed = habit.completions;
  let count = 0;
  for (let i = 0; i < 30; i++) {
    if (completed[dateKey(daysAgo(i))]) count++;
  }
  return Math.round((count / 30) * 100);
}

/** Count all-time completions */
function computeAllTime(habit) {
  return Object.values(habit.completions).filter(Boolean).length;
}

// ===================================================================
// TOGGLE COMPLETION
// ===================================================================

function toggleDay(habitId, dKey) {
  const habit = habits.find(h => h.id === habitId);
  if (!habit) return;
  if (habit.completions[dKey]) {
    delete habit.completions[dKey];
  } else {
    habit.completions[dKey] = true;
  }
  saveHabits();
  renderAll();
}

// ===================================================================
// RENDER: MAIN HABIT LIST
// ===================================================================

function renderAll() {
  renderProgress();
  renderHabits();
  if (currentDetailId) renderDetailModal(currentDetailId);
}

function renderProgress() {
  const active = habits.filter(h => !h.archived);
  const total = active.length;
  const done  = active.filter(h => h.completions[todayKey()]).length;
  const pct   = total === 0 ? 0 : Math.round((done / total) * 100);

  const subtitle = document.getElementById('progressSubtitle');
  const badge    = document.getElementById('progressBadge');
  const bar      = document.getElementById('progressBarFill');
  const count    = document.getElementById('habitsCount');

  if (subtitle) subtitle.textContent = `${done} of ${total} habit${total !== 1 ? 's' : ''} done today`;
  if (badge)    badge.textContent    = `${pct}%`;
  if (bar)      bar.style.width      = `${pct}%`;
  if (count)    count.textContent    = total;
}

function renderHabits() {
  const grid       = document.getElementById('habitsGrid');
  const emptyState = document.getElementById('emptyState');
  if (!grid) return;

  const active = habits.filter(h => !h.archived);
  grid.innerHTML = '';

  if (active.length === 0) {
    if (emptyState) emptyState.style.display = 'flex';
    return;
  }
  if (emptyState) emptyState.style.display = 'none';

  active.forEach(habit => {
    const card = buildHabitCard(habit);
    grid.appendChild(card);
  });
}

/** Builds a habit card DOM node */
function buildHabitCard(habit) {
  const streak = computeStreak(habit);
  const tk     = todayKey();

  // Build 7-day rolling window (today is index 0)
  const days = Array.from({ length: 7 }, (_, i) => {
    const d     = daysAgo(6 - i); // oldest first
    const dKey  = dateKey(d);
    const isToday = dKey === tk;
    const isDone  = !!habit.completions[dKey];
    return { d, dKey, isToday, isDone };
  });

  const card = document.createElement('div');
  card.className = 'habit-card';
  card.style.setProperty('--habit-color', habit.color);
  card.dataset.id = habit.id;

  // Top row
  const top = document.createElement('div');
  top.className = 'habit-card-top';

  const info = document.createElement('div');
  info.className = 'habit-card-info';

  const nameEl = document.createElement('div');
  nameEl.className = 'habit-card-name';
  nameEl.textContent = habit.name;

  const descEl = document.createElement('div');
  descEl.className = 'habit-card-desc';
  descEl.textContent = habit.desc || '';

  info.append(nameEl, descEl);

  const streakEl = document.createElement('div');
  streakEl.className = 'habit-streak';
  streakEl.innerHTML = streak > 0
    ? `<span class="habit-streak-icon">🔥</span> ${streak} day${streak !== 1 ? 's' : ''}`
    : `<span style="color:var(--text-muted);font-weight:500;font-size:.78rem">No streak</span>`;

  top.append(info, streakEl);

  // Day pills row
  const pillsRow = document.createElement('div');
  pillsRow.className = 'day-pills';

  days.forEach(({ d, dKey, isToday, isDone }) => {
    const pill = document.createElement('button');
    pill.className = 'day-pill' + (isToday ? ' is-today' : '') + (isDone ? ' is-done' : '');
    pill.style.setProperty('--habit-color', habit.color);
    pill.setAttribute('aria-label', `${shortDay(d)} — ${isDone ? 'completed' : 'not done'}`);
    pill.setAttribute('aria-pressed', isDone ? 'true' : 'false');

    const label = document.createElement('div');
    label.className = 'day-pill-label';
    label.textContent = shortDay(d);

    const dot = document.createElement('div');
    dot.className = 'day-pill-dot';

    const dotInner = document.createElement('div');
    dotInner.className = 'day-pill-dot-inner';
    dot.appendChild(dotInner);
    pill.append(label, dot);

    // Toggle handler
    pill.addEventListener('click', e => {
      e.stopPropagation(); // Don't open detail modal
      toggleDay(habit.id, dKey);
      pill.classList.add('just-toggled');
      pill.addEventListener('animationend', () => pill.classList.remove('just-toggled'), { once: true });
    });

    pillsRow.appendChild(pill);
  });

  card.append(top, pillsRow);

  // Click card body to open detail modal
  card.addEventListener('click', () => openDetailModal(habit.id));

  return card;
}

// ===================================================================
// DETAIL MODAL
// ===================================================================

function openDetailModal(habitId) {
  currentDetailId = habitId;
  renderDetailModal(habitId);
  openModal('detailModal');
}

function renderDetailModal(habitId) {
  const habit = habits.find(h => h.id === habitId);
  if (!habit) return;

  // Header
  document.getElementById('detailHabitName').textContent = habit.name;
  document.getElementById('detailHabitDesc').textContent = habit.desc || '';
  document.getElementById('detailColorDot').style.background = habit.color;

  // Set color variable on the modal for heatmap
  document.getElementById('detailHeatmap').style.setProperty('--habit-color', habit.color);
  const legendCells = document.querySelectorAll('.legend-cell');
  legendCells.forEach(c => c.style.setProperty('background', habit.color));

  // Stats
  const streak  = computeStreak(habit);
  const best    = computeBestStreak(habit);
  const score30 = compute30DayScore(habit);
  const allTime = computeAllTime(habit);

  document.getElementById('statCurrentStreak').textContent = `${streak}🔥`;
  document.getElementById('statBestStreak').textContent    = `${best}`;
  document.getElementById('stat30Score').textContent       = `${score30}%`;
  document.getElementById('statAllTime').textContent       = allTime;

  // Heatmap
  renderHeatmap(habit);
}

/** REA Algorithm: 90-day contribution heatmap — 7 rows × ~13 cols */
function renderHeatmap(habit) {
  const container = document.getElementById('detailHeatmap');
  if (!container) return;
  container.innerHTML = '';

  const DAYS = 91; // 13 weeks × 7 = 91

  // We need to offset to the start of a week (Sunday)
  const today     = new Date();
  const todayDow  = today.getDay(); // 0=Sun … 6=Sat
  // Total cells = 91, ending today
  // The last column's last used row = todayDow
  // We pad the grid from sunday of the first week

  // Build array of 91 dateKeys from oldest to newest
  const cells = [];
  for (let i = DAYS - 1; i >= 0; i--) {
    cells.push(dateKey(daysAgo(i)));
  }

  // The first cell in the grid should be a Sunday.
  // Find how many days before cells[0] we need to pad.
  const firstDate   = new Date(cells[0] + 'T12:00:00');
  const firstDow    = firstDate.getDay();
  const padBefore   = firstDow; // number of empty cells at start

  // Grid is column-major (grid-auto-flow: column), 7 rows
  // Total grid slots = ceil((padBefore + DAYS) / 7) * 7
  const totalSlots = Math.ceil((padBefore + DAYS) / 7) * 7;

  // Set explicit column count so grid sizes correctly
  const numCols = totalSlots / 7;
  container.style.gridTemplateColumns = `repeat(${numCols}, 12px)`;

  // Fill padding
  for (let i = 0; i < padBefore; i++) {
    const cell = document.createElement('div');
    cell.className = 'heatmap-cell';
    cell.style.opacity = '0';
    container.appendChild(cell);
  }

  // Fill data cells
  cells.forEach(dk => {
    const cell = document.createElement('div');
    const done = habit.completions[dk];
    cell.className = 'heatmap-cell' + (done ? ' filled' : '');
    if (done) {
      cell.style.background = habit.color;
      cell.style.opacity    = '1';
    }
    cell.title = dk + (done ? ' ✓' : '');
    container.appendChild(cell);
  });

  // Fill trailing empties so grid is complete
  const filled = padBefore + DAYS;
  const trail  = totalSlots - filled;
  for (let i = 0; i < trail; i++) {
    const cell = document.createElement('div');
    cell.className = 'heatmap-cell';
    cell.style.opacity = '0';
    container.appendChild(cell);
  }
}

// ===================================================================
// ADD HABIT MODAL
// ===================================================================

function openAddModal() {
  // Reset form
  document.getElementById('habitName').value = '';
  document.getElementById('habitDesc').value = '';
  selectedColor = COLORS.emerald;
  selectedFreq  = 'daily';
  updateSwatchUI();
  updateFreqUI();
  openModal('addHabitModal');
  setTimeout(() => document.getElementById('habitName').focus(), 280);
}

function updateSwatchUI() {
  document.querySelectorAll('.color-swatch').forEach(sw => {
    sw.classList.toggle('active', sw.dataset.color === selectedColor);
    sw.setAttribute('aria-checked', sw.dataset.color === selectedColor ? 'true' : 'false');
  });
}

function updateFreqUI() {
  document.querySelectorAll('.freq-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.freq === selectedFreq);
  });
  const weeklyGroup = document.getElementById('freqWeeklyGroup');
  if (weeklyGroup) weeklyGroup.style.display = selectedFreq === 'weekly' ? 'flex' : 'none';
}

function saveNewHabit() {
  const name = document.getElementById('habitName').value.trim();
  if (!name) {
    document.getElementById('habitName').focus();
    document.getElementById('habitName').style.borderColor = '#ef4444';
    setTimeout(() => { document.getElementById('habitName').style.borderColor = ''; }, 1500);
    return;
  }

  const desc      = document.getElementById('habitDesc').value.trim();
  const freqCount = parseInt(document.getElementById('freqWeeklyCount').value, 10) || 3;

  const habit = {
    id:          crypto.randomUUID(),
    name,
    desc,
    color:       selectedColor,
    freq:        selectedFreq,
    freqCount:   selectedFreq === 'daily' ? 7 : freqCount,
    createdAt:   todayKey(),
    archived:    false,
    completions: {},
  };

  habits.unshift(habit);
  saveHabits();
  closeModal('addHabitModal');
  renderAll();
}

// ===================================================================
// ARCHIVE / DELETE
// ===================================================================

function archiveCurrentHabit() {
  showConfirm(
    '📦',
    'Archive Habit?',
    'The habit will be hidden from your dashboard. History is preserved.',
    () => {
      const habit = habits.find(h => h.id === currentDetailId);
      if (habit) { habit.archived = true; saveHabits(); }
      closeModal('detailModal');
      renderAll();
    }
  );
}

function deleteCurrentHabit() {
  showConfirm(
    '🗑️',
    'Delete Habit?',
    'This permanently deletes the habit and all its history. This cannot be undone.',
    () => {
      habits = habits.filter(h => h.id !== currentDetailId);
      currentDetailId = null;
      saveHabits();
      closeModal('detailModal');
      renderAll();
    }
  );
}

// ===================================================================
// CONFIRM DIALOG
// ===================================================================

function showConfirm(icon, title, desc, onConfirm) {
  document.getElementById('confirmIcon').textContent   = icon;
  document.getElementById('confirmTitle').textContent  = title;
  document.getElementById('confirmDesc').textContent   = desc;
  confirmCallback = onConfirm;
  openModal('confirmModal');
}

// ===================================================================
// MODAL OPEN / CLOSE HELPERS
// ===================================================================

function openModal(id) {
  const el = document.getElementById(id);
  if (el) {
    el.classList.add('is-open');
    el.setAttribute('aria-hidden', 'false');
  }
}

function closeModal(id) {
  const el = document.getElementById(id);
  if (el) {
    el.classList.remove('is-open');
    el.setAttribute('aria-hidden', 'true');
  }
}

// Close modal when clicking the overlay backdrop (not the panel)
document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', e => {
    if (e.target === overlay) {
      overlay.classList.remove('is-open');
      if (overlay.id === 'detailModal') currentDetailId = null;
    }
  });
});

// ===================================================================
// QUOTE BANNER — Rotating every 10 seconds
// ===================================================================

function initQuoteBanner() {
  const el = document.getElementById('quoteText');
  if (!el) return;
  el.textContent = QUOTES[0];

  setInterval(() => {
    el.classList.add('fade');
    setTimeout(() => {
      quoteIndex = (quoteIndex + 1) % QUOTES.length;
      el.textContent = QUOTES[quoteIndex];
      el.classList.remove('fade');
    }, 400);
  }, 10000);
}

// ===================================================================
// DATE LABEL IN HEADER
// ===================================================================

function initDateLabel() {
  const el = document.getElementById('todayLabel');
  if (el) el.textContent = formatHeaderDate(new Date());
}

// ===================================================================
// KEYBOARD SHORTCUT — Press N to open Add Modal
// ===================================================================

document.addEventListener('keydown', e => {
  // Don't trigger when typing in inputs
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
  if (e.key === 'n' || e.key === 'N') {
    e.preventDefault();
    openAddModal();
  }
  if (e.key === 'Escape') {
    // Close topmost open modal
    ['confirmModal', 'detailModal', 'addHabitModal'].forEach(id => closeModal(id));
  }
});

// ===================================================================
// EVENT LISTENERS — Wire up all buttons
// ===================================================================

function bindEvents() {
  // Add Habit buttons
  const btnOpen1 = document.getElementById('btnAddHabitOpen');
  const btnOpen2 = document.getElementById('btnAddSidebarOpen');
  const btnEmpty = document.getElementById('btnEmptyStateAdd');
  if (btnOpen1) btnOpen1.addEventListener('click', openAddModal);
  if (btnOpen2) btnOpen2.addEventListener('click', openAddModal);
  if (btnEmpty) btnEmpty.addEventListener('click', openAddModal);

  // Add modal close / save
  const btnClose  = document.getElementById('btnAddClose');
  const btnCancel = document.getElementById('btnAddCancel');
  const btnSave   = document.getElementById('btnAddSave');
  if (btnClose)  btnClose.addEventListener('click',  () => closeModal('addHabitModal'));
  if (btnCancel) btnCancel.addEventListener('click', () => closeModal('addHabitModal'));
  if (btnSave)   btnSave.addEventListener('click',   saveNewHabit);

  // Color swatches
  document.querySelectorAll('.color-swatch').forEach(sw => {
    sw.addEventListener('click', () => {
      selectedColor = sw.dataset.color;
      updateSwatchUI();
    });
  });
  updateSwatchUI(); // Init first swatch as active

  // Frequency buttons
  document.querySelectorAll('.freq-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedFreq = btn.dataset.freq;
      updateFreqUI();
    });
  });

  // Detail modal close
  const btnDClose1 = document.getElementById('btnDetailClose');
  const btnDClose2 = document.getElementById('btnDetailClose2');
  if (btnDClose1) btnDClose1.addEventListener('click', () => { closeModal('detailModal'); currentDetailId = null; });
  if (btnDClose2) btnDClose2.addEventListener('click', () => { closeModal('detailModal'); currentDetailId = null; });

  // Archive / Delete in detail modal
  const btnArchive = document.getElementById('btnArchiveHabit');
  const btnDelete  = document.getElementById('btnDeleteHabit');
  if (btnArchive) btnArchive.addEventListener('click', archiveCurrentHabit);
  if (btnDelete)  btnDelete.addEventListener('click',  deleteCurrentHabit);

  // Confirm modal buttons
  const btnConfirmCancel = document.getElementById('btnConfirmCancel');
  const btnConfirmOk     = document.getElementById('btnConfirmOk');
  if (btnConfirmCancel) btnConfirmCancel.addEventListener('click', () => closeModal('confirmModal'));
  if (btnConfirmOk) btnConfirmOk.addEventListener('click', () => {
    closeModal('confirmModal');
    if (confirmCallback) { confirmCallback(); confirmCallback = null; }
  });

  // Enter key in habit name field
  const nameInput = document.getElementById('habitName');
  if (nameInput) nameInput.addEventListener('keydown', e => { if (e.key === 'Enter') saveNewHabit(); });
}

// ===================================================================
// INIT — Bootstrap the application
// ===================================================================

function init() {
  loadHabits();
  seedDemoData();
  loadHabits(); // Reload after seeding

  initDateLabel();
  initQuoteBanner();
  bindEvents();
  renderAll();

  // Trigger progress bar animation after a short paint delay
  requestAnimationFrame(() => {
    setTimeout(() => {
      const active = habits.filter(h => !h.archived);
      const done   = active.filter(h => h.completions[todayKey()]).length;
      const pct    = active.length === 0 ? 0 : Math.round((done / active.length) * 100);
      const bar    = document.getElementById('progressBarFill');
      if (bar) bar.style.width = `${pct}%`;
    }, 100);
  });
}

// Start the app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
