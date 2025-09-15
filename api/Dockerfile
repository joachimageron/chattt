# Multi-stage build for NestJS API
FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Copy package files
COPY package*.json ./
# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Development stage
FROM base AS dev
WORKDIR /app

# Copy package files
COPY package*.json ./
# Install all dependencies for development
RUN npm ci

# Copy source code
COPY . .

# Expose the port
EXPOSE 4000

# Start development server
CMD ["npm", "run", "start:dev"]

# Build stage
FROM base AS builder
WORKDIR /app

# Copy package files
COPY package*.json ./
# Install all dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM base AS production
WORKDIR /app

# Copy production dependencies
COPY --from=deps /app/node_modules ./node_modules
# Copy built application
COPY --from=builder /app/dist ./dist
# Copy package.json for metadata
COPY package*.json ./

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nestjs -u 1001

# Change ownership
RUN chown -R nestjs:nodejs /app
USER nestjs

# Expose the port
EXPOSE 4000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:4000/health || exit 1

# Start production server
CMD ["npm", "run", "start:prod"]