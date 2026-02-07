# Changelog

## 0.1.1

### Patch Changes

- 74df24c: Migrate to changesets for automated publishing with Trusted Publishers

All notable changes to `@dcyfr/ai-docker` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-02-06

### Added

- Dockerfile generator with multi-stage build support
- Docker Compose generator for dev and production environments
- Dockerfile validator with 10 security rules and scoring
- Zod schema validation for all configuration types
- PostgreSQL and MySQL database service generation
- Redis cache service generation
- CLI tools for validation (`validate`) and generation (`generate`)
- Production-ready `Dockerfile` with non-root user, health checks
- Development `Dockerfile.dev` with hot reload support
- `docker-compose.yml` for local development (app + postgres + redis)
- `docker-compose.prod.yml` with nginx, resource limits, security hardening
- Nginx config with rate limiting, gzip, and security headers
- Health check script with HTTP, database, and Redis checks
- Shell scripts for build, run, and deploy workflows
- Example configurations: full-stack, microservices, Kubernetes
- Documentation: development, production, and troubleshooting guides
- ESLint + TypeScript strict mode configuration
- Vitest test suite with >80% coverage target
- SECURITY.md with vulnerability reporting policy
- CONTRIBUTING.md with development guidelines
