# Troubleshooting

Common issues and solutions when using @dcyfr/ai-docker.

## Build Issues

### "npm ci" fails with permission errors

**Problem:** File permission mismatch between host and container.

**Solution:**
```bash
# Clean and rebuild
docker compose down -v --rmi local
docker compose up --build
```

### Build takes too long

**Problem:** Docker isn't caching layers properly.

**Solution:** Ensure `package.json` is copied before source code:
```dockerfile
# ✅ Good - package.json cached separately
COPY package.json package-lock.json* ./
RUN npm ci
COPY . .

# ❌ Bad - everything invalidates cache
COPY . .
RUN npm ci
```

### Image size is too large

**Check image size:**
```bash
docker images dcyfr-ai-app
```

**Solutions:**
1. Use multi-stage build (already included in template)
2. Add files to `.dockerignore`
3. Use Alpine-based images
4. Clean npm cache: `npm cache clean --force`

## Runtime Issues

### Container exits immediately

**Check logs:**
```bash
docker compose logs app
```

**Common causes:**
- Missing environment variables
- Port already in use
- Build errors in TypeScript

### "Port already in use"

```bash
# Find process using the port
lsof -i :3000

# Kill it
kill -9 <PID>

# Or change the port
PORT=3001 docker compose up
```

### Cannot connect to database

**Check database health:**
```bash
docker compose exec db pg_isready -U postgres
```

**Common causes:**
- Database not yet ready (check `depends_on` with `condition: service_healthy`)
- Wrong `DATABASE_URL` in environment
- Database container not running

### Health check failing

**Test manually:**
```bash
# Inside container
docker compose exec app wget -qO- http://localhost:3000/health

# From host
curl http://localhost:3000/health
```

**Common causes:**
- App not listening on expected port
- Health endpoint not implemented
- App starting too slowly (increase `start_period`)

## Network Issues

### Services can't communicate

**Check network:**
```bash
docker network ls
docker network inspect dcyfr-ai-docker_dcyfr-network
```

**Solution:** Ensure all services are on the same network:
```yaml
services:
  app:
    networks:
      - dcyfr-network
  db:
    networks:
      - dcyfr-network
```

### "Host not found" errors

When connecting between containers, use service names, not `localhost`:
```bash
# ✅ Correct
DATABASE_URL=postgresql://postgres:postgres@db:5432/app

# ❌ Wrong
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/app
```

## Volume Issues

### Data not persisting

**Check volumes:**
```bash
docker volume ls
docker volume inspect dcyfr-ai-docker_pgdata
```

**Solution:** Use named volumes, not anonymous:
```yaml
volumes:
  pgdata:  # Named volume persists across restarts
    driver: local
```

### Permission denied on mounted volume

**Solution for macOS/Windows:**
```bash
# Reset Docker Desktop file sharing
# Settings → Resources → File Sharing
```

**Solution for Linux:**
```bash
# Match container user UID
chown -R 1001:1001 ./data
```

## Production Issues

### Container keeps restarting

**Check restart count:**
```bash
docker compose -f docker-compose.prod.yml ps
```

**Check exit code:**
```bash
docker inspect --format='{{.State.ExitCode}}' dcyfr-ai-app
```

### Out of memory

**Check memory usage:**
```bash
docker stats --no-stream
```

**Solution:** Increase memory limits in compose:
```yaml
deploy:
  resources:
    limits:
      memory: 2G
```

### SSL certificate issues

**Verify certificates:**
```bash
openssl x509 -in configs/ssl/cert.pem -text -noout
```

**Check Nginx can read them:**
```bash
docker compose exec nginx nginx -t
```

## Cleanup

### Remove everything

```bash
# Stop containers, remove volumes and images
docker compose down -v --rmi all

# Remove dangling images
docker image prune -f

# Nuclear option - remove all Docker data
docker system prune -a --volumes
```
