/**
 * DCYFR AI Docker - Generator Tests
 */

import { describe, it, expect } from 'vitest';
import { generateDockerfile, generateCompose, generateProject } from '../src/generator.js';
import { validateDockerfile } from '../src/validator.js';

// ---------------------------------------------------------------------------
// generateDockerfile
// ---------------------------------------------------------------------------

describe('generateDockerfile', () => {
  it('should generate a valid Dockerfile with defaults', () => {
    const output = generateDockerfile();
    expect(output).toContain('FROM node:22-alpine');
    expect(output).toContain('WORKDIR /app');
    expect(output).toContain('CMD ["node", "dist/index.js"]');
  });

  it('should include multi-stage build by default', () => {
    const output = generateDockerfile();
    const fromCount = output.split('\n').filter((l) => l.startsWith('FROM ')).length;
    expect(fromCount).toBeGreaterThanOrEqual(3);
  });

  it('should include non-root user by default', () => {
    const output = generateDockerfile();
    expect(output).toContain('USER dcyfr');
    expect(output).toContain('adduser');
  });

  it('should include health check by default', () => {
    const output = generateDockerfile();
    expect(output).toContain('HEALTHCHECK');
  });

  it('should use custom node version', () => {
    const output = generateDockerfile({ nodeVersion: '20-bookworm-slim' });
    expect(output).toContain('FROM node:20-bookworm-slim');
  });

  it('should use custom port', () => {
    const output = generateDockerfile({ port: 8080 });
    expect(output).toContain('EXPOSE 8080');
    expect(output).toContain('http://localhost:8080/health');
  });

  it('should add native deps when specified', () => {
    const output = generateDockerfile({ nativeDeps: true });
    expect(output).toContain('python3 make g++');
  });

  it('should not add native deps by default', () => {
    const output = generateDockerfile();
    expect(output).not.toContain('python3 make g++');
  });

  it('should add custom labels', () => {
    const output = generateDockerfile({
      labels: { 'com.example.vendor': 'DCYFR' },
    });
    expect(output).toContain('LABEL com.example.vendor="DCYFR"');
  });

  it('should skip multi-stage when disabled', () => {
    const output = generateDockerfile({ multiStage: false });
    const fromCount = output.split('\n').filter((l) => l.startsWith('FROM ')).length;
    expect(fromCount).toBe(1);
  });

  it('should skip non-root user when disabled', () => {
    const output = generateDockerfile({ nonRoot: false });
    expect(output).not.toContain('USER dcyfr');
  });

  it('should skip health check when disabled', () => {
    const output = generateDockerfile({ healthCheck: false });
    expect(output).not.toContain('HEALTHCHECK');
  });

  it('should pass its own validation', () => {
    const output = generateDockerfile();
    const result = validateDockerfile(output);
    expect(result.valid).toBe(true);
    expect(result.score).toBeGreaterThanOrEqual(90);
  });
});

// ---------------------------------------------------------------------------
// generateCompose
// ---------------------------------------------------------------------------

describe('generateCompose', () => {
  it('should generate valid compose output', () => {
    const output = generateCompose({
      projectName: 'test-app',
      services: [
        {
          name: 'app',
          build: { context: '.', dockerfile: 'Dockerfile' },
          ports: ['3000:3000'],
          environment: { NODE_ENV: 'production' },
          volumes: [],
          dependsOn: [],
          restart: 'always',
        },
      ],
      volumes: [],
      network: 'test-network',
    });

    expect(output).toContain('services:');
    expect(output).toContain('app:');
    expect(output).toContain('3000:3000');
    expect(output).toContain('NODE_ENV=production');
    expect(output).toContain('test-network');
  });

  it('should include volumes section', () => {
    const output = generateCompose({
      projectName: 'test-app',
      services: [],
      volumes: ['pgdata', 'redisdata'],
      network: 'test',
    });

    expect(output).toContain('volumes:');
    expect(output).toContain('pgdata:');
    expect(output).toContain('redisdata:');
  });

  it('should include depends_on with health condition', () => {
    const output = generateCompose({
      projectName: 'test-app',
      services: [
        {
          name: 'app',
          ports: ['3000:3000'],
          environment: {},
          volumes: [],
          dependsOn: ['db'],
          restart: 'always',
        },
      ],
      volumes: [],
      network: 'test',
    });

    expect(output).toContain('depends_on:');
    expect(output).toContain('db:');
    expect(output).toContain('condition: service_healthy');
  });

  it('should include health check when specified', () => {
    const output = generateCompose({
      projectName: 'test-app',
      services: [
        {
          name: 'db',
          image: 'postgres:16-alpine',
          ports: ['5432:5432'],
          environment: {},
          volumes: [],
          dependsOn: [],
          healthCheck: '["CMD-SHELL", "pg_isready"]',
          restart: 'always',
        },
      ],
      volumes: [],
      network: 'test',
    });

    expect(output).toContain('healthcheck:');
    expect(output).toContain('pg_isready');
  });

  it('should set restart policy', () => {
    const output = generateCompose({
      projectName: 'test-app',
      services: [
        {
          name: 'app',
          ports: [],
          environment: {},
          volumes: [],
          dependsOn: [],
          restart: 'unless-stopped',
        },
      ],
      volumes: [],
      network: 'test',
    });

    expect(output).toContain('restart: unless-stopped');
  });
});

// ---------------------------------------------------------------------------
// generateProject
// ---------------------------------------------------------------------------

describe('generateProject', () => {
  it('should generate files with defaults', () => {
    const files = generateProject();
    expect(Object.keys(files).length).toBeGreaterThanOrEqual(3);
    expect(files).toHaveProperty('Dockerfile');
    expect(files).toHaveProperty('Dockerfile.dev');
    expect(files).toHaveProperty('.dockerignore');
  });

  it('should generate compose files for "both" target', () => {
    const files = generateProject({ target: 'both' });
    expect(files).toHaveProperty('docker-compose.yml');
    expect(files).toHaveProperty('docker-compose.prod.yml');
  });

  it('should generate only dev compose for development target', () => {
    const files = generateProject({ target: 'development' });
    expect(files).toHaveProperty('Dockerfile.dev');
    expect(files).toHaveProperty('docker-compose.yml');
    expect(files).not.toHaveProperty('Dockerfile');
    expect(files).not.toHaveProperty('docker-compose.prod.yml');
  });

  it('should generate only prod compose for production target', () => {
    const files = generateProject({ target: 'production' });
    expect(files).toHaveProperty('Dockerfile');
    expect(files).toHaveProperty('docker-compose.prod.yml');
    expect(files).not.toHaveProperty('Dockerfile.dev');
    expect(files).not.toHaveProperty('docker-compose.yml');
  });

  it('should include postgres service when database is postgres', () => {
    const files = generateProject({ database: 'postgres' });
    const devCompose = files['docker-compose.yml']!;
    expect(devCompose).toContain('db:');
    expect(devCompose).toContain('postgres');
  });

  it('should include redis service when redis is true', () => {
    const files = generateProject({ redis: true });
    const devCompose = files['docker-compose.yml']!;
    expect(devCompose).toContain('redis:');
    expect(devCompose).toContain('redis:7-alpine');
  });

  it('should include volumes for postgres', () => {
    const files = generateProject({ database: 'postgres' });
    const devCompose = files['docker-compose.yml']!;
    expect(devCompose).toContain('pgdata:');
  });

  it('should include volumes for redis', () => {
    const files = generateProject({ redis: true });
    const devCompose = files['docker-compose.yml']!;
    expect(devCompose).toContain('redisdata:');
  });

  it('should not include database when "none"', () => {
    const files = generateProject({ database: 'none', redis: false });
    const devCompose = files['docker-compose.yml']!;
    expect(devCompose).not.toContain('postgres');
    expect(devCompose).not.toContain('redis:7');
  });

  it('should add native deps for database apps', () => {
    const files = generateProject({ database: 'postgres' });
    const dockerfile = files['Dockerfile']!;
    expect(dockerfile).toContain('python3 make g++');
  });

  it('should generate valid Dockerfile', () => {
    const files = generateProject();
    const result = validateDockerfile(files['Dockerfile']!);
    expect(result.valid).toBe(true);
  });

  it('should generate .dockerignore with standard exclusions', () => {
    const files = generateProject();
    const ignore = files['.dockerignore']!;
    expect(ignore).toContain('node_modules');
    expect(ignore).toContain('.git');
    expect(ignore).toContain('.env');
    expect(ignore).toContain('tests');
  });

  it('should include mysql service when database is mysql', () => {
    const files = generateProject({ database: 'mysql' });
    const devCompose = files['docker-compose.yml']!;
    expect(devCompose).toContain('db:');
    expect(devCompose).toContain('mysql:8.0');
    expect(devCompose).toContain('MYSQL_DATABASE');
    expect(devCompose).toContain('mysqldata');
  });

  it('should include mysql volumes for mysql database', () => {
    const files = generateProject({ database: 'mysql' });
    const devCompose = files['docker-compose.yml']!;
    expect(devCompose).toContain('mysqldata:');
  });

  it('should not create db service for sqlite', () => {
    const files = generateProject({ database: 'sqlite' });
    const devCompose = files['docker-compose.yml']!;
    expect(devCompose).not.toContain('postgres');
    expect(devCompose).not.toContain('mysql');
    expect(devCompose).not.toContain('db:');
  });
});

// ---------------------------------------------------------------------------
// Workdir customization
// ---------------------------------------------------------------------------

describe('generateDockerfile workdir', () => {
  it('should use custom workdir in chown', () => {
    const output = generateDockerfile({ workdir: '/opt/myapp' });
    expect(output).toContain('WORKDIR /opt/myapp');
    expect(output).toContain('RUN chown dcyfr:nodejs /opt/myapp');
    expect(output).not.toContain('chown dcyfr:nodejs /app');
  });
});
