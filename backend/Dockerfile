# ==========================================
# Practical 11: Backend Dockerfile (Node.js/Express)
# ==========================================
FROM node:20-alpine

# Set working directory inside container
WORKDIR /app

# Copy package files first to leverage Docker layer caching
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy application source code
COPY . .

# Expose API port
EXPOSE 5000

# Set default environment variables
ENV PORT=5000 \
    NODE_ENV=production

# Health check to ensure service is responding
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5000/tasks/cache/stats || exit 1

# Start server
CMD ["node", "server.js"]
