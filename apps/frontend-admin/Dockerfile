FROM node:18-alpine AS base
WORKDIR /app

# Install dependencies
FROM base AS deps
RUN apk add --no-cache libc6-compat
COPY package.json package-lock.json* ./
COPY apps/frontend-admin/package.json ./apps/frontend-admin/
COPY packages ./packages/
RUN npm ci

# Build
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ARG VITE_API_URL=http://localhost:3000
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build --workspace=apps/frontend-admin

# Production with Nginx
FROM nginx:alpine AS runner
COPY --from=builder /app/apps/frontend-admin/dist /usr/share/nginx/html
COPY apps/frontend-admin/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
