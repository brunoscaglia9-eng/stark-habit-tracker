import { useState } from 'react';
import { supabase } from './supabaseClient';

export default function AuthModal({ onClose, onSuccess }) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [infoMsg, setInfoMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setInfoMsg('');

    if (!supabase) {
      setErrorMsg('Error: Supabase no está configurado. Revisa las variables de entorno en el archivo .env');
      return;
    }

    if (!email || !password) {
      setErrorMsg('Por favor completa todos los campos.');
      return;
    }

    if (password.length < 6) {
      setErrorMsg('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    setLoading(true);
    try {
      if (isSignUp) {
        // Sign Up
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });

        if (error) throw error;
        
        // Supabase might require email confirmation
        if (data?.user && data?.session === null) {
          setInfoMsg('¡Registro exitoso! Por favor verifica tu correo electrónico para confirmar tu cuenta y luego inicia sesión.');
          setIsSignUp(false); // Switch to login
        } else if (data?.session) {
          onSuccess(data.session);
          onClose();
        }
      } else {
        // Sign In
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        if (data?.session) {
          onSuccess(data.session);
          onClose();
        }
      }
    } catch (err) {
      console.error('Error de autenticación:', err);
      setErrorMsg(err.message || 'Ocurrió un error inesperado.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content auth-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-handle" />
        <h2 className="modal-title">
          {isSignUp ? 'Crear Cuenta' : 'Iniciar Sesión'}
        </h2>
        <p className="auth-subtitle">
          {isSignUp 
            ? 'Regístrate para guardar tu progreso de hábitos en la nube' 
            : 'Accede para sincronizar tus hábitos en todos tus dispositivos'}
        </p>

        {errorMsg && <div className="auth-message error">{errorMsg}</div>}
        {infoMsg && <div className="auth-message success">{infoMsg}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="modal-field">
            <label htmlFor="auth-email">Correo Electrónico</label>
            <input
              id="auth-email"
              type="email"
              placeholder="ejemplo@correo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <div className="modal-field">
            <label htmlFor="auth-password">Contraseña</label>
            <input
              id="auth-password"
              type="password"
              placeholder="Mínimo 6 caracteres"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <button type="submit" className="modal-submit" disabled={loading}>
            {loading ? 'Procesando...' : (isSignUp ? 'Registrarse' : 'Ingresar')}
          </button>
        </form>

        <div className="auth-toggle">
          {isSignUp ? (
            <p>
              ¿Ya tienes una cuenta?{' '}
              <button onClick={() => { setIsSignUp(false); setErrorMsg(''); }} disabled={loading}>
                Inicia sesión aquí
              </button>
            </p>
          ) : (
            <p>
              ¿No tienes una cuenta?{' '}
              <button onClick={() => { setIsSignUp(true); setErrorMsg(''); }} disabled={loading}>
                Regístrate gratis
              </button>
            </p>
          )}
        </div>

        <button type="button" className="modal-cancel" onClick={onClose} disabled={loading}>
          Cancelar
        </button>
      </div>
    </div>
  );
}
