/**
 * DCYFR AI Docker - Dockerfile Validator
 *
 * Validates Dockerfiles against DCYFR best practices and security rules.
 * Checks for common issues like running as root, missing health checks,
 * unpinned versions, and inefficient layering.
 */

import type {
  ValidationResult,
  ValidationError,
  ValidationWarning,
} from './types.js';

// ---------------------------------------------------------------------------
// Rule Definitions
// ---------------------------------------------------------------------------

interface Rule {
  id: string;
  description: string;
  check: (lines: string[], content: string) => string | null;
  severity: 'error' | 'warning';
}

const rules: Rule[] = [
  {
    id: 'no-root-user',
    description: 'Container should not run as root',
    severity: 'error',
    check: (_lines, content) => {
      if (!content.includes('USER ') || content.includes('USER root')) {
        return 'No non-root USER instruction found. Add USER to run as non-root.';
      }
      return null;
    },
  },
  {
    id: 'no-latest-tag',
    description: 'Base images should not use :latest tag',
    severity: 'warning',
    check: (lines) => {
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('FROM ') && trimmed.includes(':latest')) {
          return `Base image uses :latest tag: "${trimmed}". Pin to a specific version.`;
        }
      }
      return null;
    },
  },
  {
    id: 'healthcheck-present',
    description: 'Dockerfile should include a HEALTHCHECK instruction',
    severity: 'warning',
    check: (_lines, content) => {
      if (!content.includes('HEALTHCHECK')) {
        return 'No HEALTHCHECK instruction found. Add one for container orchestration.';
      }
      return null;
    },
  },
  {
    id: 'use-multi-stage',
    description: 'Production images should use multi-stage builds',
    severity: 'warning',
    check: (lines) => {
      const fromCount = lines.filter((l) => l.trim().startsWith('FROM ')).length;
      if (fromCount < 2) {
        return 'Only one FROM stage found. Consider multi-stage builds for smaller images.';
      }
      return null;
    },
  },
  {
    id: 'no-add-instruction',
    description: 'Prefer COPY over ADD unless extracting archives',
    severity: 'warning',
    check: (lines) => {
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('ADD ') && !trimmed.includes('.tar') && !trimmed.includes('.gz')) {
          return `Use COPY instead of ADD: "${trimmed}". ADD is only needed for archive extraction.`;
        }
      }
      return null;
    },
  },
  {
    id: 'copy-package-first',
    description: 'Copy package files before source for better layer caching',
    severity: 'warning',
    check: (lines) => {
      let seenPackageCopy = false;
      let seenNpmInstall = false;
      let seenSourceCopy = false;

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('COPY') && trimmed.includes('package')) {
          seenPackageCopy = true;
        }
        if (trimmed.includes('npm ci') || trimmed.includes('npm install')) {
          seenNpmInstall = true;
        }
        if (trimmed.startsWith('COPY . ') || trimmed.startsWith('COPY ./')) {
          seenSourceCopy = true;
          if (!seenPackageCopy || !seenNpmInstall) {
            return 'Source code copied before package install. Copy package.json and run npm ci first for better caching.';
          }
        }
      }

      if (seenSourceCopy && !seenPackageCopy) {
        return 'No separate package.json COPY found. Copy package files first for layer caching.';
      }

      return null;
    },
  },
  {
    id: 'no-secrets-in-env',
    description: 'ENV instructions should not contain secrets',
    severity: 'error',
    check: (lines) => {
      const secretPatterns = [
        /API_KEY\s*=\s*\S+/i,
        /SECRET\s*=\s*\S+/i,
        /PASSWORD\s*=\s*[^$]\S+/i,
        /TOKEN\s*=\s*\S+/i,
      ];
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('ENV ')) {
          for (const pattern of secretPatterns) {
            if (pattern.test(trimmed)) {
              return `Potential secret in ENV instruction: "${trimmed}". Use runtime env vars or secrets.`;
            }
          }
        }
      }
      return null;
    },
  },
  {
    id: 'npm-ci-over-install',
    description: 'Use npm ci instead of npm install for reproducible builds',
    severity: 'warning',
    check: (lines) => {
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.includes('npm install') && !trimmed.includes('npm install -g')) {
          return `Use "npm ci" instead of "npm install" for reproducible builds.`;
        }
      }
      return null;
    },
  },
  {
    id: 'cache-clean',
    description: 'Clean npm cache after installing dependencies',
    severity: 'warning',
    check: (_lines, content) => {
      if (
        (content.includes('npm ci') || content.includes('npm install')) &&
        !content.includes('npm cache clean')
      ) {
        return 'Add "npm cache clean --force" after npm ci/install to reduce image size.';
      }
      return null;
    },
  },
  {
    id: 'workdir-set',
    description: 'WORKDIR should be explicitly set',
    severity: 'error',
    check: (_lines, content) => {
      if (!content.includes('WORKDIR')) {
        return 'No WORKDIR instruction found. Set an explicit working directory.';
      }
      return null;
    },
  },
];

// ---------------------------------------------------------------------------
// Validate Function
// ---------------------------------------------------------------------------

/**
 * Validates a Dockerfile content against DCYFR best practices.
 *
 * @param content - Raw Dockerfile content string
 * @returns Validation result with errors, warnings, and score
 */
export function validateDockerfile(content: string): ValidationResult {
  const lines = content.split('\n');
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  for (const rule of rules) {
    const message = rule.check(lines, content);
    if (message !== null) {
      if (rule.severity === 'error') {
        errors.push({
          rule: rule.id,
          message,
          severity: 'error',
        });
      } else {
        warnings.push({
          rule: rule.id,
          message,
          severity: 'warning',
        });
      }
    }
  }

  // Score: start at 100, deduct 15 per error and 5 per warning
  const score = Math.max(0, 100 - errors.length * 15 - warnings.length * 5);

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    score,
  };
}

/**
 * Returns the list of available validation rules.
 */
export function getValidationRules(): Array<{ id: string; description: string; severity: string }> {
  return rules.map((r) => ({
    id: r.id,
    description: r.description,
    severity: r.severity,
  }));
}
