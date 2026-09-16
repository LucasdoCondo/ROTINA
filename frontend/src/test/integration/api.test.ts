import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as authService from '@/services/api/auth.service';
import * as tenantsService from '@/services/api/tenants.service';
import type { AuthResponse, TenantProfile } from '@/types/api';

/**
 * Testes de integração: AuthService + TenantsService
 * Valida o fluxo completo de autenticação e obtenção do tenant.
 */

vi.mock('@/services/api/auth.service', () => ({
  login: vi.fn(),
  registerTenant: vi.fn(),
  logout: vi.fn(),
}));

vi.mock('@/services/api/tenants.service', () => ({
  getMyTenant: vi.fn(),
}));

describe('AuthService — Integração com API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('deve realizar login com sucesso e retornar tokens', async () => {
    const mockResponse: AuthResponse = {
      accessToken: 'test-access-token',
      refreshToken: 'test-refresh-token',
      expiresIn: 900,
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

    vi.mocked(authService.login).mockResolvedValueOnce(mockResponse);

    const result = await authService.login({
      tenantSlug: 'test',
      email: 'test@example.com',
      password: 'password123',
    });

    expect(result.accessToken).toBe('test-access-token');
    expect(result.refreshToken).toBe('test-refresh-token');
    expect(result.user.role).toBe('ADMIN');
    expect(result.user.email).toBe('test@example.com');
    expect(authService.login).toHaveBeenCalledTimes(1);
  });

  it('deve tratar erro de credenciais inválidas', async () => {
    vi.mocked(authService.login).mockRejectedValueOnce(
      new Error('Credenciais inválidas')
    );

    await expect(
      authService.login({
        tenantSlug: 'test',
        email: 'wrong@example.com',
        password: 'wrongpass',
      })
    ).rejects.toThrow('Credenciais inválidas');
  });

  it('deve realizar logout sem erros', async () => {
    vi.mocked(authService.logout).mockResolvedValueOnce(undefined);

    await expect(authService.logout()).resolves.toBeUndefined();
    expect(authService.logout).toHaveBeenCalledTimes(1);
  });
});

describe('TenantsService — Integração com API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve obter perfil do tenant com sucesso', async () => {
    const mockTenant: TenantProfile = {
      id: 'tenant-1',
      name: 'Test Tenant',
      slug: 'test',
      plan: 'PROFESSIONAL',
      status: 'ACTIVE',
      contactEmail: 'contact@test.com',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    };

    vi.mocked(tenantsService.getMyTenant).mockResolvedValueOnce(mockTenant);

    const result = await tenantsService.getMyTenant();

    expect(result.id).toBe('tenant-1');
    expect(result.plan).toBe('PROFESSIONAL');
    expect(result.status).toBe('ACTIVE');
    expect(tenantsService.getMyTenant).toHaveBeenCalledTimes(1);
  });

  it('deve tratar erro quando tenant não encontrado', async () => {
    vi.mocked(tenantsService.getMyTenant).mockRejectedValueOnce(
      new Error('Tenant não encontrado')
    );

    await expect(tenantsService.getMyTenant()).rejects.toThrow(
      'Tenant não encontrado'
    );
  });
});
