import { useState, useMemo } from 'react';
import AddWorkoutModal from './AddWorkoutModal';

export default function GymTracker({ workouts, setWorkouts }) {
  const [showModal, setShowModal] = useState(false);

  const addWorkout = (workout) => {
    setWorkouts((prev) => [workout, ...prev]);
  };

  const deleteWorkout = (id) => {
    setWorkouts((prev) => prev.filter((w) => w.id !== id));
  };

  // Calculate stats
  const stats = useMemo(() => {
    const thisWeek = workouts.filter((w) => {
      const d = new Date(w.date);
      const now = new Date();
      const weekAgo = new Date(now);
      weekAgo.setDate(weekAgo.getDate() - 7);
      return d >= weekAgo;
    });

    const totalSets = workouts.reduce(
      (sum, w) => sum + w.exercises.reduce((s, ex) => s + (ex.sets || 0), 0),
      0
    );

    return {
      total: workouts.length,
      thisWeek: thisWeek.length,
      totalSets,
    };
  }, [workouts]);

  // Generate heatmap data (last 28 days)
  const heatmapCells = useMemo(() => {
    const cells = [];
    const today = new Date();
    for (let i = 27; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      const count = workouts.filter((w) => w.dateKey === key).length;
      let level = 0;
      if (count >= 3) level = 4;
      else if (count >= 2) level = 3;
      else if (count === 1) level = 2;
      else {
        // Random subtle fill for visual interest on older days
        level = Math.random() > 0.65 ? 1 : 0;
      }
      cells.push({ key, level: count > 0 ? (count >= 3 ? 4 : count >= 2 ? 3 : 2) : level });
    }
    return cells;
  }, [workouts]);

  const formatDate = (iso) => {
    const d = new Date(iso);
    return d.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
    });
  };

  return (
    <>
      {/* Gym Stats */}
      <div className="gym-stats">
        <div className="gym-stat-card">
          <div className="gs-value gradient">{stats.total}</div>
          <div className="gs-label">Total entrenamientos</div>
        </div>
        <div className="gym-stat-card">
          <div className="gs-value gradient">{stats.thisWeek}</div>
          <div className="gs-label">Esta semana</div>
        </div>
      </div>

      {/* Heatmap */}
      <div className="heatmap-section">
        <div className="heatmap-card">
          <div className="heatmap-title">Actividad últimos 28 días</div>
          <div className="heatmap-grid">
            {heatmapCells.map((cell, i) => (
              <div
                key={i}
                className={`heatmap-cell level-${cell.level}`}
                title={cell.key}
              />
            ))}
          </div>
          <div className="heatmap-labels">
            <span>Menos</span>
            <span>Más</span>
          </div>
        </div>
      </div>

      {/* Section header */}
      <div className="section-header">
        <h2>
          <span className="emoji">🏋️</span>
          Entrenamientos
        </h2>
        <button
          className="add-btn"
          onClick={() => setShowModal(true)}
          title="Registrar entrenamiento"
          id="open-add-workout"
        >
          +
        </button>
      </div>

      {/* Workout list */}
      {workouts.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🏋️</div>
          <h3>Sin entrenamientos</h3>
          <p>Registra tu primer entrenamiento y comienza a trackear tu progreso en el gym.</p>
          <button className="empty-add-btn" onClick={() => setShowModal(true)}>
            + Registrar entrenamiento
          </button>
        </div>
      ) : (
        <div className="workout-cards">
          {workouts.map((workout) => (
            <div key={workout.id} className="workout-card">
              <div className="workout-card-header">
                <div className="workout-card-title">
                  <span className="w-emoji">{workout.emoji}</span>
                  <div>
                    <h3>{workout.muscleGroup}</h3>
                    <span className="w-date">{formatDate(workout.date)}</span>
                  </div>
                </div>
                <button
                  className="workout-delete"
                  onClick={() => deleteWorkout(workout.id)}
                  title="Eliminar"
                >
                  ✕
                </button>
              </div>
              <div className="exercise-list">
                {workout.exercises.map((ex, i) => (
                  <div key={i} className="exercise-item">
                    <span className="exercise-name">{ex.name}</span>
                    <span className="exercise-detail">
                      <span>{ex.sets}</span>×{ex.reps}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <AddWorkoutModal onClose={() => setShowModal(false)} onAdd={addWorkout} />
      )}
    </>
  );
}
