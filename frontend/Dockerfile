# ==========================================
# Practical 11: Frontend Dockerfile (React + Vite)
# Builds production bundle and serves on port 5173
# ==========================================
FROM node:20-alpine

# Set working directory inside container
WORKDIR /app

# Copy dependency definitions
COPY package*.json ./

# Install all dependencies (including Vite for preview serving)
RUN npm install

# Copy application source code
COPY . .

# Build production bundle (with Practical 8 code-splitting)
RUN npm run build

# Expose Vite preview port
EXPOSE 5173

# Health check to ensure frontend is serving
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5173 || exit 1

# Serve the built application on 0.0.0.0:5173
CMD ["npm", "run", "preview", "--", "--host", "0.0.0.0", "--port", "5173"]
