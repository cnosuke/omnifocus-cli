import { execFile } from 'node:child_process';
import type { JxaResult, JxaRunnerOptions } from './types.js';

const DEFAULT_TIMEOUT_MS = 30_000;

export function runJxa(script: string, options: JxaRunnerOptions = {}): Promise<JxaResult> {
  const { args = [], timeout = DEFAULT_TIMEOUT_MS } = options;

  return new Promise((resolve, reject) => {
    const child = execFile(
      'osascript',
      ['-l', 'JavaScript', '-', ...args],
      { timeout },
      (error, stdout, stderr) => {
        // osascript may exit non-zero but still produce valid JSON on stdout
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
    child.stdin?.on('error', reject);
    child.stdin?.end(script);
  });
}
