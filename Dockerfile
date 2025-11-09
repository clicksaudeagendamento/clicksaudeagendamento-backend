FROM node:18-slim AS builder

WORKDIR /app

COPY package*.json tsconfig.json ./
RUN npm ci --omit=dev

COPY . .
RUN npm run build


FROM node:18-slim

WORKDIR /app

# Instalar dependências mínimas para Chromium (usado pelo Puppeteer)
RUN apt-get update && apt-get install -y \
    chromium \
    fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-kacst fonts-freefont-ttf \
    --no-install-recommends && \
    rm -rf /var/lib/apt/lists/*

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium \
    NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist

# Diretórios persistentes
RUN mkdir -p /app/.wwebjs_auth /app/.wwebjs_cache /app/sessions /app/uploads && \
    chown -R node:node /app

USER node

EXPOSE 4000

CMD ["node", "dist/main.js"]
