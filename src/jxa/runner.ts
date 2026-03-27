import { execFile } from 'node:child_process';
import type { JxaResult, JxaRunnerOptions } from './types.js';

const DEFAULT_TIMEOUT_MS = 30_000;

export function runJxa(
  script: string,
  options: JxaRunnerOptions = {},
): Promise<JxaResult> {
  const { args = [], timeout = DEFAULT_TIMEOUT_MS } = options;

  return new Promise((resolve, reject) => {
    execFile(
      'osascript',
      ['-l', 'JavaScript', '-e', script, ...args],
      { timeout },
      (error, stdout, stderr) => {
        if (error && !stdout) {
          reject(new Error(`osascript failed: ${stderr || error.message}`));
          return;
        }
        resolve({
          stdout: stdout.trim(),
          exitCode: error ? 1 : 0,
        });
      },
    );
  });
}
