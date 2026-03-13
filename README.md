# @dcyfr/ai-docker

> **⚠️ PACKAGE DEPRECATED ON NPM (February 27, 2026)**  
> This package was published to npm but has been **deprecated**. It is a template collection, not a library.  
> **Use this repo as:**
> - 📋 GitHub Template: Click "Use this template" above
> - 📦 Direct clone: `git clone https://github.com/dcyfr/dcyfr-ai-docker`
> - 📖 Reference: Copy Dockerfiles into your project
>
> This package is now marked `"private": true` to prevent future publication.

[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/dcyfr/dcyfr-ai-docker)

[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?style=flat-square&logo=docker&logoColor=white)](https://www.docker.com/)
[![Template](https://img.shields.io/badge/Type-Template-blue?style=flat-square&logo=github)](https://github.com/dcyfr/dcyfr-ai-docker)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)](./LICENSE)

**Production-ready Docker containerization templates for DCYFR AI applications.**

Multi-stage Dockerfiles, Docker Compose configurations, Nginx reverse proxy, health checks, security hardening, and Kubernetes manifests — all designed to work with any DCYFR AI template.

## ✨ Features

- 🐳 **Multi-Stage Builds** — Optimized layer caching, minimal production images
- 🔒 **Security Hardened** — Non-root user, read-only filesystem, no-new-privileges
- 🏥 **Health Checks** — Container-level, HTTP, database, and Redis health probes
- 🔄 **Hot Reload** — Development Dockerfile with bind mounts and debug port
- 🌐 **Nginx Reverse Proxy** — Rate limiting, gzip, security headers, WebSocket support
- 📦 **Docker Compose** — Development and production configurations
- ☸️ **Kubernetes Ready** — Deployment, Service, HPA, and Ingress manifests
- 🛡️ **Dockerfile Validator** — Lint Dockerfiles against DCYFR best practices
- ⚙️ **Generator** — Programmatically generate Docker configs for any app type
- 📊 **Resource Management** — CPU/memory limits, restart policies

## 🚀 Quick Start

### Development

```bash
# Start development stack (app + Postgres + Redis)
docker compose up

# Start in background
docker compose up -d

# View logs
docker compose logs -f

# Stop
docker compose down
```

### Production

```bash
# Create .env from template
cp .env.example .env
# Edit .env with production values

# Build and start production stack
docker compose -f docker-compose.prod.yml up -d

# View logs
docker compose -f docker-compose.prod.yml logs -f
```

### Build Only

```bash
# Build production image
./scripts/build.sh

# Build with custom tag
./scripts/build.sh --tag v1.0.0

# Build development image
./scripts/build.sh --dev
```

## 📁 Project Structure

```
dcyfr-ai-docker/
├── Dockerfile                 # Production multi-stage build
├── Dockerfile.dev             # Development with hot reload
├── docker-compose.yml         # Development stack
├── docker-compose.prod.yml    # Production stack (Nginx + security)
├── .dockerignore              # Build context exclusions
├── src/
│   ├── index.ts               # Public API exports
│   ├── types.ts               # Zod schemas & TypeScript types
│   ├── validator.ts           # Dockerfile linter (10 rules)
│   ├── generator.ts           # Dockerfile & Compose generator
│   ├── validate.ts            # CLI: validate a Dockerfile
│   └── generate.ts            # CLI: generate Docker configs
├── configs/
│   ├── nginx.conf             # Production Nginx configuration
│   └── health-check.sh        # Container health check script
│   └── network-policy/
│       └── agent-egress-allowlist.txt # Allowed outbound endpoints for agent containers
├── scripts/
│   ├── build.sh               # Build Docker images
│   ├── run.sh                 # Run Docker stack
│   ├── deploy.sh              # Build, tag, push to registry
│   └── apply-agent-egress-policy.sh # Apply DOCKER-USER egress allowlist for agents
├── examples/
│   ├── full-stack.yml         # Full-stack (app + DB + Redis + Nginx)
│   ├── microservices.yml      # Multi-service architecture
│   └── kubernetes/
│       ├── deployment.yaml    # K8s Deployment + Service + HPA
│       └── ingress.yaml       # K8s Ingress with TLS
├── tests/
│   ├── validator.test.ts      # Validator tests
│   └── generator.test.ts      # Generator tests
└── docs/
    ├── DEVELOPMENT.md         # Development workflow guide
    ├── PRODUCTION.md          # Production deployment guide
    └── TROUBLESHOOTING.md     # Common issues & solutions
```

## 🔍 Dockerfile Validator

Validate any Dockerfile against 10 best-practice rules:

```bash
# Validate the included Dockerfile
npm run validate

# Validate a custom Dockerfile
npm run validate -- path/to/Dockerfile
```

**Rules checked:**
| Rule | Severity | Description |
|------|----------|-------------|
| `no-root-user` | Error | Container must not run as root |
| `no-secrets-in-env` | Error | No secrets in ENV instructions |
| `workdir-set` | Error | WORKDIR must be explicitly set |
| `no-latest-tag` | Warning | Pin base image versions |
| `healthcheck-present` | Warning | Include HEALTHCHECK instruction |
| `use-multi-stage` | Warning | Use multi-stage builds |
| `no-add-instruction` | Warning | Prefer COPY over ADD |
| `copy-package-first` | Warning | Copy package.json before source |
| `npm-ci-over-install` | Warning | Use npm ci for reproducibility |
| `cache-clean` | Warning | Clean npm cache after install |

## ⚙️ Configuration Generator

Programmatically generate Docker configurations:

```bash
# Generate for API with Postgres and Redis
npm run generate -- --type api --db postgres --redis

# Generate production only
npm run generate -- --target production

# Generate to custom directory
npm run generate -- --output ./my-project
```

### Programmatic API

```typescript
import { generateDockerfile, generateProject, validateDockerfile } from '@dcyfr/ai-docker';

// Generate a Dockerfile
const dockerfile = generateDockerfile({
  nodeVersion: '22-alpine',
  port: 3000,
  multiStage: true,
  nonRoot: true,
  healthCheck: true,
});

// Generate full project
const files = generateProject({
  appType: 'api',
  database: 'postgres',
  redis: true,
  target: 'both',
});

// Validate
const result = validateDockerfile(dockerfile);
console.log(result.score); // 100
```

## 🏗️ Architecture

### Multi-Stage Build (Production)

```
Stage 1: deps        → npm ci --omit=dev (production deps only)
Stage 2: build       → npm ci + tsc (compile TypeScript)
Stage 3: production  → Copy deps + dist (minimal final image)
```

### Security Hardening

- **Non-root user**: `dcyfr:nodejs` (UID/GID 1001)
- **Read-only filesystem**: `read_only: true` in production compose
- **No new privileges**: `security_opt: no-new-privileges:true`
- **Resource limits**: CPU and memory constraints per service
- **Health checks**: HTTP endpoint monitoring at `/health`
- **Secrets management**: Required env vars with `${VAR:?error}` syntax

### Agent Egress Allowlist (Task 1.1.4)

Autonomous agent containers should only reach required upstream endpoints.

- Allowlist file: `configs/network-policy/agent-egress-allowlist.txt`
- Apply policy script: `scripts/apply-agent-egress-policy.sh`
- Default allowed hosts:
  - `github.com`
  - `registry.npmjs.org`
  - `objects.githubusercontent.com`

Apply the policy on the Docker host:

```bash
sudo ./scripts/apply-agent-egress-policy.sh
```

Dry-run to preview rules:

```bash
DRY_RUN=1 ./scripts/apply-agent-egress-policy.sh
```

### Nginx Reverse Proxy

- Rate limiting: 30 req/s API, 5 req/s auth endpoints
- Gzip compression for text/JSON/XML/SVG
- Security headers (CSP, X-Frame-Options, HSTS-ready)
- WebSocket upgrade support
- Keepalive connections to upstream

## 🧪 Testing

```bash
npm test              # Run all tests
npm run test:watch    # Watch mode
npm run test:coverage # Coverage report
```

## 📦 Compatibility

Works with all DCYFR AI templates:

| Template | Supported | Notes |
|----------|-----------|-------|
| dcyfr-ai-agents | ✅ | Agent server containerization |
| dcyfr-ai-rag | ✅ | RAG pipeline + vector DB |
| dcyfr-ai-graphql | ✅ | GraphQL API server |
| dcyfr-ai-api | ✅ | REST API server |
| dcyfr-ai-web | ✅ | Next.js full-stack |
| dcyfr-ai-react | ✅ | Static SPA (Nginx serve) |
| dcyfr-ai-nodejs | ✅ | Express server |
| dcyfr-ai-code-gen | ✅ | Code generation service |

## 🤝 Contributing

Contributions welcome! See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

## 📄 License

MIT — see [LICENSE](./LICENSE) for details.

---

**Built with ❤️ by [DCYFR](https://dcyfr.ai)** | [GitHub](https://github.com/dcyfr)
