# Base image
FROM node:20-slim AS base
# Install OpenSSL for Prisma and wget for healthchecks
RUN apt-get update -y && apt-get install -y openssl wget curl && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# Dependencies and Build stage
FROM base AS builder
# libssl-dev may be needed for some native compilations during build
RUN apt-get update -y && apt-get install -y libssl-dev && rm -rf /var/lib/apt/lists/*
COPY package*.json ./
RUN npm ci
COPY prisma ./prisma/
RUN npx prisma generate
COPY . .
RUN NODE_OPTIONS="--max_old_space_size=512" npm run build && test -d dist || (echo "Build failed to generate dist folder! Possible OOM." && exit 1)

# Production stage
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./
# Install only production dependencies
RUN npm ci --only=production

# Copy Prisma schema and regenerate client for the production environment
COPY prisma ./prisma/
RUN npx prisma generate

# Copy the built application from the builder stage
COPY --from=builder /app/dist ./dist

# Create a non-root user (optional but recommended)
# RUN addgroup --system --gid 1001 nodejs
# RUN adduser --system --uid 1001 nestjs
# USER nestjs

EXPOSE 3000

CMD ["npm", "run", "start:prod"]
