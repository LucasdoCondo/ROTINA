# ROTINA Backend — Multi-tenant SaaS Core

Backend en **Node.js + TypeScript (strict) + Express + Prisma + PostgreSQL** con
aislamiento multi-tenant de tres capas, autenticación JWT + refresh rotativo,
RBAC y módulo de Chamados (Tickets).

## Stack

| Capa | Tecnología |
|------|-----------|
| Runtime | Node.js ≥ 18.18 |
| Framework | Express 4 |
| Lenguaje | TypeScript (`strict: true`) |
| DB / ORM | PostgreSQL 16 · Prisma 6 |
| Validación | Zod 3 |
| Seguridad | Helmet, CORS, express-rate-limit, Argon2id, JWT HS256 |
| Logging | Pino + pino-http (request-id) |

## Arquitectura (capas)

```
http → middleware (helmet · cors · rate-limit · auth · tenant · validate)
     → routes (v1)
     → controllers (thin)
     → services (reglas de negocio + RBAC)
     → repositories (tenant-aware)
     → Prisma Client + Extensión tenant (inyección automática de tenant_id)
     → PostgreSQL
```

### Aislamiento multi-tenant — 3 capas de defensa

1. **Middleware `tenantIsolation`** (`src/middleware/tenant.ts`)
   Extrae `tenant_id` del JWT (claim) o del header `x-tenant-id`, valida el
   formato (UUID), comprueba que el tenant exista y esté `ACTIVE` (caché TTL
   30s) e inyecta el contexto en `AsyncLocalStorage` (`src/context/tenant.ts`).
2. **Extensión de Prisma** (`src/lib/tenant-extension.ts`)
   `$extends` que inyecta `tenant_id` automáticamente en todas las operaciones
   (`create`, `findMany`, `findFirst`, `count`, `updateMany`, …). Aunque un
   servicio olvide filtrar, la query nunca cruza tenant.
3. **Repositorios tenant-aware** (`src/lib/tenant-repository.ts`)
   Helpers que cruzan `{ id, tenantId }` y `deletedAt: null` de forma explícita
   en cada acceso.

> El modelo `Tenant` (raíz) NO está scoped: se consulta con el cliente raíz.

## Estructura

```
src/
├── server.ts / app.ts          # Entrypoint y factory Express
├── config/                     # env (Zod) y cliente Prisma (+ extensión)
├── context/tenant.ts           # AsyncLocalStorage del tenant
├── domain/constants.ts         # Enums del dominio + máquina de estados
├── lib/                        # errores, jwt, password, logger, tenant-ext
├── middleware/                 # auth, rbac, tenant, validate, rate-limit, errors
├── modules/                    # auth · tenants · tickets (controller/service/...)
├── routes/v1.ts                # Router API v1 (aplica auth+tenant)
└── types/                      # contratos HTTP y DTOs
prisma/schema.prisma            # Modelos multi-tenant (Tenant, User, Session, Ticket)
```

## Puesta en marcha

```bash
# 1. PostgreSQL (compose de desarrollo en la raíz del repositorio)
npm run db:up            # equivale a: docker compose -f ../docker-compose.yml up -d
#    En PRODUCCIÓN el banco es gestionado (Neon): DATABASE_URL con sslmode=require

# 2. Variables de entorno
cp .env.example .env            # y edita los secretos

# 3. Dependencias + generación del cliente Prisma
npm install
npm run db:generate
npm run db:validate

# 4. Migración + seed de desarrollo
npm run db:migrate -- --name init
npm run db:seed

# 5. Servidor de desarrollo (tsx watch) en http://localhost:3000
npm run dev
```
## API (v1)

### Públicos
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET  | `/api/v1/health`          | liveness + estado de la BD |
| POST | `/api/v1/auth/register`   | crea tenant + admin (retorna tokens) |
| POST | `/api/v1/auth/login`      | login por tenantSlug + email |
| POST | `/api/v1/auth/refresh`    | rota el refresh token (opaco, hasheado) |
| POST | `/api/v1/auth/logout`     | revoca la sesión |

### Protegidos (Bearer + tenant scoped)
| Método | Ruta | RBAC |
|--------|------|------|
| GET   | `/api/v1/tenants/me`          | autenticado |
| PATCH | `/api/v1/tenants/me`          | ADMIN |
| GET   | `/api/v1/tickets`             | autenticado (filtros + paginación) |
| POST  | `/api/v1/tickets`             | autenticado |
| GET   | `/api/v1/tickets/:id`         | autenticado |
| PATCH | `/api/v1/tickets/:id`         | dueño / ADMIN / AGENT |
| PATCH | `/api/v1/tickets/:id/assign`  | ADMIN / AGENT |
| DELETE| `/api/v1/tickets/:id`         | ADMIN (soft delete) |

### Ejemplo de flujo

```bash
# Registrar un tenant
curl -X POST localhost:3000/api/v1/auth/register \
  -H 'content-type: application/json' \
  -d '{"tenantName":"Acme","tenantSlug":"acme","adminName":"Ana","adminEmail":"ana@acme.io","password":"Sup3r-S3cret-Dev!"}'

# Crear un ticket (usar el accessToken devuelto)
curl -X POST localhost:3000/api/v1/tickets \
  -H "authorization: Bearer <accessToken>" -H 'content-type: application/json' \
  -d '{"subject":"No puedo iniciar sesión","description":"Recibo credenciales inválidas aunque la contraseña es correcta.","priority":"HIGH"}'
```

## Seguridad aplicada (OWASP)

- **A07 Identificación/Autenticación**: Argon2id (64MB / t=3 / p=1),
  access JWT 15m, refresh token opaco de 256 bits **almacenado solo hasheado**,
  rotación por refresh y revocación por logout.
- **A01 Control de acceso**: RBAC por rol (ADMIN/AGENT/MEMBER) + aislamiento
  de tenant por request (3 capas) + estado del usuario validado.
- **A03 Inyección**: Prisma usa queries parametrizadas; validación estricta
  Zod (los objetos `.strict()` rechazan campos desconocidos).
- **A05 Misconfig**: Helmet, sin `x-powered-by`, CORS explícito, errores sin
  stack en producción, secrets fuera de logs.
- **Rate limiting** por tenant/IP; caché de tenant con TTL; detección de
  reuso de refresh tokens (revoca la sesión ante replay).

## Trade-offs documentados

| Decisión | Alternativa futura |
|----------|--------------------|
| `@@unique([tenantId, email])` impide re-registrar un email tras soft delete | job de purga (hard delete) / tabla de emails borrados |
| Número de ticket = `último+1` con retry ante P2002 | secuencia Postgres por tenant |
| Caché de actividad de tenant en memoria (TTL 30s) | Redis en clúster multi-instancia |
| Refresh tokens en body (API/mobile first) | cookie `httpOnly` + `SameSite=Strict` para web |
| Role/status embebidos en el access token (TTL 15m) | `token_version` para revocación al instante |

## Roadmap

1. ✅ Setup & Multi-tenant Core + schema (tenants, users, sessions, tickets)
2. ⏭ Auth & RBAC avanzado (invitaciones, gestión de roles, miembros del tenant)
3. ⏭ CRM · E-commerce · Membros/Planos (multi-tenant)
4. ⏭ Frontend React/Vite (TanStack Query + Router v6 + RBAC client-side)
5. ⏭ Redis (sesiones/caché), observabilidad, CI/CD, tests de integración

## Validación rápida sin BD

```bash
npm run smoke   # arranca la app y verifica health/routes/validación/404
```