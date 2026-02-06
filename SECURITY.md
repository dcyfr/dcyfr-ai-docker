# Security Policy

## Supported Versions

| Version | Supported          |
|---------|--------------------|
| 0.1.x   | :white_check_mark: |

## Reporting a Vulnerability

If you discover a security vulnerability in `@dcyfr/ai-docker`, please report it responsibly.

**Do NOT open a public issue for security vulnerabilities.**

### How to Report

1. **Email:** Send details to [hello@dcyfr.ai](mailto:hello@dcyfr.ai) with subject line `[SECURITY] dcyfr-ai-docker`
2. **Include:**
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

### Response Timeline

- **Acknowledgment:** Within 48 hours
- **Assessment:** Within 5 business days
- **Fix/Patch:** Within 30 days for critical issues

## Security Best Practices

This template generates Docker configurations that follow security best practices:

### Container Security
- **Non-root user** — Containers run as unprivileged `dcyfr` user
- **Multi-stage builds** — Minimal production images without build tools
- **No secrets in images** — Environment variables used for sensitive values
- **Health checks** — Built-in container health monitoring
- **Read-only root filesystem** — Production configs restrict write access

### Image Security
- **Pinned versions** — No `:latest` tags; use specific version tags
- **Alpine base** — Minimal attack surface with Alpine Linux
- **No ADD instruction** — COPY used instead of ADD for predictability
- **Cache cleaning** — `npm cache clean --force` in every install layer

### Validation Rules
The built-in validator checks for 10 security rules:
1. No root user in production
2. No `:latest` image tags
3. Health check present
4. Multi-stage builds used
5. No ADD instruction (use COPY)
6. Package versions pinned
7. No secrets in environment
8. `npm ci` used (not `npm install`)
9. Package cache cleaned
10. WORKDIR set

### Network Security
- Production compose uses isolated bridge networks
- No unnecessary port exposure in production services
- Nginx reverse proxy with security headers and rate limiting

## Dependencies

This project has minimal dependencies:
- `zod` — Runtime schema validation (no known vulnerabilities)

All dependencies are audited with `npm audit` as part of CI/CD.
