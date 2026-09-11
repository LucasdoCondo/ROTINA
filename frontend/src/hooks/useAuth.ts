/**
 * Hook público de autenticação.
 * Implementação vive em features/auth (o estado é da feature de auth);
 * o re-export mantém a convenção `@/hooks/*` para o restante do app.
 */
export { useAuth } from '@/features/auth/auth-context';
