# Practical 11: Containerization with Docker and Docker Compose

* **Course:** Advanced Web Development Frameworks (AWDF)
* **CO / PO:** CO5 / PO3, PO5
* **Objective:** To containerize the full-stack application using Docker and orchestrate services using Docker Compose.

---

## 1. Architecture & Container Orchestration Diagram

```text
Host System (Browser / Client)
       │
       ├──► Port 5173: http://localhost:5173  (React UI)
       ├──► Port 5000: http://localhost:5000  (Express REST API)
       └──► Port 27017: mongodb://localhost:27017 (MongoDB Database)
       │
┌──────┴────────────────────────────────────────────────────────┐
│                     Docker Engine                             │
│                                                               │
│   docker-compose.yml                                          │
│   ┌────────────────────────────────────────────────────────┐  │
│   │                      app-network                       │  │
│   │                        (bridge)                        │  │
│   │                                                        │  │
│   │   ┌──────────────────┐         ┌──────────────────┐    │  │
│   │   │     frontend     │         │     backend      │    │  │
│   │   │  (React + Vite)  │────────►│  (Node/Express)  │    │  │
│   │   │    Port: 5173    │         │    Port: 5000    │    │  │
│   │   └──────────────────┘         └────────┬─────────┘    │  │
│   │                                         │              │  │
│   │                                         ▼              │  │
│   │                                ┌──────────────────┐    │  │
│   │                                │     mongodb      │    │  │
│   │                                │  (official image)│    │  │
│   │                                │   Port: 27017    │    │  │
│   │                                └────────┬─────────┘    │  │
│   └─────────────────────────────────────────┼──────────────┘  │
│                                             ▼                 │
│                                      [mongo-data]             │
│                                   (Named Persistent Volume)   │
└───────────────────────────────────────────────────────────────┘
All 3 services build, connect, and start with: docker compose up --build
```

---

## 2. Key Configuration Files

### A. Frontend Dockerfile (`frontend/Dockerfile`)
Containerizes the React application by installing dependencies, building the optimized production bundle with Vite, and serving it on port `5173`:

```dockerfile
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
```

---

### B. Backend Dockerfile (`backend/Dockerfile`)
Containerizes the Node/Express backend with lightweight `node:20-alpine`, layer caching, production defaults, and health checks:

```dockerfile
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
```

---

### C. Docker Compose Orchestration (`docker-compose.yml`)
Orchestrates the three microservices into an isolated network with service dependency resolution and persistent volume storage:

```yaml
# ==========================================
# Practical 11: Containerization with Docker and Docker Compose
# Orchestrates: frontend (React:5173), backend (Node/Express:5000), mongodb (Mongo:27017)
# ==========================================

services:
  # ----------------------------------------
  # 1. MongoDB Database Service
  # ----------------------------------------
  mongodb:
    image: mongo:7.0
    container_name: task-manager-mongodb
    restart: unless-stopped
    ports:
      - "27017:27017"
    volumes:
      - mongo-data:/data/db
    networks:
      - app-network
    healthcheck:
      test: ["CMD", "mongosh", "--eval", "db.adminCommand('ping')"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 10s

  # ----------------------------------------
  # 2. Node.js / Express Backend Service
  # ----------------------------------------
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: task-manager-backend
    restart: unless-stopped
    ports:
      - "5000:5000"
    environment:
      - PORT=5000
      - MONGO_URI=mongodb://mongodb:27017/task-manager
      - JWT_SECRET=supersecret_jwt_key_practical7_awdf_2026
      - JWT_EXPIRES_IN=1h
      - NODE_ENV=production
    depends_on:
      mongodb:
        condition: service_healthy
    networks:
      - app-network

  # ----------------------------------------
  # 3. React / Vite Frontend Service
  # ----------------------------------------
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: task-manager-frontend
    restart: unless-stopped
    ports:
      - "5173:5173"
    depends_on:
      - backend
    networks:
      - app-network

# ------------------------------------------
# Isolated Bridge Network
# ------------------------------------------
networks:
  app-network:
    driver: bridge

# ------------------------------------------
# Persistent Named Storage Volume for MongoDB
# ------------------------------------------
volumes:
  mongo-data:
    driver: local
```

---

## 3. Network & Service Communication Mechanics

1. **DNS-Based Service Discovery:**
   - Docker's embedded DNS server automatically resolves container service names within `app-network`.
   - The backend connects to MongoDB using `mongodb://mongodb:27017/task-manager` rather than hardcoding localhost/IP.
2. **Startup Ordering via Healthchecks:**
   - The `backend` container waits for `mongodb` to pass its healthcheck (`mongosh db.adminCommand('ping')`) before starting. This prevents crash loops caused by database connection delays.
   - The `frontend` container waits for the `backend` to start before launching.
3. **Data Persistence via Named Volumes:**
   - Database records reside in the named volume `mongo-data` mapped to `/data/db`. Stopping or destroying containers does not erase task or user collections.
4. **Host Port Forwarding:**
   - `5173:5173` enables host browser access to the React UI.
   - `5000:5000` allows API testing via Postman / Thunder Client.
   - `27017:27017` enables direct database inspection with MongoDB Compass.

---

## 4. Operational Commands

### Starting the Application
```bash
# Build images and start all 3 services in the foreground
docker compose up --build

# Run in detached (background) mode
docker compose up -d --build
```

### Checking Status & Logs
```bash
# View status of running containers
docker compose ps

# View live aggregate logs across all services
docker compose logs -f

# View logs for a specific service
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f mongodb
```

### Stopping the Application
```bash
# Gracefully stop all services
docker compose stop

# Stop and remove containers and network
docker compose down

# Stop, remove containers, and purge database volumes (clean reset)
docker compose down -v
```

---

## 5. Verification Checklist

- [x] `backend/Dockerfile` configured with multi-layer caching and health checks.
- [x] `frontend/Dockerfile` configured to build and preview the React bundle on port `5173`.
- [x] `docker-compose.yml` configures `frontend`, `backend`, and `mongodb` under `app-network`.
- [x] Host port mappings (`5173`, `5000`, `27017`) allow seamless external access.
- [x] MongoDB database persists across container restarts via `mongo-data` volume.
- [x] Single-command execution: `docker compose up --build` launches the full stack with zero manual intervention.
