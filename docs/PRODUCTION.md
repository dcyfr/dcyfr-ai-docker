<!-- TLP:CLEAR -->
# Production Deployment

Guide to deploying DCYFR AI applications with Docker in production.

## Prerequisites

- Docker Engine 24+ on the target server
- Docker Compose v2+
- Container registry access (GHCR, Docker Hub, ECR, etc.)

## Deployment Steps

### 1. Configure Environment

```bash
# Create production environment file
cp .env.example .env

# Set production values (REQUIRED)
export DB_PASSWORD="your-secure-password"
export REDIS_PASSWORD="your-redis-password"
export JWT_SECRET="your-jwt-secret"
```

### 2. Build Production Image

```bash
# Build locally
./scripts/build.sh --tag v1.0.0

# Or build for multiple platforms
./scripts/build.sh --tag v1.0.0 --platform linux/amd64,linux/arm64
```

### 3. Push to Registry

```bash
# Deploy to GHCR
./scripts/deploy.sh --registry ghcr.io/dcyfr --tag v1.0.0

# Deploy to Docker Hub
./scripts/deploy.sh --registry docker.io/dcyfr --tag v1.0.0
```

### 4. Start Production Stack

```bash
docker compose -f docker-compose.prod.yml up -d
```

## Security Checklist

- [ ] All secrets loaded from environment variables or secret manager
- [ ] `DB_PASSWORD` and `REDIS_PASSWORD` are strong, unique values
- [ ] SSL/TLS certificates configured in Nginx
- [ ] `read_only: true` enabled for app container
- [ ] `no-new-privileges` security option set
- [ ] Resource limits configured for all services
- [ ] Health checks enabled and verified
- [ ] Container runs as non-root user (UID 1001)
- [ ] `.env` file is not committed to version control
- [ ] Container image scanned for vulnerabilities

## SSL/TLS Setup

### Self-Signed (Testing)

```bash
mkdir -p configs/ssl
openssl req -x509 -nodes -days 365 \
  -newkey rsa:2048 \
  -keyout configs/ssl/key.pem \
  -out configs/ssl/cert.pem \
  -subj "/CN=localhost"
```

### Let's Encrypt (Production)

Use [certbot](https://certbot.eff.org/) or a Docker-based solution:

```bash
docker run -it --rm \
  -v ./configs/ssl:/etc/letsencrypt \
  certbot/certbot certonly \
  --standalone -d your-domain.com
```

## Monitoring

### Health Checks

```bash
# Check app health
curl http://localhost/health

# Check all containers
docker compose -f docker-compose.prod.yml ps

# Full health check
./configs/health-check.sh --full
```

### Logs

```bash
# Follow all logs
docker compose -f docker-compose.prod.yml logs -f

# App logs only
docker compose -f docker-compose.prod.yml logs -f app

# Last 100 lines
docker compose -f docker-compose.prod.yml logs --tail 100
```

### Resource Usage

```bash
docker stats
```

## Kubernetes Deployment

See [examples/kubernetes/](../examples/kubernetes/) for Kubernetes manifests including:
- Deployment with 3 replicas
- Service (ClusterIP)
- HorizontalPodAutoscaler (CPU/memory)
- Ingress with TLS

```bash
kubectl apply -f examples/kubernetes/
```

## Backup & Restore

### Database Backup

```bash
docker compose -f docker-compose.prod.yml exec db \
  pg_dump -U dcyfr dcyfr_production > backup.sql
```

### Database Restore

```bash
docker compose -f docker-compose.prod.yml exec -T db \
  psql -U dcyfr dcyfr_production < backup.sql
```

## Scaling

### Docker Compose

```bash
# Scale app to 3 instances (requires load balancer)
./scripts/run.sh --prod --scale 3
```

### Kubernetes

```bash
kubectl scale deployment dcyfr-ai-app -n dcyfr-ai --replicas=5
```

## Updates

### Rolling Update

```bash
# Build new version
./scripts/build.sh --tag v1.1.0

# Update production
docker compose -f docker-compose.prod.yml up -d --no-deps app
```

### Full Restart

```bash
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml up -d
```
