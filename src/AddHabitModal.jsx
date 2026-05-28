import { useState, useEffect } from 'react';

const HABIT_EMOJIS = [
  '💪', '📖', '🧘', '💧', '🏃', '🥗',
  '💤', '✍️', '🧠', '🎯', '⏰', '🚭',
  '💊', '🎵', '📱', '🧹', '💰', '🙏',
];

export default function AddHabitModal({ onClose, onAdd, habitToEdit, onEdit }) {
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('💪');

  useEffect(() => {
    if (habitToEdit) {
      setName(habitToEdit.name);
      setEmoji(habitToEdit.emoji);
    }
  }, [habitToEdit]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (habitToEdit) {
      onEdit({
        ...habitToEdit,
        name: name.trim(),
        emoji,
      });
    } else {
      onAdd({
        id: Date.now().toString(),
        name: name.trim(),
        emoji,
        createdAt: new Date().toISOString(),
      });
    }
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-handle" />
        <h2 className="modal-title">
          {habitToEdit ? 'Editar Hábito' : 'Nuevo Hábito'}
        </h2>

        <form onSubmit={handleSubmit}>
          <div className="modal-field">
            <label htmlFor="habit-name">Nombre del hábito</label>
            <input
              id="habit-name"
              type="text"
              placeholder="Ej: Meditar 10 minutos"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              maxLength={40}
            />
          </div>

          <div className="modal-field">
            <label>Elige un ícono</label>
            <div className="emoji-grid">
              {HABIT_EMOJIS.map((e) => (
                <button
                  type="button"
                  key={e}
                  className={`emoji-option${emoji === e ? ' selected' : ''}`}
                  onClick={() => setEmoji(e)}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          <button type="submit" className="modal-submit" id="submit-habit">
            {habitToEdit ? 'Guardar Cambios' : 'Crear Hábito'}
          </button>
          <button type="button" className="modal-cancel" onClick={onClose}>
            Cancelar
          </button>
        </form>
      </div>
    </div>
  );
}
