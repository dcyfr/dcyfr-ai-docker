# Development Workflow

Guide to using @dcyfr/ai-docker for local development.

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) or Docker Engine 24+
- [Docker Compose](https://docs.docker.com/compose/) v2+

## Getting Started

### 1. Environment Setup

```bash
# Copy environment template
cp .env.example .env

# Edit with your settings
nano .env
```

### 2. Start Development Stack

```bash
# Start app + database + Redis
docker compose up

# Or in background
docker compose up -d
```

This starts:
- **App** on `http://localhost:3000` with hot reload
- **PostgreSQL** on `localhost:5432`
- **Redis** on `localhost:6379`

### 3. Code Changes

Source code is bind-mounted, so changes are reflected immediately via hot reload. No rebuild needed.

### 4. Debugging

The debug port `9229` is exposed. Configure your IDE:

**VS Code** (`launch.json`):
```json
{
  "type": "node",
  "request": "attach",
  "name": "Docker: Attach",
  "port": 9229,
  "address": "localhost",
  "localRoot": "${workspaceFolder}",
  "remoteRoot": "/app",
  "restart": true
}
```

### 5. Database Access

Connect to PostgreSQL directly:

```bash
# Via docker exec
docker exec -it dcyfr-ai-db psql -U postgres -d app

# Via psql (if installed locally)
psql postgresql://postgres:postgres@localhost:5432/app
```

### 6. Running Tests

```bash
# Run tests inside the container
docker compose exec app npm test

# Or run locally
npm test
```

### 7. Stopping

```bash
# Stop and remove containers
docker compose down

# Stop and remove containers + volumes (wipes data)
docker compose down -v
```

## Common Tasks

### Rebuild After Dependency Changes

```bash
docker compose up --build
```

### View Logs

```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f app
```

### Shell Access

```bash
docker compose exec app sh
```

### Reset Everything

```bash
docker compose down -v --rmi local
docker compose up --build
```
