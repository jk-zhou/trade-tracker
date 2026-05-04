FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Next.js build (will output to .next/standalone)
RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

# Install openssl, prisma CLI, su-exec, and shadow for runtime PUID/PGID support
RUN apk add --no-cache openssl su-exec shadow
RUN npm install -g prisma@6.19.3

ENV NODE_ENV=production
# Default database URL for Docker; this maps to the persistent volume
ENV DATABASE_URL="file:/app/data/trade-tracker.db"
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

ENV PUID=1000
ENV PGID=1000

RUN addgroup --system --gid ${PGID} nodejs
RUN adduser --system --uid ${PUID} nextjs

# Set up data directory
RUN mkdir -p /app/data && chown nextjs:nodejs /app/data

COPY --from=builder /app/public ./public

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Automatically leverage output traces to reduce image size
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
# Copy Prisma schema & engine binaries needed for db push
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma

# Entrypoint script
COPY --chown=nextjs:nodejs docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

# No USER directive; we start as root to allow PUID/PGID modification in entrypoint
# The entrypoint will use su-exec to drop privileges.

EXPOSE 3000

ENTRYPOINT ["./docker-entrypoint.sh"]
