import argon2 from 'argon2';
import { env } from '../config/env.js';

/**
 * Hash de contraseñas con Argon2id (OWASP Top 10 → A07:2021 Auth Failures).
 * Parámetros configurables vía entorno, alineados con OWASP Cheat Sheet.
 */
export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: env.ARGON2_MEMORY_KB,
    timeCost: env.ARGON2_TIME_COST,
    parallelism: env.ARGON2_PARALLELISM,
    hashLength: 32,
  });
}

/**
 * Verificación con comparación segura (la librería argon2 implementa
 * timing-safe compare para el hash PHC string).
 */
export async function verifyPassword(hash: string, password: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, password);
  } catch {
    // Hash corrupto o formato inválido → siempre false, nunca lanzar
    return false;
  }
}