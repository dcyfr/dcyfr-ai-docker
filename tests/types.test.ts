/**
 * DCYFR AI Docker - Types / Schema Tests
 */

import { describe, it, expect } from 'vitest';
import {
  DockerBuildConfigSchema,
  ComposeServiceSchema,
  ComposeConfigSchema,
  GenerateOptionsSchema,
  SECURITY_RULES,
} from '../src/types.js';

describe('DockerBuildConfigSchema', () => {
  it('should parse with defaults', () => {
    const result = DockerBuildConfigSchema.parse({});
    expect(result.nodeVersion).toBe('22-alpine');
    expect(result.port).toBe(3000);
    expect(result.workdir).toBe('/app');
    expect(result.multiStage).toBe(true);
    expect(result.nonRoot).toBe(true);
    expect(result.healthCheck).toBe(true);
    expect(result.nativeDeps).toBe(false);
    expect(result.labels).toEqual({});
  });

  it('should accept custom values', () => {
    const result = DockerBuildConfigSchema.parse({
      nodeVersion: '20-slim',
      port: 8080,
      workdir: '/opt/app',
      multiStage: false,
      nonRoot: false,
    });
    expect(result.nodeVersion).toBe('20-slim');
    expect(result.port).toBe(8080);
    expect(result.workdir).toBe('/opt/app');
    expect(result.multiStage).toBe(false);
    expect(result.nonRoot).toBe(false);
  });

  it('should reject invalid port', () => {
    expect(() => DockerBuildConfigSchema.parse({ port: -1 })).toThrow();
    expect(() => DockerBuildConfigSchema.parse({ port: 0 })).toThrow();
  });
});

describe('ComposeServiceSchema', () => {
  it('should parse minimal service', () => {
    const result = ComposeServiceSchema.parse({
      name: 'app',
    });
    expect(result.name).toBe('app');
    expect(result.ports).toEqual([]);
    expect(result.environment).toEqual({});
    expect(result.volumes).toEqual([]);
    expect(result.dependsOn).toEqual([]);
    expect(result.restart).toBe('unless-stopped');
  });

  it('should parse full service', () => {
    const result = ComposeServiceSchema.parse({
      name: 'db',
      image: 'postgres:16-alpine',
      ports: ['5432:5432'],
      environment: { POSTGRES_DB: 'app' },
      volumes: ['pgdata:/var/lib/postgresql/data'],
      dependsOn: [],
      healthCheck: '["CMD-SHELL", "pg_isready"]',
      restart: 'always',
    });
    expect(result.name).toBe('db');
    expect(result.image).toBe('postgres:16-alpine');
    expect(result.healthCheck).toContain('pg_isready');
  });

  it('should reject invalid restart policy', () => {
    expect(() =>
      ComposeServiceSchema.parse({
        name: 'app',
        restart: 'never',
      }),
    ).toThrow();
  });
});

describe('ComposeConfigSchema', () => {
  it('should parse compose config', () => {
    const result = ComposeConfigSchema.parse({
      projectName: 'test',
      services: [{ name: 'app' }],
    });
    expect(result.projectName).toBe('test');
    expect(result.services).toHaveLength(1);
    expect(result.volumes).toEqual([]);
    expect(result.network).toBe('dcyfr-network');
  });
});

describe('GenerateOptionsSchema', () => {
  it('should parse with defaults', () => {
    const result = GenerateOptionsSchema.parse({});
    expect(result.appType).toBe('api');
    expect(result.database).toBe('none');
    expect(result.redis).toBe(false);
    expect(result.nginx).toBe(false);
    expect(result.target).toBe('both');
    expect(result.outputDir).toBe('.');
  });

  it('should accept valid app types', () => {
    for (const type of ['api', 'web', 'worker', 'static'] as const) {
      const result = GenerateOptionsSchema.parse({ appType: type });
      expect(result.appType).toBe(type);
    }
  });

  it('should accept valid database types', () => {
    for (const db of ['none', 'postgres', 'mysql', 'sqlite'] as const) {
      const result = GenerateOptionsSchema.parse({ database: db });
      expect(result.database).toBe(db);
    }
  });

  it('should reject invalid app type', () => {
    expect(() => GenerateOptionsSchema.parse({ appType: 'invalid' })).toThrow();
  });
});

describe('SECURITY_RULES', () => {
  it('should have at least 8 rules', () => {
    expect(SECURITY_RULES.length).toBeGreaterThanOrEqual(8);
  });

  it('should include critical rules', () => {
    expect(SECURITY_RULES).toContain('no-root-user');
    expect(SECURITY_RULES).toContain('no-secrets-in-env');
    expect(SECURITY_RULES).toContain('healthcheck-present');
    expect(SECURITY_RULES).toContain('use-multi-stage');
    expect(SECURITY_RULES).toContain('pin-versions');
  });
});
