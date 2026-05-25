import { useState } from 'react';

const MUSCLE_GROUPS = [
  { label: 'Pecho', emoji: '🫁' },
  { label: 'Espalda', emoji: '🔙' },
  { label: 'Hombros', emoji: '🏋️' },
  { label: 'Bíceps', emoji: '💪' },
  { label: 'Tríceps', emoji: '💪' },
  { label: 'Piernas', emoji: '🦵' },
  { label: 'Abdomen', emoji: '🔥' },
  { label: 'Cardio', emoji: '❤️' },
  { label: 'Full Body', emoji: '🏆' },
];

function createEmptyExercise() {
  return { id: Date.now().toString() + Math.random(), name: '', sets: '', reps: '' };
}

export default function AddWorkoutModal({ onClose, onAdd }) {
  const [muscleGroup, setMuscleGroup] = useState(MUSCLE_GROUPS[0]);
  const [exercises, setExercises] = useState([
    createEmptyExercise(),
    createEmptyExercise(),
  ]);

  const addExercise = () => {
    setExercises([...exercises, createEmptyExercise()]);
  };

  const removeExercise = (id) => {
    if (exercises.length <= 1) return;
    setExercises(exercises.filter((ex) => ex.id !== id));
  };

  const updateExercise = (id, field, value) => {
    setExercises(
      exercises.map((ex) => (ex.id === id ? { ...ex, [field]: value } : ex))
    );
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const validExercises = exercises.filter((ex) => ex.name.trim());
    if (validExercises.length === 0) return;

    onAdd({
      id: Date.now().toString(),
      muscleGroup: muscleGroup.label,
      emoji: muscleGroup.emoji,
      exercises: validExercises.map((ex) => ({
        name: ex.name.trim(),
        sets: parseInt(ex.sets) || 0,
        reps: parseInt(ex.reps) || 0,
      })),
      date: new Date().toISOString(),
      dateKey: new Date().toISOString().split('T')[0],
    });
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-handle" />
        <h2 className="modal-title">Registrar Entrenamiento</h2>

        <form onSubmit={handleSubmit}>
          <div className="modal-field">
            <label>Grupo muscular</label>
            <div className="emoji-grid">
              {MUSCLE_GROUPS.map((mg) => (
                <button
                  type="button"
                  key={mg.label}
                  className={`emoji-option${muscleGroup.label === mg.label ? ' selected' : ''}`}
                  onClick={() => setMuscleGroup(mg)}
                  title={mg.label}
                >
                  <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                    <span>{mg.emoji}</span>
                    <span style={{ fontSize: 8, color: '#999' }}>{mg.label}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="modal-field">
            <label>Ejercicios</label>
            <div className="exercise-inputs">
              {exercises.map((ex) => (
                <div key={ex.id} className="exercise-input-row">
                  <input
                    type="text"
                    placeholder="Ejercicio"
                    value={ex.name}
                    onChange={(e) => updateExercise(ex.id, 'name', e.target.value)}
                  />
                  <input
                    type="number"
                    placeholder="Sets"
                    value={ex.sets}
                    onChange={(e) => updateExercise(ex.id, 'sets', e.target.value)}
                    min="0"
                  />
                  <input
                    type="number"
                    placeholder="Reps"
                    value={ex.reps}
                    onChange={(e) => updateExercise(ex.id, 'reps', e.target.value)}
                    min="0"
                  />
                  <button
                    type="button"
                    className="remove-exercise-btn"
                    onClick={() => removeExercise(ex.id)}
                    title="Eliminar"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
            <button type="button" className="add-exercise-btn" onClick={addExercise}>
              + Agregar ejercicio
            </button>
          </div>

          <button type="submit" className="modal-submit" id="submit-workout">
            Guardar Entrenamiento
          </button>
          <button type="button" className="modal-cancel" onClick={onClose}>
            Cancelar
          </button>
        </form>
      </div>
    </div>
  );
}
