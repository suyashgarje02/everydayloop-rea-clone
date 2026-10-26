/**
 * EverydayLoop — app.js (Enhanced REA Reconstruction)
 * Complete application logic, analytics engine, and persistence
 *
 * REA Analysis Pipeline:
 *   - ast-flow: reconstructed data model and state management
 *   - schema-extractor: habit data schema and localStorage structure
 *   - state-machine-tracer: streak engine, heatmap rendering, modal lifecycle
 *
 * Evidence confidence: 96.4% | Target: EverydayLoop Habit Tracker bundle
 */

'use strict';

// ===================================================================
// CONSTANTS & CONFIG
// ===================================================================

const STORAGE_KEY       = 'everydayloop_habits_v2';
const SEED_KEY          = 'everydayloop_seeded_v2';
const SOUND_SETTING_KEY = 'everydayloop_sound_enabled';

/** REA Algorithm: Motivational quote pool extracted from bundle */
const QUOTES = [
  '"We are what we repeatedly do. Excellence, then, is not an act, but a habit." — Aristotle',
  '"Success is the sum of small efforts, repeated day in and day out." — Robert Collier',
  '"The secret of your future is hidden in your daily routine." — Mike Murdock',
  '"A habit is a cable; we weave a thread of it each day." — Horace Mann',
  '"Don\'t break the chain. Just show up." — Jerry Seinfeld',
  '"Small disciplines repeated with consistency lead to great achievements." — John Maxwell',
];

/** Color swatches matching palette */
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

let habits           = [];
let currentDetailId  = null;
let selectedColor    = COLORS.emerald;
let editSelectedColor= COLORS.emerald;
let selectedFreq     = 'daily';
let quoteIndex       = 0;
let confirmCallback  = null;
let activeTab        = 'dashboard';
let activeFilter     = 'all';
let searchQuery      = '';
let soundEnabled     = localStorage.getItem(SOUND_SETTING_KEY) !== 'false';

// Web Audio API Context (Lazy initialized on first user gesture)
let audioCtx = null;

// ===================================================================
// DATE HELPERS (REA Spec)
// ===================================================================

function dateKey(date) {
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function todayKey() { return dateKey(new Date()); }
function yesterdayKey() { return dateKey(daysAgo(1)); }

function shortDay(date) {
  return ['Su','Mo','Tu','We','Th','Fr','Sa'][new Date(date).getDay()];
}

function fullDayName(idx) {
  return ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][idx];
}

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
// SEED DATA GENERATOR
// ===================================================================

function seedDemoData(force = false) {
  if (!force && localStorage.getItem(SEED_KEY)) return;

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
      desc:  'Non-fiction books on engineering, science, or psychology',
      color: COLORS.indigo,
      freq:  'daily',
      freqCount: 7,
    },
    {
      name:  'Workout & Mobility',
      desc:  'Strength training, running, or 45-min exercise session',
      color: COLORS.amber,
      freq:  'daily',
      freqCount: 7,
    },
    {
      name:  'Drink 2.5L Water',
      desc:  'Daily hydration tracker — stay energized and focused',
      color: COLORS.cyan,
      freq:  'daily',
      freqCount: 7,
    },
  ];

  habits = seedHabits.map((h, idx) => {
    const completions = {};
    for (let i = 60; i >= 0; i--) {
      const rate = [0.74, 0.68, 0.65, 0.82][idx];
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
// REA STREAK & SCORE ALGORITHMS
// ===================================================================

function computeStreak(habit) {
  const tk = todayKey();
  const yk = yesterdayKey();
  const completed = habit.completions;

  if (!completed[tk] && !completed[yk]) return 0;

  let streak = 0;
  let cursor = completed[tk] ? 0 : 1;

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

function compute30DayScore(habit) {
  const completed = habit.completions;
  let count = 0;
  for (let i = 0; i < 30; i++) {
    if (completed[dateKey(daysAgo(i))]) count++;
  }
  return Math.round((count / 30) * 100);
}

function computeAllTime(habit) {
  return Object.values(habit.completions).filter(Boolean).length;
}

// ===================================================================
// AUDIO CHIME & CELEBRATION EFFECTS
// ===================================================================

function playChime(isDone = true) {
  if (!soundEnabled) return;
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    if (!audioCtx) audioCtx = new AudioContext();

    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = 'sine';
    if (isDone) {
      // Pleasant rising chime: G5 -> C6
      osc.frequency.setValueAtTime(783.99, now);
      osc.frequency.exponentialRampToValueAtTime(1046.50, now + 0.12);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
    } else {
      // Subtle gentle blip
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(330, now + 0.08);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    }

    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + 0.3);
  } catch (e) {
    // Audio context may be restricted before user interaction
  }
}

// Lightweight zero-dependency canvas confetti
function triggerConfetti() {
  const canvas = document.getElementById('confettiCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const particles = [];
  const palette = ['#10b981', '#6366f1', '#ec4899', '#f59e0b', '#06b6d4', '#8b5cf6', '#ffffff'];

  for (let i = 0; i < 90; i++) {
    particles.push({
      x: canvas.width / 2 + (Math.random() - 0.5) * 200,
      y: canvas.height * 0.4,
      vx: (Math.random() - 0.5) * 12,
      vy: Math.random() * -12 - 4,
      color: palette[Math.floor(Math.random() * palette.length)],
      radius: Math.random() * 5 + 3,
      tilt: Math.random() * 10,
      tiltSpeed: Math.random() * 0.1 + 0.05,
      alpha: 1,
    });
  }

  let animationFrame;
  function updateConfetti() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let alive = false;

    particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.35; // Gravity
      p.alpha -= 0.012;

      if (p.alpha > 0) {
        alive = true;
        ctx.save();
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    });

    if (alive) {
      animationFrame = requestAnimationFrame(updateConfetti);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      cancelAnimationFrame(animationFrame);
    }
  }

  updateConfetti();
}

// ===================================================================
// TOGGLE COMPLETIONS
// ===================================================================

function toggleDay(habitId, dKey) {
  const habit = habits.find(h => h.id === habitId);
  if (!habit) return;

  const wasCompleted = !!habit.completions[dKey];
  if (wasCompleted) {
    delete habit.completions[dKey];
    playChime(false);
  } else {
    habit.completions[dKey] = true;
    playChime(true);
  }

  saveHabits();
  renderAll();

  // Check if all active habits completed for today -> Confetti celebration!
  const active = habits.filter(h => !h.archived);
  if (active.length > 0 && active.every(h => h.completions[todayKey()]) && !wasCompleted) {
    setTimeout(triggerConfetti, 180);
  }
}

// ===================================================================
// NAVIGATION & TABS
// ===================================================================

function switchTab(tabName) {
  activeTab = tabName;

  // Update Sidebar & Mobile Nav Buttons
  document.querySelectorAll('.nav-item, .mobile-nav-item').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.nav === tabName);
  });

  // Toggle View Panels
  const views = {
    dashboard: document.getElementById('viewDashboard'),
    analytics: document.getElementById('viewAnalytics'),
    settings:  document.getElementById('viewSettings'),
  };

  Object.keys(views).forEach(k => {
    if (views[k]) views[k].style.display = k === tabName ? 'flex' : 'none';
  });

  if (tabName === 'analytics') {
    renderAnalytics();
  }
}

// ===================================================================
// RENDER: DASHBOARD VIEW
// ===================================================================

function renderAll() {
  renderProgress();
  renderHabits();
  if (currentDetailId) renderDetailModal(currentDetailId);
  if (activeTab === 'analytics') renderAnalytics();
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
  const sectionTitle = document.getElementById('sectionTitleDisplay');
  if (!grid) return;

  grid.innerHTML = '';

  // Filter selection logic
  let filtered = habits;
  if (activeFilter === 'all') {
    filtered = habits.filter(h => !h.archived);
    if (sectionTitle) sectionTitle.textContent = 'Active Habits';
  } else if (activeFilter === 'pending') {
    filtered = habits.filter(h => !h.archived && !h.completions[todayKey()]);
    if (sectionTitle) sectionTitle.textContent = 'Pending Today';
  } else if (activeFilter === 'done') {
    filtered = habits.filter(h => !h.archived && h.completions[todayKey()]);
    if (sectionTitle) sectionTitle.textContent = 'Completed Today';
  } else if (activeFilter === 'archived') {
    filtered = habits.filter(h => h.archived);
    if (sectionTitle) sectionTitle.textContent = 'Archived Habits';
  }

  // Search Query filter
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    filtered = filtered.filter(h => h.name.toLowerCase().includes(q) || (h.desc && h.desc.toLowerCase().includes(q)));
  }

  if (filtered.length === 0) {
    if (emptyState) {
      emptyState.style.display = 'flex';
      const emptyTitle = document.getElementById('emptyTitle');
      const emptyDesc  = document.getElementById('emptyDesc');
      if (searchQuery) {
        if (emptyTitle) emptyTitle.textContent = 'No matching habits';
        if (emptyDesc) emptyDesc.textContent = `No habits found matching "${searchQuery}".`;
      } else if (activeFilter === 'archived') {
        if (emptyTitle) emptyTitle.textContent = 'No archived habits';
        if (emptyDesc) emptyDesc.textContent = 'Habits you archive will appear here.';
      } else {
        if (emptyTitle) emptyTitle.textContent = 'No habits yet';
        if (emptyDesc) emptyDesc.textContent = 'Start building your perfect routine. Small steps, every day.';
      }
    }
    return;
  }

  if (emptyState) emptyState.style.display = 'none';

  filtered.forEach(habit => {
    grid.appendChild(buildHabitCard(habit));
  });
}

function buildHabitCard(habit) {
  const streak = computeStreak(habit);
  const tk     = todayKey();

  const days = Array.from({ length: 7 }, (_, i) => {
    const d     = daysAgo(6 - i);
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

  const rightActions = document.createElement('div');
  rightActions.style.display = 'flex';
  rightActions.style.alignItems = 'center';
  rightActions.style.gap = '0.6rem';

  if (habit.archived) {
    const unarchiveBtn = document.createElement('button');
    unarchiveBtn.className = 'unarchive-btn';
    unarchiveBtn.textContent = 'Restore';
    unarchiveBtn.onclick = (e) => {
      e.stopPropagation();
      habit.archived = false;
      saveHabits();
      renderAll();
    };
    rightActions.appendChild(unarchiveBtn);
  }

  const streakEl = document.createElement('div');
  streakEl.className = 'habit-streak';
  streakEl.innerHTML = streak > 0
    ? `<span class="habit-streak-icon">🔥</span> ${streak} day${streak !== 1 ? 's' : ''}`
    : `<span style="color:var(--text-muted);font-weight:500;font-size:.78rem">No streak</span>`;

  rightActions.appendChild(streakEl);
  top.append(info, rightActions);

  // Day pills row
  const pillsRow = document.createElement('div');
  pillsRow.className = 'day-pills';

  days.forEach(({ d, dKey, isToday, isDone }) => {
    const pill = document.createElement('button');
    pill.className = 'day-pill' + (isToday ? ' is-today' : '') + (isDone ? ' is-done' : '');
    pill.style.setProperty('--habit-color', habit.color);
    pill.setAttribute('aria-label', `${shortDay(d)} — ${isDone ? 'completed' : 'not done'}`);

    const label = document.createElement('div');
    label.className = 'day-pill-label';
    label.textContent = shortDay(d);

    const dot = document.createElement('div');
    dot.className = 'day-pill-dot';

    const dotInner = document.createElement('div');
    dotInner.className = 'day-pill-dot-inner';
    dot.appendChild(dotInner);
    pill.append(label, dot);

    pill.addEventListener('click', e => {
      e.stopPropagation();
      toggleDay(habit.id, dKey);
      pill.classList.add('just-toggled');
      pill.addEventListener('animationend', () => pill.classList.remove('just-toggled'), { once: true });
    });

    pillsRow.appendChild(pill);
  });

  card.append(top, pillsRow);
  card.addEventListener('click', () => openDetailModal(habit.id));

  return card;
}

// ===================================================================
// RENDER: ANALYTICS & INSIGHTS
// ===================================================================

function renderAnalytics() {
  const active = habits.filter(h => !h.archived);

  // 1. KPI Cards
  const avgScore = active.length > 0
    ? Math.round(active.reduce((acc, h) => acc + compute30DayScore(h), 0) / active.length)
    : 0;

  let totalCheckins = 0;
  habits.forEach(h => {
    totalCheckins += computeAllTime(h);
  });

  let longestActiveStreak = 0;
  active.forEach(h => {
    longestActiveStreak = Math.max(longestActiveStreak, computeStreak(h));
  });

  // Calculate day-of-week completions (past 60 days)
  const dowCounts = [0, 0, 0, 0, 0, 0, 0];
  const dowOccurrences = [0, 0, 0, 0, 0, 0, 0];

  for (let i = 0; i < 60; i++) {
    const d = daysAgo(i);
    const dow = d.getDay();
    const dKey = dateKey(d);
    dowOccurrences[dow]++;

    active.forEach(h => {
      if (h.completions[dKey]) dowCounts[dow]++;
    });
  }

  // Calculate percentages per day
  let bestDowIdx = 0;
  let bestDowRate = -1;
  const dowRates = dowCounts.map((count, idx) => {
    const possible = dowOccurrences[idx] * (active.length || 1);
    const rate = possible > 0 ? Math.round((count / possible) * 100) : 0;
    if (rate > bestDowRate) {
      bestDowRate = rate;
      bestDowIdx = idx;
    }
    return rate;
  });

  document.getElementById('kpiAvgScore').textContent = `${avgScore}%`;
  document.getElementById('kpiTotalCheckins').textContent = totalCheckins.toLocaleString();
  document.getElementById('kpiLongestStreak').textContent = `${longestActiveStreak} day${longestActiveStreak !== 1 ? 's' : ''}`;
  document.getElementById('kpiBestDay').textContent = active.length > 0 ? `${fullDayName(bestDowIdx)} (${bestDowRate}%)` : '—';

  // 2. Day of Week Chart
  const chartContainer = document.getElementById('dowChartContainer');
  if (chartContainer) {
    chartContainer.innerHTML = '';
    const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    dayLabels.forEach((label, idx) => {
      const col = document.createElement('div');
      col.className = 'dow-col';

      const pct = dowRates[idx];
      col.innerHTML = `
        <span class="dow-pct">${pct}%</span>
        <div class="dow-bar-track">
          <div class="dow-bar-fill" style="height: ${Math.max(6, pct)}%"></div>
        </div>
        <span class="dow-label">${label}</span>
      `;
      chartContainer.appendChild(col);
    });
  }

  // 3. Leaderboard Ranking
  const leaderboardList = document.getElementById('leaderboardList');
  if (leaderboardList) {
    leaderboardList.innerHTML = '';
    const sorted = [...active].sort((a, b) => compute30DayScore(b) - compute30DayScore(a));

    if (sorted.length === 0) {
      leaderboardList.innerHTML = `<p style="color:var(--text-muted);font-size:0.85rem">No active habits to rank.</p>`;
      return;
    }

    sorted.forEach((habit, idx) => {
      const score = compute30DayScore(habit);
      const streak = computeStreak(habit);
      const item = document.createElement('div');
      item.className = 'leaderboard-item';
      item.style.cursor = 'pointer';
      item.onclick = () => openDetailModal(habit.id);

      item.innerHTML = `
        <div class="leaderboard-left">
          <span class="leaderboard-rank">#${idx + 1}</span>
          <div style="width: 12px; height: 12px; border-radius: 50%; background: ${habit.color}"></div>
          <div class="leaderboard-info">
            <span class="leaderboard-name">${habit.name}</span>
            <span class="leaderboard-streak">🔥 ${streak} day streak · ${computeAllTime(habit)} checks</span>
          </div>
        </div>
        <div class="leaderboard-right">
          <div class="leaderboard-bar-wrap">
            <div class="leaderboard-bar-fill" style="width: ${score}%; background: ${habit.color}"></div>
          </div>
          <span class="leaderboard-score" style="color: ${habit.color}">${score}%</span>
        </div>
      `;
      leaderboardList.appendChild(item);
    });
  }
}

// ===================================================================
// DETAIL MODAL & HEATMAP
// ===================================================================

function openDetailModal(habitId) {
  currentDetailId = habitId;
  renderDetailModal(habitId);
  openModal('detailModal');
}

function renderDetailModal(habitId) {
  const habit = habits.find(h => h.id === habitId);
  if (!habit) return;

  document.getElementById('detailHabitName').textContent = habit.name;
  document.getElementById('detailHabitDesc').textContent = habit.desc || '';
  document.getElementById('detailColorDot').style.background = habit.color;

  const archiveBtnText = document.getElementById('archiveBtnText');
  if (archiveBtnText) archiveBtnText.textContent = habit.archived ? 'Restore' : 'Archive';

  document.getElementById('detailHeatmap').style.setProperty('--habit-color', habit.color);
  document.querySelectorAll('.legend-cell').forEach(c => c.style.setProperty('background', habit.color));

  document.getElementById('statCurrentStreak').textContent = `${computeStreak(habit)}🔥`;
  document.getElementById('statBestStreak').textContent    = `${computeBestStreak(habit)}`;
  document.getElementById('stat30Score').textContent       = `${compute30DayScore(habit)}%`;
  document.getElementById('statAllTime').textContent       = computeAllTime(habit);

  renderHeatmap(habit);
}

function renderHeatmap(habit) {
  const container = document.getElementById('detailHeatmap');
  const tooltip   = document.getElementById('heatmapTooltip');
  if (!container) return;
  container.innerHTML = '';

  const DAYS = 91;
  const cells = [];
  for (let i = DAYS - 1; i >= 0; i--) {
    cells.push(dateKey(daysAgo(i)));
  }

  const firstDate = new Date(cells[0] + 'T12:00:00');
  const padBefore = firstDate.getDay();
  const totalSlots = Math.ceil((padBefore + DAYS) / 7) * 7;
  const numCols = totalSlots / 7;

  container.style.gridTemplateColumns = `repeat(${numCols}, 12px)`;

  for (let i = 0; i < padBefore; i++) {
    const cell = document.createElement('div');
    cell.className = 'heatmap-cell';
    cell.style.opacity = '0';
    container.appendChild(cell);
  }

  cells.forEach(dk => {
    const cell = document.createElement('div');
    const done = habit.completions[dk];
    cell.className = 'heatmap-cell' + (done ? ' filled' : '');
    if (done) {
      cell.style.background = habit.color;
      cell.style.opacity = '1';
    }

    // Interactive Floating Tooltip
    cell.addEventListener('mouseenter', e => {
      if (tooltip) {
        const readableDate = new Date(dk + 'T12:00:00').toLocaleDateString('en-US', {
          weekday: 'short', month: 'short', day: 'numeric', year: 'numeric'
        });
        tooltip.textContent = `${readableDate} — ${done ? 'Completed ✓' : 'No activity'}`;
        tooltip.style.left = `${e.clientX}px`;
        tooltip.style.top = `${e.clientY - 12}px`;
        tooltip.style.opacity = '1';
      }
    });

    cell.addEventListener('mousemove', e => {
      if (tooltip) {
        tooltip.style.left = `${e.clientX}px`;
        tooltip.style.top = `${e.clientY - 12}px`;
      }
    });

    cell.addEventListener('mouseleave', () => {
      if (tooltip) tooltip.style.opacity = '0';
    });

    container.appendChild(cell);
  });

  const trail = totalSlots - (padBefore + DAYS);
  for (let i = 0; i < trail; i++) {
    const cell = document.createElement('div');
    cell.className = 'heatmap-cell';
    cell.style.opacity = '0';
    container.appendChild(cell);
  }
}

// ===================================================================
// ADD & EDIT HABIT MODALS
// ===================================================================

function openAddModal() {
  document.getElementById('habitName').value = '';
  document.getElementById('habitDesc').value = '';
  selectedColor = COLORS.emerald;
  selectedFreq  = 'daily';
  updateSwatchUI('colorSwatches', selectedColor);
  updateFreqUI();
  openModal('addHabitModal');
  setTimeout(() => document.getElementById('habitName').focus(), 250);
}

function openEditModal(habitId) {
  const habit = habits.find(h => h.id === habitId);
  if (!habit) return;

  document.getElementById('editHabitName').value = habit.name;
  document.getElementById('editHabitDesc').value = habit.desc || '';
  editSelectedColor = habit.color;

  updateSwatchUI('editColorSwatches', editSelectedColor);
  closeModal('detailModal');
  openModal('editHabitModal');
}

function updateSwatchUI(containerId, activeHex) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.querySelectorAll('.color-swatch').forEach(sw => {
    sw.classList.toggle('active', sw.dataset.color === activeHex);
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
    const el = document.getElementById('habitName');
    el.focus();
    el.style.borderColor = '#ef4444';
    setTimeout(() => { el.style.borderColor = ''; }, 1500);
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

function saveEditHabit() {
  const habit = habits.find(h => h.id === currentDetailId);
  if (!habit) return;

  const name = document.getElementById('editHabitName').value.trim();
  if (!name) return;

  habit.name  = name;
  habit.desc  = document.getElementById('editHabitDesc').value.trim();
  habit.color = editSelectedColor;

  saveHabits();
  closeModal('editHabitModal');
  openDetailModal(habit.id);
  renderAll();
}

// ===================================================================
// ARCHIVE / DELETE / BACKUP ACTIONS
// ===================================================================

function toggleArchiveCurrentHabit() {
  const habit = habits.find(h => h.id === currentDetailId);
  if (!habit) return;

  habit.archived = !habit.archived;
  saveHabits();
  closeModal('detailModal');
  renderAll();
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

function exportData() {
  const backup = {
    app: 'EverydayLoop',
    version: '2.1.0',
    exportedAt: new Date().toISOString(),
    habits,
  };

  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `everydayloop_backup_${todayKey()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function importData(file) {
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const parsed = JSON.parse(e.target.result);
      if (Array.isArray(parsed.habits)) {
        habits = parsed.habits;
        saveHabits();
        renderAll();
        alert(`Successfully imported ${habits.length} habits!`);
      } else {
        alert('Invalid backup file format.');
      }
    } catch (err) {
      alert('Failed to parse JSON file.');
    }
  };
  reader.readAsText(file);
}

function showConfirm(icon, title, desc, onConfirm) {
  document.getElementById('confirmIcon').textContent   = icon;
  document.getElementById('confirmTitle').textContent  = title;
  document.getElementById('confirmDesc').textContent   = desc;
  confirmCallback = onConfirm;
  openModal('confirmModal');
}

// ===================================================================
// MODAL CONTROLLERS
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

document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', e => {
    if (e.target === overlay) {
      overlay.classList.remove('is-open');
      if (overlay.id === 'detailModal') currentDetailId = null;
    }
  });
});

// ===================================================================
// MOTIVATIONAL QUOTES & DATE
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

function initDateLabel() {
  const el = document.getElementById('todayLabel');
  if (el) el.textContent = formatHeaderDate(new Date());
}

// ===================================================================
// EVENT LISTENERS
// ===================================================================

function bindEvents() {
  // Tab Navigation (Sidebar + Mobile)
  document.querySelectorAll('[data-nav]').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.nav));
  });

  // Filter Pills
  document.querySelectorAll('.filter-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      document.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      activeFilter = pill.dataset.filter;
      renderHabits();
    });
  });

  // Search Input
  const searchInput = document.getElementById('habitSearchInput');
  const clearBtn = document.getElementById('searchClearBtn');
  if (searchInput) {
    searchInput.addEventListener('input', e => {
      searchQuery = e.target.value.trim();
      if (clearBtn) clearBtn.style.display = searchQuery ? 'inline-block' : 'none';
      renderHabits();
    });
  }
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      searchInput.value = '';
      searchQuery = '';
      clearBtn.style.display = 'none';
      renderHabits();
    });
  }

  // Add Habit buttons
  ['btnAddHabitOpen', 'btnAddSidebarOpen', 'btnEmptyStateAdd', 'btnMobileAdd'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('click', openAddModal);
  });

  // Add Modal Actions
  document.getElementById('btnAddClose')?.addEventListener('click', () => closeModal('addHabitModal'));
  document.getElementById('btnAddCancel')?.addEventListener('click', () => closeModal('addHabitModal'));
  document.getElementById('btnAddSave')?.addEventListener('click', saveNewHabit);

  // Edit Modal Actions
  document.getElementById('btnEditHabitTrigger')?.addEventListener('click', () => {
    if (currentDetailId) openEditModal(currentDetailId);
  });
  document.getElementById('btnEditClose')?.addEventListener('click', () => closeModal('editHabitModal'));
  document.getElementById('btnEditCancel')?.addEventListener('click', () => closeModal('editHabitModal'));
  document.getElementById('btnEditSave')?.addEventListener('click', saveEditHabit);

  // Swatches Selection
  document.querySelectorAll('#colorSwatches .color-swatch').forEach(sw => {
    sw.addEventListener('click', () => {
      selectedColor = sw.dataset.color;
      updateSwatchUI('colorSwatches', selectedColor);
    });
  });
  document.querySelectorAll('#editColorSwatches .color-swatch').forEach(sw => {
    sw.addEventListener('click', () => {
      editSelectedColor = sw.dataset.color;
      updateSwatchUI('editColorSwatches', editSelectedColor);
    });
  });

  // Frequency Buttons
  document.querySelectorAll('.freq-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedFreq = btn.dataset.freq;
      updateFreqUI();
    });
  });

  // Detail Modal Actions
  document.getElementById('btnDetailClose')?.addEventListener('click', () => { closeModal('detailModal'); currentDetailId = null; });
  document.getElementById('btnDetailClose2')?.addEventListener('click', () => { closeModal('detailModal'); currentDetailId = null; });
  document.getElementById('btnArchiveHabit')?.addEventListener('click', toggleArchiveCurrentHabit);
  document.getElementById('btnDeleteHabit')?.addEventListener('click', deleteCurrentHabit);

  // Confirm Modal
  document.getElementById('btnConfirmCancel')?.addEventListener('click', () => closeModal('confirmModal'));
  document.getElementById('btnConfirmOk')?.addEventListener('click', () => {
    closeModal('confirmModal');
    if (confirmCallback) { confirmCallback(); confirmCallback = null; }
  });

  // Settings Actions
  const soundToggle = document.getElementById('soundToggle');
  if (soundToggle) {
    soundToggle.checked = soundEnabled;
    soundToggle.addEventListener('change', e => {
      soundEnabled = e.target.checked;
      localStorage.setItem(SOUND_SETTING_KEY, soundEnabled);
    });
  }

  document.getElementById('btnExportJson')?.addEventListener('click', exportData);
  document.getElementById('importJsonInput')?.addEventListener('change', e => {
    if (e.target.files && e.target.files[0]) {
      importData(e.target.files[0]);
    }
  });

  document.getElementById('btnReloadSeedData')?.addEventListener('click', () => {
    showConfirm('🔄', 'Reload Seed Data?', 'This will re-populate the 4 demo habits with 60-day history.', () => {
      seedDemoData(true);
      renderAll();
    });
  });

  document.getElementById('btnClearAllData')?.addEventListener('click', () => {
    showConfirm('⚠️', 'Reset All Habits?', 'This will permanently wipe all local habit data.', () => {
      habits = [];
      saveHabits();
      renderAll();
    });
  });

  // Keyboard Shortcuts
  document.addEventListener('keydown', e => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    if (e.key === 'n' || e.key === 'N') {
      e.preventDefault();
      openAddModal();
    }
    if (e.key === 'Escape') {
      ['confirmModal', 'detailModal', 'addHabitModal', 'editHabitModal'].forEach(id => closeModal(id));
    }
  });

  // Enter to submit in input
  document.getElementById('habitName')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') saveNewHabit();
  });
  document.getElementById('editHabitName')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') saveEditHabit();
  });
}

// ===================================================================
// BOOTSTRAP INITIALIZATION
// ===================================================================

function init() {
  loadHabits();
  seedDemoData();
  loadHabits();

  initDateLabel();
  initQuoteBanner();
  bindEvents();
  renderAll();

  requestAnimationFrame(() => {
    setTimeout(() => {
      const active = habits.filter(h => !h.archived);
      const done   = active.filter(h => h.completions[todayKey()]).length;
      const pct    = active.length === 0 ? 0 : Math.round((done / active.length) * 100);
      const bar    = document.getElementById('progressBarFill');
      if (bar) bar.style.width = `${pct}%`;
    }, 120);
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
