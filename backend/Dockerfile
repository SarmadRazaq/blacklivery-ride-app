# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --ignore-scripts

COPY tsconfig.json ./
COPY src/ ./src/

RUN npm run build

# Stage 2: Production
FROM node:20-alpine

ENV NODE_ENV=production
# Set your production domains (comma-separated). Override at deploy time via:
#   docker run -e CORS_ORIGINS=https://app.blacklivery.com,https://admin.blacklivery.com ...
ENV CORS_ORIGINS=https://app.blacklivery.com,https://admin.blacklivery.com

WORKDIR /app

# Security: run as non-root user
RUN addgroup -g 1001 -S appgroup && \
    adduser -S appuser -u 1001 -G appgroup

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

COPY --from=builder /app/dist ./dist

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:${PORT:-5000}/health || exit 1

USER appuser

EXPOSE ${PORT:-5000}

CMD ["node", "dist/server.js"]
