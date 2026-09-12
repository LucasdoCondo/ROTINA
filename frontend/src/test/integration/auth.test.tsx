import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { loadSession, saveSession, clearSession, getAccessToken, getSessionTenantId } from '@/services/auth/session';
import type { StoredSession } from '@/services/auth/session';

/**
 * Testes de integração: Session Storage + Autenticação
 * Valida a persistência e recuperação da sessão no localStorage.
 */

describe('Session Storage — Persistência da Sessão', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('deve salvar e recuperar sessão completa', () => {
    const session: StoredSession = {
      accessToken: 'test-access-token',
      refreshToken: 'test-refresh-token',
      user: {
        id: 'user-1',
        name: 'Test User',
        email: 'test@example.com',
        role: 'ADMIN',
      },
      tenant: {
        id: 'tenant-1',
        name: 'Test Tenant',
        slug: 'test',
        plan: 'FREE',
        status: 'ACTIVE',
        deletedAt: null,
      },
    };

    saveSession(session);
    const loaded = loadSession();

    expect(loaded).not.toBeNull();
    expect(loaded?.accessToken).toBe('test-access-token');
    expect(loaded?.user.name).toBe('Test User');
    expect(loaded?.tenant.slug).toBe('test');
  });

  it('deve retornar null quando não há sessão', () => {
    const loaded = loadSession();
    expect(loaded).toBeNull();
  });

  it('deve limpar sessão corretamente', () => {
    const session: StoredSession = {
      accessToken: 'token',
      refreshToken: 'refresh',
      user: { id: '1', name: 'Test', email: 'test@test.com', role: 'MEMBER' },
      tenant: { id: '1', name: 'Test', slug: 'test', plan: 'FREE', status: 'ACTIVE', deletedAt: null },
    };

    saveSession(session);
    expect(loadSession()).not.toBeNull();

    clearSession();
    expect(loadSession()).toBeNull();
    expect(getAccessToken()).toBeNull();
    expect(getSessionTenantId()).toBeNull();
  });

  it('deve obter tenant ID da sessão', () => {
    const session: StoredSession = {
      accessToken: 'token',
      refreshToken: 'refresh',
      user: { id: '1', name: 'Test', email: 'test@test.com', role: 'ADMIN' },
      tenant: { id: 'tenant-abc', name: 'Test', slug: 'test', plan: 'PRO', status: 'ACTIVE', deletedAt: null },
    };

    saveSession(session);
    expect(getSessionTenantId()).toBe('tenant-abc');
  });

  it('deve lidar com JSON corrompido no localStorage', () => {
    localStorage.setItem('rotina.accessToken', 'token');
    localStorage.setItem('rotina.refreshToken', 'refresh');
    localStorage.setItem('rotina.user', 'json-invalido');
    localStorage.setItem('rotina.tenant', 'json-invalido');

    const loaded = loadSession();
    expect(loaded).toBeNull();
  });
});
