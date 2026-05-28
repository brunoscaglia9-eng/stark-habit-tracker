import { useState, useMemo, useEffect, useRef } from 'react';
import { useLocalStorage, getGreeting, formatDateKey, calculateStreak } from './utils';
import HabitTracker from './HabitTracker';
import AuthModal from './AuthModal';
import { supabase } from './supabaseClient';
import './index.css';

const HabitsIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

const StatsIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 20V10" />
    <path d="M12 20V4" />
    <path d="M6 20v-6" />
  </svg>
);

// ─────────────────────────────────────────────────────────────────────────────
// STATS VIEW
// ─────────────────────────────────────────────────────────────────────────────
function StatsView({ habits, completions, setHabits, setCompletions, user, onOpenAuth }) {
  const [selectedHabitId, setSelectedHabitId] = useState('all');
  const [selectedHeatmapDate, setSelectedHeatmapDate] = useState(formatDateKey());
  const fileInputRef = useRef(null);

  // 1. Filtered completions based on habit selection
  const filteredCompletionsCount = useMemo(() => {
    let total = 0;
    Object.entries(completions).forEach(([key, val]) => {
      if (!val) return;
      const [habitId] = key.split('_');
      if (selectedHabitId === 'all' || habitId === selectedHabitId) {
        total++;
      }
    });
    return total;
  }, [completions, selectedHabitId]);

  // 2. Streaks
  const streakStats = useMemo(() => {
    let current = 0;
    let best = 0;

    if (selectedHabitId === 'all') {
      // Overall best streak among all habits
      habits.forEach((h) => {
        const streak = calculateStreak(h.id, completions);
        if (streak > best) best = streak;
      });
      // Current streak is defined as the best active streak today
      habits.forEach((h) => {
        const streak = calculateStreak(h.id, completions);
        if (streak > current) current = streak;
      });
    } else {
      current = calculateStreak(selectedHabitId, completions);
      // Best historical streak (simple calculation based on completions)
      // To find the best historical streak, we check all completions chronologically
      let tempStreak = 0;
      let maxStreak = 0;
      const today = new Date();
      // Scan last 180 days to find max contiguous streak
      for (let i = 180; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const key = `${selectedHabitId}_${formatDateKey(d)}`;
        if (completions[key]) {
          tempStreak++;
          if (tempStreak > maxStreak) maxStreak = tempStreak;
        } else {
          tempStreak = 0;
        }
      }
      best = Math.max(maxStreak, current);
    }

    return { current, best };
  }, [habits, completions, selectedHabitId]);

  // 3. Completion Rate (%) in the last 30 days
  const completionRate = useMemo(() => {
    if (habits.length === 0) return 0;
    const daysToTrack = 30;
    let possibleCompletions = 0;
    let actualCompletions = 0;

    const today = new Date();
    for (let i = 0; i < daysToTrack; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateKey = formatDateKey(d);

      if (selectedHabitId === 'all') {
        habits.forEach((h) => {
          possibleCompletions++;
          if (completions[`${h.id}_${dateKey}`]) {
            actualCompletions++;
          }
        });
      } else {
        possibleCompletions++;
        if (completions[`${selectedHabitId}_${dateKey}`]) {
          actualCompletions++;
        }
      }
    }

    return possibleCompletions > 0 
      ? Math.round((actualCompletions / possibleCompletions) * 100) 
      : 0;
  }, [habits, completions, selectedHabitId]);

  // 4. Weekday completion frequency (Monday - Sunday)
  const weekdayData = useMemo(() => {
    const counts = [0, 0, 0, 0, 0, 0, 0]; // Lun, Mar, Mie, Jue, Vie, Sab, Dom
    const dayNames = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

    Object.entries(completions).forEach(([key, val]) => {
      if (!val) return;
      const [habitId, dateStr] = key.split('_');
      if (selectedHabitId !== 'all' && habitId !== selectedHabitId) return;

      // Ensure the habit is still active/exists
      if (!habits.some(h => h.id === habitId)) return;

      const date = new Date(dateStr + 'T00:00:00'); // Prevent timezone shift
      const dayIndex = (date.getDay() + 6) % 7; // Monday becomes 0, Sunday 6
      if (dayIndex >= 0 && dayIndex < 7) {
        counts[dayIndex]++;
      }
    });

    const maxCount = Math.max(...counts, 1);
    return counts.map((count, index) => ({
      name: dayNames[index],
      count,
      pct: (count / maxCount) * 100,
    }));
  }, [habits, completions, selectedHabitId]);

  // 5. Heatmap Cells (Last 70 days)
  const heatmapData = useMemo(() => {
    const cells = [];
    const today = new Date();
    for (let i = 69; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateKey = formatDateKey(d);

      // Calculate completion percentage for this day
      let completedCount = 0;
      let totalCount = habits.length;

      habits.forEach((h) => {
        if (completions[`${h.id}_${dateKey}`]) {
          completedCount++;
        }
      });

      const pct = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
      
      let level = 0; // 0: 0%, 1: 1-25%, 2: 26-50%, 3: 51-75%, 4: 76-100%
      if (pct > 75) level = 4;
      else if (pct > 50) level = 3;
      else if (pct > 25) level = 2;
      else if (pct > 0) level = 1;

      cells.push({
        dateKey,
        label: d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }),
        weekday: d.toLocaleDateString('es-ES', { weekday: 'long' }),
        completedCount,
        totalCount,
        level,
        pct,
      });
    }
    return cells;
  }, [habits, completions]);

  // Selected heatmap day details
  const heatmapDayDetails = useMemo(() => {
    const cell = heatmapData.find(c => c.dateKey === selectedHeatmapDate);
    if (!cell) return null;

    const completedHabits = habits.filter(h => completions[`${h.id}_${selectedHeatmapDate}`]);
    const pendingHabits = habits.filter(h => !completions[`${h.id}_${selectedHeatmapDate}`]);

    return {
      ...cell,
      completedHabits,
      pendingHabits,
    };
  }, [heatmapData, selectedHeatmapDate, habits, completions]);

  // ─────────────────────────────────────────────────────────────────────────────
  // BACKUP OPERATIONS
  // ─────────────────────────────────────────────────────────────────────────────
  const handleExportData = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(
      JSON.stringify({ habits, completions, exportVersion: '1.0' }, null, 2)
    );
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `stark_tracker_backup_${formatDateKey()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleImportClick = () => {
    fileInputRef.current.click();
  };

  const handleImportData = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const parsed = JSON.parse(evt.target.result);
        if (parsed && Array.isArray(parsed.habits) && typeof parsed.completions === 'object') {
          // Confirm overwrite
          if (window.confirm('¿Estás seguro de que quieres importar este backup? Esto reemplazará tus hábitos y completados locales.')) {
            // Save state
            setHabits(parsed.habits);
            setCompletions(parsed.completions);

            // Sync with Supabase if logged in
            if (user && supabase) {
              try {
                // Delete existing cloud entries to overwrite
                await supabase.from('habits').delete().eq('user_id', user.id);
                await supabase.from('completions').delete().eq('user_id', user.id);

                // Insert imported habits
                if (parsed.habits.length > 0) {
                  const dbHabits = parsed.habits.map(h => ({
                    id: h.id,
                    user_id: user.id,
                    name: h.name,
                    emoji: h.emoji
                  }));
                  await supabase.from('habits').insert(dbHabits);
                }

                // Insert imported completions
                const dbCompletions = [];
                Object.entries(parsed.completions).forEach(([key, val]) => {
                  if (!val) return;
                  const [habitId, dateStr] = key.split('_');
                  // Only insert if the habit belongs to the imported set
                  if (parsed.habits.some(h => h.id === habitId)) {
                    dbCompletions.push({
                      user_id: user.id,
                      habit_id: habitId,
                      date_key: dateStr
                    });
                  }
                });

                if (dbCompletions.length > 0) {
                  await supabase.from('completions').insert(dbCompletions);
                }
              } catch (cloudErr) {
                console.error('Error al subir backup a la nube:', cloudErr);
                alert('Los datos locales se actualizaron, pero hubo un problema al sincronizar con la nube.');
              }
            }
            alert('¡Copia de seguridad importada con éxito!');
          }
        } else {
          alert('El archivo no tiene el formato correcto para StarkTracker.');
        }
      } catch (err) {
        console.error(err);
        alert('Error al leer el archivo. Asegúrate de seleccionar un archivo JSON válido.');
      }
    };
    reader.readAsText(file);
    // Reset input
    e.target.value = '';
  };

  const handleResetData = async () => {
    if (window.confirm('⚠️ ATENCIÓN: Esto eliminará todos tus hábitos y tu historial de racha permanentemente. ¿Deseas continuar?')) {
      if (window.confirm('¿Estás absolutamente seguro? Esta acción no se puede deshacer.')) {
        setHabits([]);
        setCompletions({});

        if (user && supabase) {
          try {
            await supabase.from('habits').delete().eq('user_id', user.id);
            await supabase.from('completions').delete().eq('user_id', user.id);
          } catch (err) {
            console.error('Error al vaciar base de datos en la nube:', err);
          }
        }
        alert('Datos restablecidos con éxito.');
      }
    }
  };

  const handleLogout = async () => {
    if (supabase) {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Error al cerrar sesión:', error);
      } else {
        // Clear state to avoid data leakage
        setHabits([]);
        setCompletions({});
        alert('Sesión cerrada. Los datos de la nube se han removido de la pantalla local.');
      }
    }
  };

  return (
    <div className="stats-view-container">
      {/* 🟢 Connection Status Card */}
      <div className="auth-status-card">
        {user ? (
          <div className="auth-status-logged">
            <div className="auth-status-info">
              <span className="indicator online" />
              <div>
                <p className="auth-user-email">{user.email}</p>
                <span className="auth-sync-text">Sincronizado con la nube ☁️</span>
              </div>
            </div>
            <button className="auth-btn-secondary logout" onClick={handleLogout}>
              Cerrar Sesión
            </button>
          </div>
        ) : (
          <div className="auth-status-logged">
            <div className="auth-status-info">
              <span className="indicator offline" />
              <div>
                <p className="auth-user-email">Modo Local (Offline)</p>
                <span className="auth-sync-text">Tus datos solo se guardan en este dispositivo</span>
              </div>
            </div>
            <button className="auth-btn-primary" onClick={onOpenAuth}>
              Crear Cuenta / Entrar
            </button>
          </div>
        )}
      </div>

      <div className="section-header">
        <h2>
          <span className="emoji">📊</span>
          Estadísticas
        </h2>
        {habits.length > 0 && (
          <select 
            className="habit-select-dropdown"
            value={selectedHabitId}
            onChange={(e) => setSelectedHabitId(e.target.value)}
          >
            <option value="all">⚡ Todos los hábitos</option>
            {habits.map(h => (
              <option key={h.id} value={h.id}>{h.emoji} {h.name}</option>
            ))}
          </select>
        )}
      </div>

      {/* Main cards */}
      <div className="gym-stats">
        <div className="gym-stat-card">
          <div className="gs-value gradient">{streakStats.current}</div>
          <div className="gs-label">Racha actual</div>
        </div>
        <div className="gym-stat-card">
          <div className="gs-value gradient">{streakStats.best}</div>
          <div className="gs-label">Mejor Racha</div>
        </div>
      </div>

      <div className="gym-stats">
        <div className="gym-stat-card">
          <div className="gs-value gradient">{completionRate}%</div>
          <div className="gs-label">Últimos 30 días</div>
        </div>
        <div className="gym-stat-card">
          <div className="gs-value gradient">{filteredCompletionsCount}</div>
          <div className="gs-label">Total completados</div>
        </div>
      </div>

      {/* 🟢 Heatmap Section */}
      <div className="heatmap-section">
        <div className="heatmap-card">
          <div className="heatmap-title">Mapa de Calor (Últimos 70 días)</div>
          <div className="heatmap-grid-70">
            {heatmapData.map((cell) => (
              <button
                key={cell.dateKey}
                className={`heatmap-cell-btn level-${cell.level} ${selectedHeatmapDate === cell.dateKey ? 'selected' : ''}`}
                onClick={() => setSelectedHeatmapDate(cell.dateKey)}
                title={`${cell.label}: ${cell.completedCount}/${cell.totalCount} completados (${Math.round(cell.pct)}%)`}
              />
            ))}
          </div>
          <div className="heatmap-labels">
            <span>0%</span>
            <div style={{ display: 'flex', gap: 4 }}>
              <span className="heatmap-legend level-1" />
              <span className="heatmap-legend level-2" />
              <span className="heatmap-legend level-3" />
              <span className="heatmap-legend level-4" />
            </div>
            <span>100%</span>
          </div>

          {/* Interactive Heatmap day details */}
          {heatmapDayDetails && (
            <div className="heatmap-day-details">
              <div className="hdd-header">
                <span className="hdd-date">{heatmapDayDetails.weekday}, {heatmapDayDetails.label}</span>
                <span className="hdd-summary">
                  {heatmapDayDetails.completedCount}/{heatmapDayDetails.totalCount} hechos
                </span>
              </div>
              <div className="hdd-lists">
                {heatmapDayDetails.completedHabits.map(h => (
                  <div key={h.id} className="hdd-item done">
                    <span className="hdd-emoji">{h.emoji}</span>
                    <span className="hdd-name">{h.name}</span>
                    <span className="hdd-badge">Hecho</span>
                  </div>
                ))}
                {heatmapDayDetails.pendingHabits.map(h => (
                  <div key={h.id} className="hdd-item pending">
                    <span className="hdd-emoji">{h.emoji}</span>
                    <span className="hdd-name">{h.name}</span>
                    <span className="hdd-badge">Pendiente</span>
                  </div>
                ))}
                {heatmapDayDetails.totalCount === 0 && (
                  <div className="hdd-empty">No hay hábitos creados para esta fecha.</div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 🟢 Weekday Frequency Chart */}
      <div className="heatmap-section">
        <div className="heatmap-card">
          <div className="heatmap-title">Frecuencia por Día de la Semana</div>
          <div className="weekday-bars-container">
            {weekdayData.map((d) => (
              <div key={d.name} className="weekday-bar-row">
                <span className="wb-label">{d.name}</span>
                <div className="wb-track">
                  <div 
                    className="wb-fill" 
                    style={{ width: `${d.pct}%` }}
                  />
                </div>
                <span className="wb-value">{d.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 🟢 Backup & Settings Section */}
      <div className="heatmap-section" style={{ marginBottom: 20 }}>
        <div className="heatmap-card settings-card">
          <div className="heatmap-title">Respaldo y Configuración</div>
          <p className="settings-desc">
            Exporta tus datos locales para crear una copia de seguridad o impórtala en otro navegador.
          </p>
          <div className="settings-btn-grid">
            <button className="settings-btn export" onClick={handleExportData}>
              📥 Exportar Backup
            </button>
            <button className="settings-btn import" onClick={handleImportClick}>
              📤 Importar Backup
            </button>
          </div>
          <input 
            type="file" 
            ref={fileInputRef} 
            style={{ display: 'none' }} 
            accept=".json"
            onChange={handleImportData}
          />
          <button className="settings-btn-danger" onClick={handleResetData}>
            ⚠️ Restablecer Todo
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// APP CONTAINER
// ─────────────────────────────────────────────────────────────────────────────
export default function App() {
  const [activeTab, setActiveTab] = useState('habits');
  const [habits, setHabits] = useLocalStorage('stark_habits', []);
  const [completions, setCompletions] = useLocalStorage('stark_completions', {});
  const [user, setUser] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);

  const todayKey = formatDateKey();
  const greeting = getGreeting();

  // 1. Fetch cloud data on Login
  const fetchCloudData = async (userId) => {
    if (!supabase) return;
    try {
      // 1. Fetch habits
      const { data: dbHabits, error: habitsErr } = await supabase
        .from('habits')
        .select('*')
        .eq('user_id', userId);

      if (habitsErr) throw habitsErr;

      // 2. Fetch completions
      const { data: dbCompletions, error: completionsErr } = await supabase
        .from('completions')
        .select('*')
        .eq('user_id', userId);

      if (completionsErr) throw completionsErr;

      // Format habits from DB
      const formattedHabits = dbHabits.map(h => ({
        id: h.id,
        name: h.name,
        emoji: h.emoji
      }));

      // Format completions from DB
      const formattedCompletions = {};
      dbCompletions.forEach(c => {
        formattedCompletions[`${c.habit_id}_${c.date_key}`] = true;
      });

      return { habits: formattedHabits, completions: formattedCompletions };
    } catch (err) {
      console.error('Error fetching cloud data:', err);
    }
  };

  // 2. Sync local data to Cloud (Merge)
  const syncLocalToCloud = async (userId, localHabits, localCompletions) => {
    if (!supabase) return;
    try {
      // Fetch current cloud data
      const cloudData = await fetchCloudData(userId);
      if (!cloudData) return;

      // Merge Habits
      const mergedHabits = [...cloudData.habits];
      const habitsToInsert = [];

      localHabits.forEach(lh => {
        if (!mergedHabits.some(ch => ch.id === lh.id)) {
          mergedHabits.push(lh);
          habitsToInsert.push({
            id: lh.id,
            user_id: userId,
            name: lh.name,
            emoji: lh.emoji
          });
        }
      });

      if (habitsToInsert.length > 0) {
        const { error } = await supabase.from('habits').insert(habitsToInsert);
        if (error) throw error;
      }

      // Merge Completions
      const mergedCompletions = { ...cloudData.completions };
      const completionsToInsert = [];

      Object.entries(localCompletions).forEach(([key, val]) => {
        if (!val) return;
        const [habitId, dateStr] = key.split('_');

        // Only insert if it doesn't already exist in the cloud completions
        if (!mergedCompletions[`${habitId}_${dateStr}`]) {
          mergedCompletions[`${habitId}_${dateStr}`] = true;
          completionsToInsert.push({
            user_id: userId,
            habit_id: habitId,
            date_key: dateStr
          });
        }
      });

      if (completionsToInsert.length > 0) {
        const { error } = await supabase.from('completions').insert(completionsToInsert);
        if (error) throw error;
      }

      // Update state with unified merged data
      setHabits(mergedHabits);
      setCompletions(mergedCompletions);
    } catch (err) {
      console.error('Error syncing local data to cloud:', err);
    }
  };

  // 3. Auth Listener
  useEffect(() => {
    if (!supabase) return;

    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        // Sync local storage data with Supabase upon loading
        syncLocalToCloud(session.user.id, habits, completions);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user);
        syncLocalToCloud(session.user.id, habits, completions);
      } else {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // ─────────────────────────────────────────────────────────────────────────────
  // EVENT HANDLERS
  // ─────────────────────────────────────────────────────────────────────────────
  const handleToggleHabit = async (habitId, dateKey) => {
    const key = `${habitId}_${dateKey}`;
    const wasCompleted = !!completions[key];

    // 1. Update local state
    setCompletions((prev) => {
      const updated = { ...prev };
      if (wasCompleted) {
        delete updated[key];
      } else {
        updated[key] = true;
      }
      return updated;
    });

    // 2. Sync to cloud if logged in
    if (user && supabase) {
      try {
        if (wasCompleted) {
          // Delete
          await supabase
            .from('completions')
            .delete()
            .match({ user_id: user.id, habit_id: habitId, date_key: dateKey });
        } else {
          // Insert
          await supabase
            .from('completions')
            .insert({ user_id: user.id, habit_id: habitId, date_key: dateKey });
        }
      } catch (err) {
        console.error('Error updating completion in cloud:', err);
      }
    }
  };

  const handleAddHabit = async (habit) => {
    // 1. Update local state
    setHabits((prev) => [...prev, habit]);

    // 2. Sync to cloud if logged in
    if (user && supabase) {
      try {
        await supabase
          .from('habits')
          .insert({
            id: habit.id,
            user_id: user.id,
            name: habit.name,
            emoji: habit.emoji
          });
      } catch (err) {
        console.error('Error adding habit to cloud:', err);
      }
    }
  };

  const handleDeleteHabit = async (habitId) => {
    // 1. Update local state
    setHabits((prev) => prev.filter((h) => h.id !== habitId));
    setCompletions((prev) => {
      const updated = { ...prev };
      Object.keys(updated).forEach((key) => {
        if (key.startsWith(habitId + '_')) {
          delete updated[key];
        }
      });
      return updated;
    });

    // 2. Sync to cloud if logged in
    if (user && supabase) {
      try {
        // Cascade delete in db table habits will delete completions
        await supabase
          .from('habits')
          .delete()
          .match({ user_id: user.id, id: habitId });
      } catch (err) {
        console.error('Error deleting habit from cloud:', err);
      }
    }
  };

  const handleEditHabit = async (updatedHabit) => {
    // 1. Update local state
    setHabits((prev) =>
      prev.map((h) => (h.id === updatedHabit.id ? updatedHabit : h))
    );

    // 2. Sync to cloud if logged in
    if (user && supabase) {
      try {
        await supabase
          .from('habits')
          .update({
            name: updatedHabit.name,
            emoji: updatedHabit.emoji,
          })
          .match({ user_id: user.id, id: updatedHabit.id });
      } catch (err) {
        console.error('Error editing habit in cloud:', err);
      }
    }
  };

  // Header quick statistics calculations
  const completedToday = habits.filter(
    (h) => completions[`${h.id}_${todayKey}`]
  ).length;

  let bestStreak = 0;
  habits.forEach((h) => {
    const streak = calculateStreak(h.id, completions);
    if (streak > bestStreak) bestStreak = streak;
  });

  const weeklyCompletionRate = useMemo(() => {
    if (habits.length === 0) return 0;
    let possible = 0;
    let completed = 0;
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = formatDateKey(d);
      habits.forEach(h => {
        possible++;
        if (completions[`${h.id}_${key}`]) {
          completed++;
        }
      });
    }
    return possible > 0 ? Math.round((completed / possible) * 100) : 0;
  }, [habits, completions]);

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
          <div className="stat-icon">📈</div>
          <div className="stat-value">{weeklyCompletionRate}%</div>
          <div className="stat-label">Semana</div>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'habits' && (
        <HabitTracker
          habits={habits}
          completions={completions}
          onToggle={handleToggleHabit}
          onAdd={handleAddHabit}
          onDelete={handleDeleteHabit}
          onEdit={handleEditHabit}
        />
      )}
      {activeTab === 'stats' && (
        <StatsView 
          habits={habits} 
          completions={completions} 
          setHabits={setHabits}
          setCompletions={setCompletions}
          user={user}
          onOpenAuth={() => setShowAuthModal(true)}
        />
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
          className={`nav-item${activeTab === 'stats' ? ' active' : ''}`}
          onClick={() => setActiveTab('stats')}
          id="nav-stats"
        >
          <StatsIcon />
          <span>Stats</span>
        </button>
      </nav>

      {/* Auth Modal */}
      {showAuthModal && (
        <AuthModal 
          onClose={() => setShowAuthModal(false)}
          onSuccess={(session) => {
            setUser(session.user);
            syncLocalToCloud(session.user.id, habits, completions);
          }}
        />
      )}
    </div>
  );
}
