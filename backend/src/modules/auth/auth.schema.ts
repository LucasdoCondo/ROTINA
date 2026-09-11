import { z } from 'zod';

/**
 * Schemas de autenticación/registro.
 * Nota de seguridad: reglas de contraseña alineadas con OWASP ASVS
 * (≥12 chars + mayúscula + minúscula + número + símbolo).
 */

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const PASSWORD_RE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/;

const email = z
  .string()
  .trim()
  .toLowerCase()
  .email()
  .max(255);

export const registerSchema = z
  .object({
    tenantName: z.string().trim().min(2).max(255),
    tenantSlug: z
      .string()
      .trim()
      .toLowerCase()
      .min(3)
      .max(120)
      .regex(SLUG_RE, 'Slug: minúsculas, números y guiones (-)'),
    adminName: z.string().trim().min(2).max(255),
    adminEmail: email,
    password: z
      .string()
      .min(12, 'Mínimo 12 caracteres')
      .max(128)
      .regex(PASSWORD_RE, 'Debe incluir mayúscula, minúscula, número y símbolo'),
  })
  .strict();

export const loginSchema = z
  .object({
    tenantSlug: z.string().trim().toLowerCase().min(3).max(120),
    email: email,
    password: z.string().min(1).max(128),
  })
  .strict();

export const refreshSchema = z
  .object({
    refreshToken: z.string().min(32).max(256),
  })
  .strict();

export const logoutSchema = z
  .object({
    refreshToken: z.string().min(32).max(256),
  })
  .strict();

export type RegisterInput = z.output<typeof registerSchema>;
export type LoginInput = z.output<typeof loginSchema>;