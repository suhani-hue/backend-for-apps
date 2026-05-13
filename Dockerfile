# ─── Dockerfile ───────────────────────────────────────────────────────────────
# Multi-stage build: deps stage caches npm install; runtime stage is lean.
# Runs as non-root user for security best practice.

# ── Stage 1: Install dependencies ─────────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci --omit=dev && npx prisma generate

# ── Stage 2: Runtime ───────────────────────────────────────────────────────────
FROM node:20-alpine AS runtime
WORKDIR /app

# Create a non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Copy installed node_modules and generated Prisma client from stage 1
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/prisma ./prisma

# Copy application source
COPY src ./src

# Use non-root user
USER appuser

# Expose the default port (override with PORT env var)
EXPOSE 4000

# Run migrations then start the server
CMD ["sh", "-c", "npx prisma migrate deploy && node src/server.js"]
