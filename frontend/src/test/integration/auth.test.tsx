import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { loadSession, saveSession, clearSession, getSessionTenantId } from '@/services/auth/session';
import type { SessionUser, TenantSummary } from '@/types/api';

/**
 * Testes de integração: Session Storage + Autenticação
 * Valida a persistência e recuperação dos dados da sessão no localStorage.
 * Tokens (access/refresh) são httpOnly cookies — não persistem no localStorage.
 */

describe('Session Storage — Persistência da Sessão', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('deve salvar e recuperar dados da sessão', () => {
    const user: SessionUser = {
      id: 'user-1',
      name: 'Test User',
      email: 'test@example.com',
      role: 'ADMIN',
    };
    const tenant: TenantSummary = {
      id: 'tenant-1',
      name: 'Test Tenant',
      slug: 'test',
      plan: 'FREE',
      status: 'ACTIVE',
      deletedAt: null,
    };

    saveSession(user, tenant);
    const loaded = loadSession();

    expect(loaded).not.toBeNull();
    expect(loaded?.user.name).toBe('Test User');
    expect(loaded?.tenant.slug).toBe('test');
  });

  it('deve retornar null quando não há sessão', () => {
    const loaded = loadSession();
    expect(loaded).toBeNull();
  });

  it('deve limpar sessão corretamente', () => {
    const user: SessionUser = { id: '1', name: 'Test', email: 'test@test.com', role: 'MEMBER' };
    const tenant: TenantSummary = { id: '1', name: 'Test', slug: 'test', plan: 'FREE', status: 'ACTIVE', deletedAt: null };

    saveSession(user, tenant);
    expect(loadSession()).not.toBeNull();

    clearSession();
    expect(loadSession()).toBeNull();
    expect(getSessionTenantId()).toBeNull();
  });

  it('deve obter tenant ID da sessão', () => {
    const user: SessionUser = { id: '1', name: 'Test', email: 'test@test.com', role: 'ADMIN' };
    const tenant: TenantSummary = { id: 'tenant-abc', name: 'Test', slug: 'test', plan: 'PRO', status: 'ACTIVE', deletedAt: null };

    saveSession(user, tenant);
    expect(getSessionTenantId()).toBe('tenant-abc');
  });

  it('deve lidar com JSON corrompido no localStorage', () => {
    localStorage.setItem('rotina.user', 'json-invalido');
    localStorage.setItem('rotina.tenant', 'json-invalido');

    const loaded = loadSession();
    expect(loaded).toBeNull();
  });
});
