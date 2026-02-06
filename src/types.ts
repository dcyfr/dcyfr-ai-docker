/**
 * DCYFR AI Docker - Configuration Types
 *
 * Type definitions for Docker configuration validation and generation.
 */

import { z } from 'zod';

// ---------------------------------------------------------------------------
// Docker Build Configuration
// ---------------------------------------------------------------------------

export const DockerBuildConfigSchema = z.object({
  /** Base Node.js image tag */
  nodeVersion: z.string().default('22-alpine'),
  /** Application port */
  port: z.number().int().positive().default(3000),
  /** Working directory inside container */
  workdir: z.string().default('/app'),
  /** Enable multi-stage build */
  multiStage: z.boolean().default(true),
  /** Run as non-root user */
  nonRoot: z.boolean().default(true),
  /** Add health check instruction */
  healthCheck: z.boolean().default(true),
  /** Install native build tools (python3, make, g++) */
  nativeDeps: z.boolean().default(false),
  /** Custom labels */
  labels: z.record(z.string()).default({}),
});

export type DockerBuildConfig = z.infer<typeof DockerBuildConfigSchema>;

// ---------------------------------------------------------------------------
// Docker Compose Service
// ---------------------------------------------------------------------------

export const ComposeServiceSchema = z.object({
  /** Service name */
  name: z.string(),
  /** Docker image */
  image: z.string().optional(),
  /** Build context */
  build: z.object({
    context: z.string().default('.'),
    dockerfile: z.string().default('Dockerfile'),
  }).optional(),
  /** Port mappings (host:container) */
  ports: z.array(z.string()).default([]),
  /** Environment variables */
  environment: z.record(z.string()).default({}),
  /** Volume mounts */
  volumes: z.array(z.string()).default([]),
  /** Depends on services */
  dependsOn: z.array(z.string()).default([]),
  /** Resource limits */
  resources: z.object({
    cpus: z.string().default('1.0'),
    memory: z.string().default('512M'),
  }).optional(),
  /** Health check command */
  healthCheck: z.string().optional(),
  /** Restart policy */
  restart: z.enum(['no', 'always', 'unless-stopped', 'on-failure']).default('unless-stopped'),
});

export type ComposeService = z.infer<typeof ComposeServiceSchema>;

// ---------------------------------------------------------------------------
// Docker Compose Configuration
// ---------------------------------------------------------------------------

export const ComposeConfigSchema = z.object({
  /** Project name */
  projectName: z.string(),
  /** Services */
  services: z.array(ComposeServiceSchema),
  /** Named volumes */
  volumes: z.array(z.string()).default([]),
  /** Network name */
  network: z.string().default('dcyfr-network'),
});

export type ComposeConfig = z.infer<typeof ComposeConfigSchema>;

// ---------------------------------------------------------------------------
// Dockerfile Validation Result
// ---------------------------------------------------------------------------

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  score: number;
}

export interface ValidationError {
  rule: string;
  message: string;
  line?: number;
  severity: 'error';
}

export interface ValidationWarning {
  rule: string;
  message: string;
  line?: number;
  severity: 'warning';
}

// ---------------------------------------------------------------------------
// Generation Options
// ---------------------------------------------------------------------------

export const GenerateOptionsSchema = z.object({
  /** Application type */
  appType: z.enum(['api', 'web', 'worker', 'static']).default('api'),
  /** Include database service */
  database: z.enum(['none', 'postgres', 'mysql', 'sqlite']).default('none'),
  /** Include Redis cache */
  redis: z.boolean().default(false),
  /** Include Nginx reverse proxy */
  nginx: z.boolean().default(false),
  /** Target environment */
  target: z.enum(['development', 'production', 'both']).default('both'),
  /** Output directory */
  outputDir: z.string().default('.'),
});

export type GenerateOptions = z.infer<typeof GenerateOptionsSchema>;

// ---------------------------------------------------------------------------
// Security Rules
// ---------------------------------------------------------------------------

export const SECURITY_RULES = [
  'no-root-user',
  'no-latest-tag',
  'copy-before-run',
  'use-multi-stage',
  'healthcheck-present',
  'no-add-instruction',
  'pin-versions',
  'no-secrets-in-env',
] as const;

export type SecurityRule = typeof SECURITY_RULES[number];
