import { describe, expect, it, vi, beforeEach } from 'vitest';
import { PassThrough } from 'node:stream';
import { runJxa } from '../../../src/jxa/runner.js';

vi.mock('node:child_process', () => ({
  execFile: vi.fn(),
}));

import { execFile } from 'node:child_process';

const mockExecFile = vi.mocked(execFile);
let stdin: PassThrough;

beforeEach(() => {
  vi.restoreAllMocks();
  mockExecFile.mockReset();
  stdin = new PassThrough();
});

describe('runJxa', () => {
  it('calls osascript with correct arguments', async () => {
    mockExecFile.mockImplementation((_cmd, _args, _opts, callback) => {
      (callback as Function)(null, '{"success":true}', '');
      return { stdin } as any;
    });

    const result = await runJxa('var x = 1;');
    expect(mockExecFile).toHaveBeenCalledWith(
      'osascript',
      ['-l', 'JavaScript', '-'],
      expect.objectContaining({ timeout: 30_000 }),
      expect.any(Function),
    );
    expect(result.stdout).toBe('{"success":true}');
    expect(stdin.read().toString()).toBe('var x = 1;');
    expect(stdin.writableEnded).toBe(true);
  });

  it('passes additional args', async () => {
    mockExecFile.mockImplementation((_cmd, _args, _opts, callback) => {
      (callback as Function)(null, 'ok', '');
      return { stdin } as any;
    });

    await runJxa('script', { args: ['arg1', 'arg2'] });
    expect(mockExecFile).toHaveBeenCalledWith(
      'osascript',
      ['-l', 'JavaScript', '-', 'arg1', 'arg2'],
      expect.any(Object),
      expect.any(Function),
    );
  });

  it('uses custom timeout', async () => {
    mockExecFile.mockImplementation((_cmd, _args, _opts, callback) => {
      (callback as Function)(null, 'ok', '');
      return { stdin } as any;
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
      return { stdin } as any;
    });

    await expect(runJxa('bad script')).rejects.toThrow('osascript failed: stderr msg');
  });

  it('resolves with stdout even on error if stdout present', async () => {
    mockExecFile.mockImplementation((_cmd, _args, _opts, callback) => {
      (callback as Function)(new Error('partial'), '{"success":false}', '');
      return { stdin } as any;
    });

    const result = await runJxa('script');
    expect(result.stdout).toBe('{"success":false}');
    expect(result.exitCode).toBe(1);
  });

  it('streams large scripts and keeps JSON arguments separate', async () => {
    mockExecFile.mockImplementation((_cmd, _args, _opts, callback) => {
      (callback as Function)(null, 'ok', '');
      return { stdin } as any;
    });

    const script = '/*' + 'x'.repeat(10_000) + '*/ "ok"';
    const args = ['タスク "引用"', JSON.stringify({ note: 'line 1\nline 2' })];
    await runJxa(script, { args });

    expect(mockExecFile.mock.calls[0][1]).toEqual(['-l', 'JavaScript', '-', ...args]);
    expect(stdin.read().toString()).toBe(script);
    expect(stdin.writableEnded).toBe(true);
  });

  it('rejects if writing the script to stdin fails', async () => {
    mockExecFile.mockReturnValue({ stdin } as any);
    const pending = runJxa('script');
    const error = new Error('broken pipe');
    const rejected = expect(pending).rejects.toBe(error);
    stdin.emit('error', error);
    await rejected;
  });

  it('rejects a spawn failure when stdin is unavailable', async () => {
    mockExecFile.mockImplementation((_cmd, _args, _opts, callback) => {
      (callback as Function)(new Error('spawn osascript ENOENT'), '', '');
      return { stdin: null } as any;
    });

    await expect(runJxa('script')).rejects.toThrow('osascript failed: spawn osascript ENOENT');
  });
});
