import { describe, expect, it, vi, beforeEach } from 'vitest';
import { runJxa } from '../../../src/jxa/runner.js';

vi.mock('node:child_process', () => ({
  execFile: vi.fn(),
}));

import { execFile } from 'node:child_process';

const mockExecFile = vi.mocked(execFile);

beforeEach(() => {
  vi.restoreAllMocks();
  mockExecFile.mockReset();
});

describe('runJxa', () => {
  it('calls osascript with correct arguments', async () => {
    mockExecFile.mockImplementation((_cmd, _args, _opts, callback) => {
      (callback as Function)(null, '{"success":true}', '');
      return { exitCode: 0 } as any;
    });

    const result = await runJxa('var x = 1;');
    expect(mockExecFile).toHaveBeenCalledWith(
      'osascript',
      ['-l', 'JavaScript', '-e', 'var x = 1;'],
      expect.objectContaining({ timeout: 30_000 }),
      expect.any(Function),
    );
    expect(result.stdout).toBe('{"success":true}');
  });

  it('passes additional args', async () => {
    mockExecFile.mockImplementation((_cmd, _args, _opts, callback) => {
      (callback as Function)(null, 'ok', '');
      return { exitCode: 0 } as any;
    });

    await runJxa('script', { args: ['arg1', 'arg2'] });
    expect(mockExecFile).toHaveBeenCalledWith(
      'osascript',
      ['-l', 'JavaScript', '-e', 'script', 'arg1', 'arg2'],
      expect.any(Object),
      expect.any(Function),
    );
  });

  it('uses custom timeout', async () => {
    mockExecFile.mockImplementation((_cmd, _args, _opts, callback) => {
      (callback as Function)(null, 'ok', '');
      return { exitCode: 0 } as any;
    });

    await runJxa('script', { timeout: 5000 });
    expect(mockExecFile).toHaveBeenCalledWith(
      'osascript',
      expect.any(Array),
      expect.objectContaining({ timeout: 5000 }),
      expect.any(Function),
    );
  });

  it('rejects on error without stdout', async () => {
    mockExecFile.mockImplementation((_cmd, _args, _opts, callback) => {
      (callback as Function)(new Error('osascript not found'), '', 'stderr msg');
      return { exitCode: 1 } as any;
    });

    await expect(runJxa('bad script')).rejects.toThrow('osascript failed: stderr msg');
  });

  it('resolves with stdout even on error if stdout present', async () => {
    mockExecFile.mockImplementation((_cmd, _args, _opts, callback) => {
      (callback as Function)(new Error('partial'), '{"success":false}', '');
      return { exitCode: 1 } as any;
    });

    const result = await runJxa('script');
    expect(result.stdout).toBe('{"success":false}');
  });
});
