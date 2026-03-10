# Backend Dockerfile - Using Debian slim for Prisma compatibility
FROM node:20-slim

# Install OpenSSL for Prisma and wget for healthchecks
RUN apt-get update -y && apt-get install -y openssl libssl-dev wget curl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy prisma schema first for generate
COPY prisma ./prisma/
RUN npx prisma generate

# Copy source code
COPY . .

# Build the application
RUN npm run build

EXPOSE 3000

CMD ["npm", "run", "start:prod"]
