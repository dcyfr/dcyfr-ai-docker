/**
 * DCYFR AI Docker - Index (Barrel Export) Tests
 */

import { describe, it, expect } from 'vitest';
import * as api from '../src/index.js';

describe('public API exports', () => {
  it('should export validateDockerfile function', () => {
    expect(typeof api.validateDockerfile).toBe('function');
  });

  it('should export getValidationRules function', () => {
    expect(typeof api.getValidationRules).toBe('function');
  });

  it('should export generateDockerfile function', () => {
    expect(typeof api.generateDockerfile).toBe('function');
  });

  it('should export generateCompose function', () => {
    expect(typeof api.generateCompose).toBe('function');
  });

  it('should export generateProject function', () => {
    expect(typeof api.generateProject).toBe('function');
  });

  it('should export DockerBuildConfigSchema', () => {
    expect(api.DockerBuildConfigSchema).toBeDefined();
    expect(typeof api.DockerBuildConfigSchema.parse).toBe('function');
  });

  it('should export ComposeConfigSchema', () => {
    expect(api.ComposeConfigSchema).toBeDefined();
    expect(typeof api.ComposeConfigSchema.parse).toBe('function');
  });

  it('should export GenerateOptionsSchema', () => {
    expect(api.GenerateOptionsSchema).toBeDefined();
    expect(typeof api.GenerateOptionsSchema.parse).toBe('function');
  });
});
