/**
 * EverydayLoop - Cloned Engine
 * Implemented from REA Architecture Specification (morluto/rea)
 */

const STORAGE_KEY_HABITS = 'rea_habits_store_v1';
const STORAGE_KEY_COMPLETIONS = 'rea_completions_store_v1';

// Seed Initial Mock Habits if first run
const INITIAL_HABITS = [
  {
    id: 'habit-1',
    name: 'Morning Workout & Stretch',
    description: '30 mins of mobility and cardio',
    color: '#10B981',
    frequency: 'daily',
    createdAt: new Date(Date.now() - 45 * 86400000).toISOString(),
    archived: false
  },
  {
    id: 'habit-2',
    name: 'Read 20 Pages',
    description: 'Non-fiction / Engineering literature',
    color: '#6366F1',
    frequency: 'daily',
    createdAt: new Date(Date.now() - 60 * 86400000).toISOString(),
    archived: false
  },
  {
    id: 'habit-3',
    name: 'Drink 2.5L Water',
    description: 'Hydration tracker',
    color: '#06B6D4',
    frequency: 'daily',
    createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
    archived: false
  }
];

// Helper: Format Date YYYY-MM-DD
function formatDate(d) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Generate past N days dates array (latest first)
function getPastDays(count) {
  const days = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push({
      dateStr: formatDate(d),
      dayName: d.toLocaleDateString('en-US', { weekday: 'narrow' }),
      dayNum: d.getDate(),
      isToday: i === 0
    });
  }
  return days;
}

// State Management
class HabitStore {
  constructor() {
    this.habits = JSON.parse(localStorage.getItem(STORAGE_KEY_HABITS)) || null;
    this.completions = JSON.parse(localStorage.getItem(STORAGE_KEY_COMPLETIONS)) || null;

    if (!this.habits) {
      this.habits = INITIAL_HABITS;
      this.saveHabits();
      this.seedCompletions();
    }
  }

  saveHabits() {
    localStorage.setItem(STORAGE_KEY_HABITS, JSON.stringify(this.habits));
  }

  saveCompletions() {
    localStorage.setItem(STORAGE_KEY_COMPLETIONS, JSON.stringify(this.completions));
  }

  seedCompletions() {
    this.completions = {};
    const now = new Date();
    // Simulate some completion history for the last 60 days
    this.habits.forEach(habit => {
      for (let i = 0; i < 60; i++) {
        // High probability of completion to show off heatmaps
        if (Math.random() > 0.3) {
          const d = new Date();
          d.setDate(now.getDate() - i);
          this.completions[`${habit.id}_${formatDate(d)}`] = true;
        }
      }
    });
    this.saveCompletions();
  }

  isCompleted(habitId, dateStr) {
    return !!this.completions[`${habitId}_${dateStr}`];
  }

  toggleCompletion(habitId, dateStr) {
    const key = `${habitId}_${dateStr}`;
    if (this.completions[key]) {
      delete this.completions[key];
    } else {
      this.completions[key] = true;
    }
    this.saveCompletions();
  }

  addHabit(name, description, color) {
    const newHabit = {
      id: 'habit-' + Date.now(),
      name,
      description,
      color,
      frequency: 'daily',
      createdAt: new Date().toISOString(),
      archived: false
    };
    this.habits.unshift(newHabit);
    this.saveHabits();
  }

  deleteHabit(id) {
    this.habits = this.habits.filter(h => h.id !== id);
    this.saveHabits();
  }

  // REA-Extracted Algorithm: Calculate Consecutive Streaks
  calculateStreak(habitId) {
    const today = new Date();
    const todayStr = formatDate(today);
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const yesterdayStr = formatDate(yesterday);

    let streak = 0;
    let checkDate = new Date(today);

    // If today is completed, start from today.
    // If not, check if yesterday was completed to keep the streak alive.
    if (this.isCompleted(habitId, todayStr)) {
      streak = 1;
      checkDate.setDate(checkDate.getDate() - 1);
    } else if (this.isCompleted(habitId, yesterdayStr)) {
      streak = 1;
      checkDate.setDate(checkDate.getDate() - 2);
    } else {
      return 0;
    }

    while (true) {
      const dStr = formatDate(checkDate);
      if (this.isCompleted(habitId, dStr)) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }

    return streak;
  }

  calculateBestStreak(habitId) {
    // Scan last 120 days
    let max = 0;
    let current = 0;
    for (let i = 120; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      if (this.isCompleted(habitId, formatDate(d))) {
        current++;
        if (current > max) max = current;
      } else {
        current = 0;
      }
    }
    return max;
  }

  calculate30DayScore(habitId) {
    let completedCount = 0;
    for (let i = 0; i < 30; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      if (this.isCompleted(habitId, formatDate(d))) {
        completedCount++;
      }
    }
    return Math.round((completedCount / 30) * 100);
  }

  getTotalChecks(habitId) {
    return Object.keys(this.completions).filter(k => k.startsWith(habitId + '_')).length;
  }
}

// UI Controller
const store = new HabitStore();
let selectedHabitId = null;

const habitsListEl = document.getElementById('habitsList');
const currentDateDisplay = document.getElementById('currentDateDisplay');
const completionPercentEl = document.getElementById('completionPercent');
const progressBarFillEl = document.getElementById('progressBarFill');
const summarySubEl = document.getElementById('summarySub');

// Modals
const detailModal = document.getElementById('detailModal');
const addModal = document.getElementById('addModal');
const addHabitForm = document.getElementById('addHabitForm');

function init() {
  currentDateDisplay.textContent = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric'
  });

  render();
  bindEvents();
}

function render() {
  const past7Days = getPastDays(7);
  habitsListEl.innerHTML = '';

  let totalToday = store.habits.length;
  let completedToday = 0;
  const todayStr = formatDate(new Date());

  store.habits.forEach(habit => {
    if (store.isCompleted(habit.id, todayStr)) {
      completedToday++;
    }

    const streak = store.calculateStreak(habit.id);
    const card = document.createElement('div');
    card.className = 'habit-card';
    card.style.setProperty('--habit-color', habit.color);

    // Left info (opens detail)
    const info = document.createElement('div');
    info.className = 'habit-info';
    info.innerHTML = `
      <div class="habit-color-indicator" style="background: ${habit.color}"></div>
      <div>
        <div class="habit-title">${habit.name}</div>
        <div class="habit-streak-badge">
          <span class="streak-flame">🔥</span> ${streak} day streak
        </div>
      </div>
    `;
    info.onclick = () => openDetailModal(habit.id);

    // Right day checklist
    const daysContainer = document.createElement('div');
    daysContainer.className = 'habit-days';

    past7Days.forEach(day => {
      const isChecked = store.isCompleted(habit.id, day.dateStr);
      const circle = document.createElement('div');
      circle.className = `day-circle ${isChecked ? 'checked' : ''} ${day.isToday ? 'is-today' : ''}`;
      circle.style.setProperty('--habit-color', habit.color);
      circle.innerHTML = `<span>${day.dayName}</span><span class="day-num">${day.dayNum}</span>`;

      circle.onclick = (e) => {
        e.stopPropagation();
        store.toggleCompletion(habit.id, day.dateStr);
        render();
      };

      daysContainer.appendChild(circle);
    });

    card.appendChild(info);
    card.appendChild(daysContainer);
    habitsListEl.appendChild(card);
  });

  // Update Summary Progress
  const percent = totalToday > 0 ? Math.round((completedToday / totalToday) * 100) : 0;
  completionPercentEl.textContent = `${percent}%`;
  progressBarFillEl.style.width = `${percent}%`;
  summarySubEl.textContent = `${completedToday} of ${totalToday} habits done today`;
}

function openDetailModal(habitId) {
  selectedHabitId = habitId;
  const habit = store.habits.find(h => h.id === habitId);
  if (!habit) return;

  document.getElementById('modalHabitTitle').textContent = habit.name;
  document.getElementById('modalHabitDesc').textContent = habit.description || 'No description provided';
  document.getElementById('modalColorDot').style.background = habit.color;

  document.getElementById('modalCurrentStreak').textContent = `${store.calculateStreak(habitId)} days`;
  document.getElementById('modalBestStreak').textContent = `${store.calculateBestStreak(habitId)} days`;
  document.getElementById('modalScore').textContent = `${store.calculate30DayScore(habitId)}%`;
  document.getElementById('modalTotalChecks').textContent = store.getTotalChecks(habitId);

  // Render 90-Day Heatmap
  const heatmapEl = document.getElementById('heatmapGrid');
  heatmapEl.innerHTML = '';
  heatmapEl.style.setProperty('--active-color', habit.color);

  // 91 days (13 weeks * 7 days)
  for (let i = 90; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = formatDate(d);
    const isDone = store.isCompleted(habitId, dateStr);

    const cell = document.createElement('div');
    cell.className = `heatmap-cell ${isDone ? 'active' : ''}`;
    cell.title = `${dateStr}: ${isDone ? 'Completed' : 'Missed'}`;
    heatmapEl.appendChild(cell);
  }

  detailModal.classList.remove('hidden');
}

function bindEvents() {
  // Add Habit Modal
  document.getElementById('addHabitBtn').onclick = () => addModal.classList.remove('hidden');
  document.getElementById('closeAddModal').onclick = () => addModal.classList.add('hidden');
  document.getElementById('cancelAddBtn').onclick = () => addModal.classList.add('hidden');

  // Close Detail Modal
  document.getElementById('closeDetailModal').onclick = () => detailModal.classList.add('hidden');

  // Delete Habit
  document.getElementById('deleteHabitBtn').onclick = () => {
    if (selectedHabitId && confirm('Delete this habit?')) {
      store.deleteHabit(selectedHabitId);
      detailModal.classList.add('hidden');
      render();
    }
  };

  // Add Form Submit
  addHabitForm.onsubmit = (e) => {
    e.preventDefault();
    const name = document.getElementById('habitName').value.trim();
    const desc = document.getElementById('habitDesc').value.trim();
    const color = document.querySelector('input[name="color"]:checked')?.value || '#10B981';

    if (name) {
      store.addHabit(name, desc, color);
      addHabitForm.reset();
      addModal.classList.add('hidden');
      render();
    }
  };

  // Close on backdrop click
  window.onclick = (e) => {
    if (e.target === addModal) addModal.classList.add('hidden');
    if (e.target === detailModal) detailModal.classList.add('hidden');
  };
}

init();
