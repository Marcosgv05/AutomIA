# ============================================
# AutomIA Backend - Dockerfile
# ============================================

# --- Stage 1: Build ---
FROM node:20-alpine AS builder

WORKDIR /app

# Copia arquivos de dependências
COPY package*.json ./
COPY prisma ./prisma/

# Instala dependências (incluindo dev para build)
RUN npm ci

# Copia código fonte
COPY . .

# Gera cliente Prisma
RUN npx prisma generate

# Compila TypeScript
RUN npm run build

# --- Stage 2: Production ---
FROM node:20-alpine AS production

WORKDIR /app

# Cria usuário não-root para segurança
RUN addgroup -g 1001 -S nodejs && \
    adduser -S automia -u 1001

# Copia apenas o necessário do stage de build
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package*.json ./

# Gera cliente Prisma no container de produção
RUN npx prisma generate

# Muda para usuário não-root
USER automia

# Expõe porta
EXPOSE 4000

# Variáveis de ambiente padrão
ENV NODE_ENV=production
ENV PORT=4000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:4000/health || exit 1

# Script de inicialização que roda migrations antes de iniciar
# No Railway, o startCommand no railway.toml faz isso, mas mantemos fallback
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]
