FROM node:18-alpine AS base
WORKDIR /app

# Install dependencies
FROM base AS deps
RUN apk add --no-cache libc6-compat
COPY package.json package-lock.json* ./
COPY apps/management-api/package.json ./apps/management-api/
COPY packages ./packages/
COPY prisma ./prisma/
RUN npm ci

# Generate Prisma Client
FROM deps AS prisma
COPY prisma ./prisma
RUN cd prisma && npm install && npx prisma generate

# Build
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY --from=prisma /app/node_modules/.prisma ./node_modules/.prisma
COPY . .
RUN npm run build --workspace=apps/management-api

# Production
FROM node:18-alpine AS runner
ENV NODE_ENV=production

WORKDIR /app

RUN apk add --no-cache libc6-compat && (apk add --no-cache openssl1.1-compat || apk add --no-cache openssl)

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nestjs

COPY --from=builder --chown=nestjs:nodejs /app/apps/management-api/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/package.json ./
COPY --from=builder --chown=nestjs:nodejs /app/prisma ./prisma

# Upload directory (must be writable by the app user)
RUN mkdir -p /app/uploads/tenants && chown -R nestjs:nodejs /app/uploads

USER nestjs

EXPOSE 3000

ENV PORT=3000

CMD ["node", "dist/main.js"]
