import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { authService } from '../services/api';

/**
 * Página de verificación de e-mail (link del WelcomeEmail.jsx)
 * /verificar-email?token=...
 */
export function VerificarEmail() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  const [status, setStatus] = useState('loading'); // loading | success | error
  const [message, setMessage] = useState('Verificando seu e-mail...');

  useEffect(() => {
    async function verify() {
      if (!token) {
        setStatus('error');
        setMessage('Token de verificação ausente. Use o link do e-mail que você recebiu.');
        return;
      }

      try {
        const response = await authService.verificarEmail(token);
        setStatus('success');
        setMessage(response.data.message || 'E-mail verificado com sucesso!');
      } catch (err) {
        setStatus('error');
        setMessage(err.response?.data?.message || 'Não foi possível verificar seu e-mail.');
      }
    }
    verify();
  }, [token]);

  return (
    <div className="verify-page">
      <div className="verify-card">
        <div className="verify-icon">
          {status === 'loading' && <span className="spinner-large" />}
          {status === 'success' && <span className="verify-icon-success">✅</span>}
          {status === 'error' && <span className="verify-icon-error">❌</span>}
        </div>

        <h1>
          {status === 'loading' && 'Verificando...'}
          {status === 'success' && 'E-mail Verificado'}
          {status === 'error' && 'Falha na Verificación'}
        </h1>

        <p>{message}</p>

        {status === 'success' && (
          <button className="btn btn-primary" onClick={() => navigate('/', { replace: true })}>
            Ir al Painel
          </button>
        )}

        {status === 'error' && (
          <button className="btn btn-primary" onClick={() => navigate('/login')}>
            Ir al Login
          </button>
        )}
      </div>
    </div>
  );
}