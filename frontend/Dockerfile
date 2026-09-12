# =============================================================
#  ROTINA — Frontend (React + Vite)
# =============================================================
FROM node:20-alpine

WORKDIR /app

# Copia dependências primeiro (cache de camada)
COPY package.json package-lock.json* ./

# Instala dependências
RUN npm install

# Copia o restante do código
COPY . .

# Expoõe a porta do Vite
EXPOSE 5173

# Inicia o servidor de desenvolvimento
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
