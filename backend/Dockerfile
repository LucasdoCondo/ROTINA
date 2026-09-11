# =============================================================
#  ROTINA — Backend Dockerfile (desenvolvimento)
#
#  Build otimizado com cache de dependências:
#    docker build -t rotina-backend ./backend
#
#  Uso com docker compose (já configurado em ../docker-compose.yml):
#    docker compose up -d backend
# =============================================================

FROM node:20-alpine AS base
WORKDIR /app

# Dependências de compilação (argon2 pode precisar)
RUN apk add --no-cache libc6-compat openssl

# Cópia apenas do necessário para cache de camada
COPY package.json package-lock.json* ./
COPY prisma ./prisma/

FROM base AS deps
RUN npm ci

FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

FROM base AS runtime
ENV NODE_ENV=development
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY . .

EXPOSE 3000

# Em dev: usa tsx watch (hot reload). Para produção, troque por:
# CMD ["node", "dist/server.js"]
CMD ["npx", "tsx", "watch", "src/server.ts"]
