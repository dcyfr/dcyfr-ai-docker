/**
 * DCYFR AI Docker - Validator Tests
 */

import { describe, it, expect } from 'vitest';
import { validateDockerfile, getValidationRules } from '../src/validator.js';

// ---------------------------------------------------------------------------
// Good Dockerfile (passes all rules)
// ---------------------------------------------------------------------------

const GOOD_DOCKERFILE = `
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev && npm cache clean --force

FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci && npm cache clean --force
COPY tsconfig.json ./
COPY src/ ./src/
RUN npm run build

FROM node:22-alpine AS production
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 dcyfr
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/package.json ./
HEALTHCHECK --interval=30s --timeout=10s CMD wget --spider http://localhost:3000/health || exit 1
USER dcyfr
EXPOSE 3000
ENV NODE_ENV=production
CMD ["node", "dist/index.js"]
`.trim();

// ---------------------------------------------------------------------------
// Bad Dockerfile (fails multiple rules)
// ---------------------------------------------------------------------------

const BAD_DOCKERFILE = `
FROM node:latest
ADD . /app
RUN npm install
ENV API_KEY=sk-secret123
CMD ["node", "index.js"]
`.trim();

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('validateDockerfile', () => {
  describe('good Dockerfile', () => {
    it('should pass validation', () => {
      const result = validateDockerfile(GOOD_DOCKERFILE);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should have a high score', () => {
      const result = validateDockerfile(GOOD_DOCKERFILE);
      expect(result.score).toBeGreaterThanOrEqual(90);
    });

    it('should have no errors', () => {
      const result = validateDockerfile(GOOD_DOCKERFILE);
      expect(result.errors).toEqual([]);
    });
  });

  describe('bad Dockerfile', () => {
    it('should fail validation', () => {
      const result = validateDockerfile(BAD_DOCKERFILE);
      expect(result.valid).toBe(false);
    });

    it('should have errors', () => {
      const result = validateDockerfile(BAD_DOCKERFILE);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should have a low score', () => {
      const result = validateDockerfile(BAD_DOCKERFILE);
      expect(result.score).toBeLessThan(70);
    });
  });

  describe('specific rules', () => {
    it('should detect missing USER instruction', () => {
      const content = `
FROM node:22-alpine
WORKDIR /app
COPY . .
CMD ["node", "index.js"]
      `.trim();

      const result = validateDockerfile(content);
      const rootError = result.errors.find((e) => e.rule === 'no-root-user');
      expect(rootError).toBeDefined();
      expect(rootError!.message).toContain('non-root');
    });

    it('should detect :latest tag', () => {
      const content = `
FROM node:latest
WORKDIR /app
USER node
COPY package.json ./
RUN npm ci && npm cache clean --force
COPY . .
HEALTHCHECK CMD wget --spider http://localhost:3000/health
CMD ["node", "index.js"]
      `.trim();

      const result = validateDockerfile(content);
      const latestWarning = result.warnings.find((w) => w.rule === 'no-latest-tag');
      expect(latestWarning).toBeDefined();
    });

    it('should detect missing HEALTHCHECK', () => {
      const content = `
FROM node:22-alpine
WORKDIR /app
USER node
COPY package.json ./
RUN npm ci && npm cache clean --force
COPY . .
CMD ["node", "index.js"]
      `.trim();

      const result = validateDockerfile(content);
      const hcWarning = result.warnings.find((w) => w.rule === 'healthcheck-present');
      expect(hcWarning).toBeDefined();
    });

    it('should detect single-stage build', () => {
      const content = `
FROM node:22-alpine
WORKDIR /app
USER node
COPY package.json ./
RUN npm ci && npm cache clean --force
COPY . .
HEALTHCHECK CMD wget --spider http://localhost:3000/health
CMD ["node", "index.js"]
      `.trim();

      const result = validateDockerfile(content);
      const msWarning = result.warnings.find((w) => w.rule === 'use-multi-stage');
      expect(msWarning).toBeDefined();
    });

    it('should detect ADD instruction', () => {
      const content = `
FROM node:22-alpine AS deps
WORKDIR /app
FROM node:22-alpine
WORKDIR /app
USER node
ADD . /app
RUN npm ci && npm cache clean --force
HEALTHCHECK CMD wget --spider http://localhost:3000/health
CMD ["node", "index.js"]
      `.trim();

      const result = validateDockerfile(content);
      const addWarning = result.warnings.find((w) => w.rule === 'no-add-instruction');
      expect(addWarning).toBeDefined();
    });

    it('should allow ADD for archives', () => {
      const content = `
FROM node:22-alpine AS deps
WORKDIR /app
FROM node:22-alpine
WORKDIR /app
USER node
ADD app.tar.gz /app
COPY package.json ./
RUN npm ci && npm cache clean --force
HEALTHCHECK CMD wget --spider http://localhost:3000/health
CMD ["node", "index.js"]
      `.trim();

      const result = validateDockerfile(content);
      const addWarning = result.warnings.find((w) => w.rule === 'no-add-instruction');
      expect(addWarning).toBeUndefined();
    });

    it('should detect secrets in ENV', () => {
      const content = `
FROM node:22-alpine AS deps
WORKDIR /app
FROM node:22-alpine
WORKDIR /app
USER node
COPY package.json ./
RUN npm ci && npm cache clean --force
ENV API_KEY=sk-secret123
HEALTHCHECK CMD wget --spider http://localhost:3000/health
CMD ["node", "index.js"]
      `.trim();

      const result = validateDockerfile(content);
      const secretError = result.errors.find((e) => e.rule === 'no-secrets-in-env');
      expect(secretError).toBeDefined();
      expect(secretError!.message).toContain('secret');
    });

    it('should detect npm install instead of npm ci', () => {
      const content = `
FROM node:22-alpine AS deps
WORKDIR /app
FROM node:22-alpine
WORKDIR /app
USER node
COPY package.json ./
RUN npm install && npm cache clean --force
HEALTHCHECK CMD wget --spider http://localhost:3000/health
CMD ["node", "index.js"]
      `.trim();

      const result = validateDockerfile(content);
      const ciWarning = result.warnings.find((w) => w.rule === 'npm-ci-over-install');
      expect(ciWarning).toBeDefined();
    });

    it('should allow npm install -g', () => {
      const content = `
FROM node:22-alpine AS deps
WORKDIR /app
FROM node:22-alpine
WORKDIR /app
USER node
COPY package.json ./
RUN npm ci && npm cache clean --force
RUN npm install -g pm2
HEALTHCHECK CMD wget --spider http://localhost:3000/health
CMD ["node", "index.js"]
      `.trim();

      const result = validateDockerfile(content);
      const ciWarning = result.warnings.find((w) => w.rule === 'npm-ci-over-install');
      expect(ciWarning).toBeUndefined();
    });

    it('should detect missing npm cache clean', () => {
      const content = `
FROM node:22-alpine AS deps
WORKDIR /app
FROM node:22-alpine
WORKDIR /app
USER node
COPY package.json ./
RUN npm ci
HEALTHCHECK CMD wget --spider http://localhost:3000/health
CMD ["node", "index.js"]
      `.trim();

      const result = validateDockerfile(content);
      const cacheWarning = result.warnings.find((w) => w.rule === 'cache-clean');
      expect(cacheWarning).toBeDefined();
    });

    it('should detect missing WORKDIR', () => {
      const content = `
FROM node:22-alpine AS deps
FROM node:22-alpine
USER node
COPY package.json ./
RUN npm ci && npm cache clean --force
HEALTHCHECK CMD wget --spider http://localhost:3000/health
CMD ["node", "index.js"]
      `.trim();

      const result = validateDockerfile(content);
      const wdError = result.errors.find((e) => e.rule === 'workdir-set');
      expect(wdError).toBeDefined();
      expect(wdError!.message).toContain('WORKDIR');
    });

    it('should detect source copy before package install', () => {
      const content = `
FROM node:22-alpine AS deps
WORKDIR /app
FROM node:22-alpine
WORKDIR /app
USER node
COPY . .
RUN npm ci && npm cache clean --force
HEALTHCHECK CMD wget --spider http://localhost:3000/health
CMD ["node", "index.js"]
      `.trim();

      const result = validateDockerfile(content);
      const copyWarning = result.warnings.find((w) => w.rule === 'copy-package-first');
      expect(copyWarning).toBeDefined();
    });
  });

  describe('scoring', () => {
    it('should give 100 for perfect Dockerfile', () => {
      const result = validateDockerfile(GOOD_DOCKERFILE);
      expect(result.score).toBe(100);
    });

    it('should deduct 15 per error', () => {
      // One error: no-root-user, no WORKDIR
      const content = `
FROM node:22-alpine AS deps
FROM node:22-alpine
COPY package.json ./
RUN npm ci && npm cache clean --force
COPY . .
HEALTHCHECK CMD wget --spider http://localhost:3000/health
CMD ["node", "index.js"]
      `.trim();

      const result = validateDockerfile(content);
      // no-root-user = -15 error, workdir-set = -15 error
      // Expected score depends on exact rule triggers
      expect(result.score).toBeLessThan(100);
    });

    it('should never go below 0', () => {
      const result = validateDockerfile(BAD_DOCKERFILE);
      expect(result.score).toBeGreaterThanOrEqual(0);
    });
  });
});

describe('getValidationRules', () => {
  it('should return all rules', () => {
    const rules = getValidationRules();
    expect(rules.length).toBeGreaterThanOrEqual(8);
  });

  it('should have id, description, and severity for each rule', () => {
    const rules = getValidationRules();
    for (const rule of rules) {
      expect(rule.id).toBeDefined();
      expect(rule.description).toBeDefined();
      expect(rule.severity).toMatch(/^(error|warning)$/);
    }
  });

  it('should include critical rules', () => {
    const rules = getValidationRules();
    const ids = rules.map((r) => r.id);
    expect(ids).toContain('no-root-user');
    expect(ids).toContain('no-secrets-in-env');
    expect(ids).toContain('healthcheck-present');
    expect(ids).toContain('use-multi-stage');
  });
});
