import { useState, type FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { ApiError } from '@/types/api';

/**
 * Tela de login — POST /auth/login (tenantSlug + credenciais).
 * Em sucesso, o AuthProvider persiste a sessão e volta ao destino original
 * (location.state.from, definido pelo ProtectedRoute).
 */
export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? '/';

  const [tenantSlug, setTenantSlug] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const mutation = useMutation({
    mutationFn: login,
    onSuccess: () => navigate(from, { replace: true }),
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    mutation.mutate({
      tenantSlug: tenantSlug.trim().toLowerCase(),
      email: email.trim().toLowerCase(),
      password,
    });
  }

  const errorMessage =
    mutation.isError && mutation.error instanceof ApiError
      ? mutation.error.status === 422
        ? 'Verifique os campos informados.'
        : mutation.error.message
      : 'Não foi possível entrar. Tente novamente.';

  return (
    <main className="auth-page">
      <form className="auth-card" onSubmit={handleSubmit}>
        <h1>ROTINA</h1>
        <p className="auth-subtitle">Acesse o painel da sua empresa</p>

        {mutation.isError && <div className="alert alert-error">{errorMessage}</div>}

        <label className="field">
          <span>Empresa (slug)</span>
          <input
            className="input"
            value={tenantSlug}
            onChange={(event) => setTenantSlug(event.target.value)}
            placeholder="acme"
            autoComplete="organization"
            required
            minLength={3}
          />
        </label>

        <label className="field">
          <span>E-mail</span>
          <input
            className="input"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="voce@empresa.com"
            autoComplete="email"
            required
          />
        </label>

        <label className="field">
          <span>Senha</span>
          <input
            className="input"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            required
          />
        </label>

        <button className="btn btn-primary btn-block" type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? 'Entrando…' : 'Entrar'}
        </button>

        <div className="auth-demo">
          <p>Ambiente de desenvolvimento (seed):</p>
          <code>acme · admin@acme.io · Sup3r-S3cret-Dev!</code>
        </div>
      </form>
    </main>
  );
}
