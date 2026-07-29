/**
 * ErrorBoundary - Captura erros de renderização em componentes filhos
 *
 * Em produção, exibe uma tela amigável e reporta ao Sentry (se configurado).
 * Em desenvolvimento, mostra o stack trace completo no console e na tela.
 */
import { Component } from 'react';
import { logger } from '../lib/logger';
import { Sentry } from '../utils/sentry';
import './ErrorBoundary.css';

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Log estruturado com Pino
    logger.error(
      {
        err: error,
        componentStack: errorInfo.componentStack,
      },
      'Erro capturado pelo ErrorBoundary'
    );

    // Reporta ao Sentry com contexto adicional
    Sentry.captureException(error, {
      contexts: {
        react: {
          componentStack: errorInfo.componentStack,
        },
      },
      tags: {
        errorBoundary: 'react',
      },
    });
  }

  render() {
    if (this.state.hasError) {
      const { error } = this.state;
      const isDev = import.meta.env.DEV;

      return (
        <div className="error-boundary">
          <div className="error-boundary-content">
            <h1>Algo deu errado!</h1>
            <p className="error-boundary-message">
              Nossa equipe foi notificada do erro.
            </p>

            {isDev && error && (
              <details className="error-boundary-details">
                <summary>Detalhes técnicos</summary>
                <pre className="error-boundary-stack">
                  {error.message}
                  {'\n\n'}
                  {error.stack}
                </pre>
              </details>
            )}

            <button
              className="error-boundary-button"
              onClick={() => window.location.reload()}
            >
              Recarregar página
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}