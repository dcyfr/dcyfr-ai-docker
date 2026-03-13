/**
 * Integration test for autonomous agent image tooling.
 *
 * Verifies the built image contains required executables:
 * node, git, gh, jq
 */

import { afterAll, describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';

const ROOT_DIR = new URL('..', import.meta.url).pathname;
const IMAGE_TAG = `dcyfr/agent:test-${Date.now()}`;

function canUseDocker(): boolean {
  try {
    execFileSync('docker', ['info'], {
      stdio: 'ignore',
      cwd: ROOT_DIR,
      timeout: 15000,
    });
    return true;
  } catch {
    return false;
  }
}

const dockerAvailable = canUseDocker();

function cleanImage() {
  try {
    execFileSync('docker', ['rmi', '-f', IMAGE_TAG], {
      cwd: ROOT_DIR,
      stdio: 'ignore',
      timeout: 30_000,
    });
  } catch {
    // Ignore cleanup failures.
  }
}

(dockerAvailable ? describe : describe.skip)('agent image integration', () => {
  afterAll(() => {
    cleanImage();
  });

  it('builds the image and has node/git/gh/jq installed', () => {
    execFileSync('docker', ['build', '-t', IMAGE_TAG, '-f', 'agent/Dockerfile', '.'], {
      cwd: ROOT_DIR,
      stdio: 'pipe',
      timeout: 5 * 60 * 1000,
    });

    const output = execFileSync(
      'docker',
      [
        'run',
        '--rm',
        '--entrypoint',
        '/bin/bash',
        IMAGE_TAG,
        '-lc',
        'node --version && git --version && gh --version && jq --version',
      ],
      {
        cwd: ROOT_DIR,
        encoding: 'utf8',
        timeout: 60_000,
      },
    );

    expect(output).toContain('v');
    expect(output.toLowerCase()).toContain('git version');
    expect(output.toLowerCase()).toContain('gh version');
    expect(output.toLowerCase()).toContain('jq-');

  }, 120_000);

  it('runs as non-root and enforces configured memory/cpu limits', () => {
    const uidOutput = execFileSync(
      'docker',
      [
        'run',
        '--rm',
        '--entrypoint',
        '/bin/bash',
        IMAGE_TAG,
        '-lc',
        'id -u',
      ],
      {
        cwd: ROOT_DIR,
        encoding: 'utf8',
        timeout: 30_000,
      },
    );

    expect(uidOutput.trim()).toBe('1001');

    const containerId = execFileSync(
      'docker',
      [
        'run',
        '--detach',
        '--memory',
        '256m',
        '--cpus',
        '0.5',
        '--entrypoint',
        '/bin/bash',
        IMAGE_TAG,
        '-lc',
        'sleep 30',
      ],
      {
        cwd: ROOT_DIR,
        encoding: 'utf8',
        timeout: 30_000,
      },
    ).trim();

    try {
      const memBytes = execFileSync(
        'docker',
        ['inspect', '--format', '{{.HostConfig.Memory}}', containerId],
        {
          cwd: ROOT_DIR,
          encoding: 'utf8',
          timeout: 15_000,
        },
      ).trim();

      const nanoCpus = execFileSync(
        'docker',
        ['inspect', '--format', '{{.HostConfig.NanoCpus}}', containerId],
        {
          cwd: ROOT_DIR,
          encoding: 'utf8',
          timeout: 15_000,
        },
      ).trim();

      expect(memBytes).toBe(String(256 * 1024 * 1024));
      expect(nanoCpus).toBe('500000000');
    } finally {
      try {
        execFileSync('docker', ['rm', '-f', containerId], {
          cwd: ROOT_DIR,
          stdio: 'ignore',
          timeout: 15_000,
        });
      } catch {
        // ignore
      }
    }
  }, 120_000);
});
