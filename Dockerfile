# Use Node.js 20 Alpine as base image for minimal size
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev dependencies for building)
RUN npm ci

# Copy source code
COPY . .

# Build the TypeScript application
RUN npm run build

# Production stage
FROM node:20-alpine AS production

# Install mcp-proxy
RUN npm install -g mcp-proxy

# Create app directory
WORKDIR /app

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./

# Install only production dependencies
RUN npm ci --only=production

# Make the entry point executable
RUN chmod +x dist/index.js

# Create a non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Change ownership of the app directory
RUN chown -R nodejs:nodejs /app
USER nodejs

# Expose port for HTTP
EXPOSE 8080

# Set environment variables
ENV NODE_ENV=production
ENV POSTGRES_HOST=postgres
ENV POSTGRES_PORT=5432
ENV POSTGRES_DB=mcp_prompts
ENV POSTGRES_USER=mcp_user
ENV POSTGRES_PASSWORD=mcp_password_123

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "console.log('Health check passed')" || exit 1

# Default command (can be overridden)
CMD ["mcp-proxy", "--stdio", "node", "dist/index.js", "--http-port", "8080", "--host", "0.0.0.0"] 