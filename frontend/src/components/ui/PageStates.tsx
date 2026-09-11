import { Link } from 'react-router-dom';

/** 403 — exibida quando o usuário autenticado não tem o role exigido. */
export function ForbiddenPage() {
  return (
    <div className="page-state">
      <h1>403</h1>
      <p>Você não tem permissão para acessar esta área.</p>
      <Link className="btn btn-primary" to="/">
        Voltar ao dashboard
      </Link>
    </div>
  );
}

/** 404 — rota inexistente no frontend. */
export function NotFoundPage() {
  return (
    <div className="page-state">
      <h1>404</h1>
      <p>Página não encontrada.</p>
      <Link className="btn btn-primary" to="/">
        Ir para o dashboard
      </Link>
    </div>
  );
}
