import { useState, useMemo } from 'react';
import { getWeekDays, calculateStreak, formatDateKey } from './utils';
import AddHabitModal from './AddHabitModal';

const CheckIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

export default function HabitTracker({ habits, setHabits, completions, setCompletions }) {
  const [showModal, setShowModal] = useState(false);
  const [selectedDay, setSelectedDay] = useState(formatDateKey());
  const weekDays = useMemo(() => getWeekDays(), []);
  const todayKey = formatDateKey();

  const toggleHabit = (habitId) => {
    const key = `${habitId}_${selectedDay}`;
    setCompletions((prev) => {
      const updated = { ...prev };
      if (updated[key]) {
        delete updated[key];
      } else {
        updated[key] = true;
      }
      return updated;
    });
  };

  const addHabit = (habit) => {
    setHabits((prev) => [...prev, habit]);
  };

  const deleteHabit = (habitId) => {
    setHabits((prev) => prev.filter((h) => h.id !== habitId));
    // Also clean up completions for this habit
    setCompletions((prev) => {
      const updated = { ...prev };
      Object.keys(updated).forEach((key) => {
        if (key.startsWith(habitId + '_')) {
          delete updated[key];
        }
      });
      return updated;
    });
  };

  const completedToday = habits.filter(
    (h) => completions[`${h.id}_${selectedDay}`]
  ).length;
  const progressPct = habits.length > 0 ? Math.round((completedToday / habits.length) * 100) : 0;

  return (
    <>
      {/* Day selector */}
      <div className="day-selector">
        {weekDays.map((day) => (
          <button
            key={day.dateKey}
            className={`day-pill${selectedDay === day.dateKey ? ' active' : ''}${day.isToday ? ' today' : ''}`}
            onClick={() => setSelectedDay(day.dateKey)}
          >
            <span className="day-name">{day.name}</span>
            <span className="day-num">{day.num}</span>
          </button>
        ))}
      </div>

      {/* Progress bar */}
      {habits.length > 0 && (
        <div className="progress-section">
          <div className="progress-bar-wrap">
            <div className="progress-top">
              <span className="progress-label">Progreso del día</span>
              <span className="progress-pct">{progressPct}%</span>
            </div>
            <div className="progress-track">
              <div
                className="progress-fill"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Section header */}
      <div className="section-header">
        <h2>
          <span className="emoji">🎯</span>
          Mis Hábitos
        </h2>
        <button
          className="add-btn"
          onClick={() => setShowModal(true)}
          title="Agregar hábito"
          id="open-add-habit"
        >
          +
        </button>
      </div>

      {/* Habit list */}
      {habits.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🚀</div>
          <h3>¡Empieza tu evolución!</h3>
          <p>Agrega tu primer hábito y comienza a construir la mejor versión de ti.</p>
          <button className="empty-add-btn" onClick={() => setShowModal(true)}>
            + Crear primer hábito
          </button>
        </div>
      ) : (
        <div className="habit-list">
          {habits.map((habit) => {
            const isCompleted = !!completions[`${habit.id}_${selectedDay}`];
            const streak = calculateStreak(habit.id, completions);
            return (
              <div
                key={habit.id}
                className={`habit-item${isCompleted ? ' completed' : ''}`}
                onClick={() => toggleHabit(habit.id)}
                id={`habit-${habit.id}`}
              >
                <div className="habit-emoji">{habit.emoji}</div>
                <div className="habit-info">
                  <div className="habit-name">{habit.name}</div>
                  <div className="habit-streak">
                    {streak > 0 && (
                      <>
                        <span className="fire">🔥</span>
                        {streak} día{streak > 1 ? 's' : ''} seguido{streak > 1 ? 's' : ''}
                      </>
                    )}
                    {streak === 0 && <span>Sin racha aún</span>}
                  </div>
                </div>
                <div className={`habit-check${isCompleted ? ' checked' : ''}`}>
                  {isCompleted && <CheckIcon />}
                </div>
                <button
                  className="habit-delete"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteHabit(habit.id);
                  }}
                  title="Eliminar"
                >
                  ✕
                </button>
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <AddHabitModal onClose={() => setShowModal(false)} onAdd={addHabit} />
      )}
    </>
  );
}
