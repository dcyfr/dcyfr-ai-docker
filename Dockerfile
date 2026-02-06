# ==============================================================================
# DCYFR AI Docker - Production Multi-Stage Dockerfile
# ==============================================================================
# Optimized multi-stage build for Node.js/TypeScript AI applications.
# Produces minimal, secure production images with non-root user.
#
# Build:  docker build -t dcyfr-ai-app .
# Run:    docker run -p 3000:3000 dcyfr-ai-app
# ==============================================================================

# ------------------------------------------------------------------------------
# Stage 1: Dependencies
# ------------------------------------------------------------------------------
FROM node:22-alpine AS deps

WORKDIR /app

# Install system dependencies for native modules (bcrypt, sqlite, etc.)
RUN apk add --no-cache python3 make g++

# Copy package files for dependency caching
COPY package.json package-lock.json* ./

# Install production dependencies only
RUN npm ci --omit=dev && npm cache clean --force

# ------------------------------------------------------------------------------
# Stage 2: Build
# ------------------------------------------------------------------------------
FROM node:22-alpine AS build

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install all dependencies (including devDependencies for build)
RUN npm ci && npm cache clean --force

# Copy source code
COPY tsconfig.json ./
COPY src/ ./src/

# Build TypeScript
RUN npm run build

# ------------------------------------------------------------------------------
# Stage 3: Production
# ------------------------------------------------------------------------------
FROM node:22-alpine AS production

# Security: add labels
LABEL maintainer="DCYFR <hello@dcyfr.ai>"
LABEL org.opencontainers.image.source="https://github.com/dcyfr/dcyfr-ai-docker"
LABEL org.opencontainers.image.description="DCYFR AI Application"

# Security: run as non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 dcyfr

WORKDIR /app

# Security: set ownership
RUN chown dcyfr:nodejs /app

# Copy production dependencies from deps stage
COPY --from=deps --chown=dcyfr:nodejs /app/node_modules ./node_modules

# Copy built application from build stage
COPY --from=build --chown=dcyfr:nodejs /app/dist ./dist
COPY --from=build --chown=dcyfr:nodejs /app/package.json ./

# Create data directory for persistent storage
RUN mkdir -p /app/data && chown dcyfr:nodejs /app/data

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:${PORT:-3000}/health || exit 1

# Switch to non-root user
USER dcyfr

# Expose port
EXPOSE ${PORT:-3000}

# Set production environment
ENV NODE_ENV=production

# Start application
CMD ["node", "dist/index.js"]
