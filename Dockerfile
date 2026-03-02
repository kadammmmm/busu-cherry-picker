# ==============================================================================
# Cherry Picker Widget v2.0 - Production Dockerfile
# Multi-stage build for optimized production image
# ==============================================================================

# -----------------------------------------------------------------------------
# Stage 1: Builder
# -----------------------------------------------------------------------------
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files first (for better caching)
COPY package*.json ./

# Install all dependencies (including devDependencies for build)
RUN npm ci

# Copy source code
COPY . .

# Build the widget bundle
RUN npm run build

# -----------------------------------------------------------------------------
# Stage 2: Production
# -----------------------------------------------------------------------------
FROM node:20-alpine AS production

# Add labels
LABEL maintainer="B+S Solutions <support@bucher-suter.com>"
LABEL version="2.0.0"
LABEL description="WxCC Voice Queue Cherry Picker Widget"

# Set working directory
WORKDIR /app

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S cherrypicker -u 1001

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production && \
    npm cache clean --force

# Copy built assets from builder stage
COPY --from=builder /app/src/build ./src/build

# Copy server and static files
COPY index.js ./
COPY src/*.js ./src/
COPY public ./public/
COPY config ./config/

# Set ownership
RUN chown -R cherrypicker:nodejs /app

# Switch to non-root user
USER cherrypicker

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5000/health || exit 1

# Set environment variables
ENV NODE_ENV=production
ENV PORT=5000

# Start the application
CMD ["node", "index.js"]
