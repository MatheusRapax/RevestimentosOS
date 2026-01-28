# Frontend Dockerfile
FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source code
COPY . .

EXPOSE 3000

# Development mode with hot reload - listen on all interfaces
CMD ["npm", "run", "dev", "--", "-H", "0.0.0.0"]
