# Changelog

## 1.0.2

### Patch Changes

- 2a0de2c: test: final OIDC Trusted Publisher authentication test

  This changeset triggers a final publication test with improved OIDC token handling in the release workflow. Expected: successful publication of v1.0.2 using GitHub Actions OIDC identity without npm tokens.

## 1.0.1

### Patch Changes

- 9289456: test: verify OIDC Trusted Publisher authentication

  This patch release tests the newly configured Trusted Publisher OIDC authentication workflow. The publication should succeed using GitHub Actions OIDC tokens instead of npm secrets, demonstrating enhanced supply chain security through cryptographic provenance.

## 1.0.0

### Major Changes

- 44b4b82: 🎉 Production-ready v1.0.0 release - Docker containerization templates

  **Major Features:**

  - ✅ TypeScript compilation support (npm run build)
  - ✅ Complete type declarations (.d.ts files in dist/)
  - ✅ Comprehensive API documentation (3,000+ words)
  - ✅ 99.5%+ test coverage (79 tests passing)
  - ✅ Zero ESLint errors
  - ✅ Production-ready Docker/Compose generators
  - ✅ Security-first validation with scoring
  - ✅ Multi-stage build templates

  **API Stability:**

  - Semantic versioning commitment
  - 6-month deprecation grace period
  - Backward compatibility guaranteed within major versions

  **Quality Metrics:**

  - 99.56% line coverage, 99.15% branch coverage
  - 79/79 tests passing (100% pass rate)
  - Zero security vulnerabilities
  - Zero build errors
  - Zero lint errors

  **Breaking Changes:**
  None - fully backward compatible with v0.1.x

  **Migration:**
  No code changes required. Simply upgrade:

  ```bash
  npm install @dcyfr/ai-docker@^1.0.0
  ```

  **Documentation:**

  - Complete API reference in docs/API.md
  - 15+ code examples
  - Security best practices guide
  - Type definitions for all APIs

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
