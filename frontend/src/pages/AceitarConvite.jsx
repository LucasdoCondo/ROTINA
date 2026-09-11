import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { authService } from '../services/api';

/**
 * Página de aceptación de convite (link del InviteEmail.jsx)
 * /aceitar-convite?token=...
 *
 * Al aceptar, se auto-loguea al usuário y redirige al Dashboard.
 */
export function AceitarConvite() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  const [formData, setFormData] = useState({ nome: '', senha: '', confirmarSenha: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Validaciones básicas
    if (!formData.nome || formData.nome.trim().length < 2) {
      setError('O nome deve ter pelo menos 2 caracteres');
      setLoading(false);
      return;
    }

    if (formData.senha.length < 6) {
      setError('A senha deve ter no mínimo 6 caracteres');
      setLoading(false);
      return;
    }

    if (formData.senha !== formData.confirmarSenha) {
      setError('As senhas não coincidem');
      setLoading(false);
      return;
    }

    try {
      const response = await authService.aceitarConvite({
        token,
        nome: formData.nome,
        senha: formData.senha,
      });

      const { token: authToken, usuario } = response.data;

      // Guardar sesión y redirigir al dashboard
      localStorage.setItem('token', authToken);
      localStorage.setItem('user', JSON.stringify(usuario));
      localStorage.setItem('hasSeenOnboarding', 'true');

      setSuccess(true);
      setTimeout(() => navigate('/', { replace: true }), 1200);
    } catch (err) {
      const data = err.response?.data || {};
      setError(data.message || 'Erro ao aceitar o convite. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="invite-page">
      <div className="invite-card">
        <div className="invite-header">
          <h1>🎉 Você foi convidado!</h1>
          <p>Complete seu registro para unirse à equipe.</p>
        </div>

        {error && <div className="invite-error">⚠️ {error}</div>}
        {success && <div className="invite-success">✅ Convite aceito! Redirecionando...</div>}

        <form onSubmit={handleSubmit} className="invite-form">
          <div className="form-group">
            <label htmlFor="nome">Nome Completo *</label>
            <input
              type="text"
              id="nome"
              name="nome"
              value={formData.nome}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="senha">Senha *</label>
            <input
              type="password"
              id="senha"
              name="senha"
              value={formData.senha}
              onChange={handleChange}
              required
              minLength="6"
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirmarSenha">Confirmar Senha *</label>
            <input
              type="password"
              id="confirmarSenha"
              name="confirmarSenha"
              value={formData.confirmarSenha}
              onChange={handleChange}
              required
              minLength="6"
            />
          </div>

          <button type="submit" className="btn btn-primary invite-btn" disabled={loading}>
            {loading ? 'Aceptando...' : 'Aceptar Convite'}
          </button>
        </form>

        <div className="invite-footer">
          <p>
            Já tem uma conta?{' '}
            <a href="/login" onClick={(e) => { e.preventDefault(); navigate('/login'); }}>
              Fazer login
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}