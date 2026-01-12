# Build stage
FROM node:20-slim AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev)
RUN npm ci

# Copy source and build
COPY src ./src
COPY tsconfig.json ./
RUN npx esbuild src/server.ts --bundle --platform=node --format=esm --outfile=dist/index.js --packages=external

# Remove devDependencies to minimize node_modules for production
RUN npm prune --omit=dev && npm cache clean --force

# Production stage
FROM node:20-slim AS production

# Install dumb-init for proper signal handling and curl for health checks
RUN apt-get update && apt-get install -y --no-install-recommends dumb-init curl && \
    rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN groupadd --gid 1001 nodejs && \
    useradd --uid 1001 --gid nodejs --shell /bin/bash --create-home nodejs

WORKDIR /app

# Copy the built index.js and PRE-PRUNED node_modules
# This avoids running 'npm ci' a second time in the slower production stage
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/package*.json ./

# Copy documentation directories
COPY --chown=nodejs:nodejs docs-mainnet ./docs-mainnet
COPY --chown=nodejs:nodejs docs-cashscript ./docs-cashscript

# Switch to non-root user
USER nodejs

# Expose the port
EXPOSE 8081

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8081/health || exit 1

# Use dumb-init for proper signal handling
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]
