const rateLimit = require('express-rate-limit');

// ═══════════════════════════════════════════════
// Rate Limiter dedicado para rotas de Autenticação
// ═══════════════════════════════════════════════
// O limiter global (100 req/15min) não é suficiente contra
// brute force de credenciais. Aqui limitamos com rigor:
//   - authLimiter: 10 tentativas / 15 min por IP em /api/auth
//     (login, registro, logout, verificação de e-mail, convites)
//
// Excede o limite → 429 com Retry-After padrão do express-rate-limit.
// ═══════════════════════════════════════════════

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 10, // 10 tentativas por IP por janela
  standardHeaders: true, // Return-RateLimit-* headers
  legacyHeaders: false,  // Desabilita X-RateLimit-* (legado)
  message: {
    message: 'Muitas tentativas de autenticação. Tente novamente em 15 minutos.',
    code: 'TOO_MANY_ATTEMPTS',
  },
});

// Limiter ainda mais restrito para o login (proteção contra brute force)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // 5 tentativas de login por IP por janela
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Sucesso não consome a cota
  message: {
    message: 'Muitas tentativas de login. Tente novamente em 15 minutos.',
    code: 'TOO_MANY_LOGIN_ATTEMPTS',
  },
});

module.exports = { authLimiter, loginLimiter };
