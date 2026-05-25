import { useState, useMemo } from 'react';
import { useLocalStorage, getGreeting, formatDateKey, calculateStreak } from './utils';
import HabitTracker from './HabitTracker';
import GymTracker from './GymTracker';
import './index.css';

const HabitsIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

const GymIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6.5 6.5h11" />
    <path d="M6.5 17.5h11" />
    <path d="M12 6.5v11" />
    <rect x="2" y="8.5" width="4" height="7" rx="1" />
    <rect x="18" y="8.5" width="4" height="7" rx="1" />
    <rect x="4" y="10" width="2" height="4" rx="0.5" />
    <rect x="18" y="10" width="2" height="4" rx="0.5" />
  </svg>
);

const StatsIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 20V10" />
    <path d="M12 20V4" />
    <path d="M6 20v-6" />
  </svg>
);

function StatsView({ habits, completions, workouts }) {
  const todayKey = formatDateKey();

  const stats = useMemo(() => {
    const completedToday = habits.filter(
      (h) => completions[`${h.id}_${todayKey}`]
    ).length;

    let bestStreak = 0;
    let totalCompleted = 0;
    habits.forEach((h) => {
      const streak = calculateStreak(h.id, completions);
      if (streak > bestStreak) bestStreak = streak;
    });

    Object.values(completions).forEach((v) => {
      if (v) totalCompleted++;
    });

    // Completed last 7 days
    const last7 = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      const count = habits.filter((h) => completions[`${h.id}_${key}`]).length;
      last7.push({
        day: d.toLocaleDateString('es-ES', { weekday: 'short' }),
        count,
        max: habits.length,
      });
    }

    return { completedToday, bestStreak, totalCompleted, last7, totalWorkouts: workouts.length };
  }, [habits, completions, workouts, todayKey]);

  return (
    <>
      <div className="section-header">
        <h2>
          <span className="emoji">📊</span>
          Estadísticas
        </h2>
      </div>

      <div className="gym-stats">
        <div className="gym-stat-card">
          <div className="gs-value gradient">{stats.bestStreak}</div>
          <div className="gs-label">Mejor racha</div>
        </div>
        <div className="gym-stat-card">
          <div className="gs-value gradient">{stats.totalCompleted}</div>
          <div className="gs-label">Total completados</div>
        </div>
      </div>

      <div className="gym-stats">
        <div className="gym-stat-card">
          <div className="gs-value gradient">{habits.length}</div>
          <div className="gs-label">Hábitos activos</div>
        </div>
        <div className="gym-stat-card">
          <div className="gs-value gradient">{stats.totalWorkouts}</div>
          <div className="gs-label">Entrenamientos</div>
        </div>
      </div>

      {/* Weekly chart */}
      <div className="heatmap-section">
        <div className="heatmap-card">
          <div className="heatmap-title">Hábitos completados — Últimos 7 días</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 120, padding: '0 4px' }}>
            {stats.last7.map((d, i) => {
              const pct = d.max > 0 ? (d.count / d.max) * 100 : 0;
              return (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: pct > 0 ? '#D42B2E' : '#555' }}>
                    {d.count}
                  </span>
                  <div style={{
                    width: '100%',
                    height: `${Math.max(pct, 4)}%`,
                    minHeight: 4,
                    background: pct > 0
                      ? 'linear-gradient(180deg, #D42B2E 0%, #C21313 100%)'
                      : 'rgba(255,255,255,0.05)',
                    borderRadius: 4,
                    transition: 'height 0.5s ease',
                    boxShadow: pct > 50 ? '0 0 8px rgba(212, 43, 46, 0.3)' : 'none',
                  }} />
                  <span style={{ fontSize: 10, color: '#555', textTransform: 'capitalize' }}>
                    {d.day}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState('habits');
  const [habits, setHabits] = useLocalStorage('stark_habits', []);
  const [completions, setCompletions] = useLocalStorage('stark_completions', {});
  const [workouts, setWorkouts] = useLocalStorage('stark_workouts', []);

  const todayKey = formatDateKey();
  const greeting = getGreeting();

  // Quick stats for header
  const completedToday = habits.filter(
    (h) => completions[`${h.id}_${todayKey}`]
  ).length;

  let bestStreak = 0;
  habits.forEach((h) => {
    const streak = calculateStreak(h.id, completions);
    if (streak > bestStreak) bestStreak = streak;
  });

  const todayFormatted = new Date().toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  return (
    <div className="app-container">
      {/* Header */}
      <header className="app-header">
        <div className="header-top">
          <div className="header-logo">
            <div className="header-logo-icon">⚡</div>
            <h1>Stark<span>Tracker</span></h1>
          </div>
          <span className="header-date">{todayFormatted}</span>
        </div>
        <p className="header-greeting">
          {greeting}, <strong>guerrero</strong> 🔥
        </p>
      </header>

      {/* Stats Row */}
      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-icon">🎯</div>
          <div className="stat-value">{completedToday}/{habits.length}</div>
          <div className="stat-label">Hoy</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🔥</div>
          <div className="stat-value fire">{bestStreak}</div>
          <div className="stat-label">Racha</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🏋️</div>
          <div className="stat-value">{workouts.length}</div>
          <div className="stat-label">Gym</div>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'habits' && (
        <HabitTracker
          habits={habits}
          setHabits={setHabits}
          completions={completions}
          setCompletions={setCompletions}
        />
      )}
      {activeTab === 'gym' && (
        <GymTracker workouts={workouts} setWorkouts={setWorkouts} />
      )}
      {activeTab === 'stats' && (
        <StatsView habits={habits} completions={completions} workouts={workouts} />
      )}

      {/* Bottom Navigation */}
      <nav className="bottom-nav" id="main-nav">
        <button
          className={`nav-item${activeTab === 'habits' ? ' active' : ''}`}
          onClick={() => setActiveTab('habits')}
          id="nav-habits"
        >
          <HabitsIcon />
          <span>Hábitos</span>
        </button>
        <button
          className={`nav-item${activeTab === 'gym' ? ' active' : ''}`}
          onClick={() => setActiveTab('gym')}
          id="nav-gym"
        >
          <GymIcon />
          <span>Gym</span>
        </button>
        <button
          className={`nav-item${activeTab === 'stats' ? ' active' : ''}`}
          onClick={() => setActiveTab('stats')}
          id="nav-stats"
        >
          <StatsIcon />
          <span>Stats</span>
        </button>
      </nav>
    </div>
  );
}
