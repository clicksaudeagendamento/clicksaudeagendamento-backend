FROM node:18-slim AS builder

WORKDIR /app

COPY package*.json tsconfig.json ./
RUN npm install

COPY . .

RUN npm run build

FROM node:18-slim

WORKDIR /app

# Install required dependencies for Puppeteer/Chromium and timezone
RUN apt-get update && apt-get install -y \
    chromium \
    chromium-sandbox \
    fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-kacst fonts-freefont-ttf \
    tzdata \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Set timezone
ENV TZ=America/Fortaleza
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

COPY package*.json ./
RUN npm install --production

COPY --from=builder /app/dist ./dist

# Create directories for wwebjs data and uploads
RUN mkdir -p /app/.wwebjs_auth /app/.wwebjs_cache /app/sessions /app/uploads

# Set Puppeteer to use system Chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

EXPOSE 4000

CMD ["node", "dist/main.js"]
