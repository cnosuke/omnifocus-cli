import { describe, expect, it, vi, beforeEach } from 'vitest';
import { main } from '../../../src/cli/main.js';

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('main', () => {
  it('prints help when no args', async () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    await main([]);
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('of - OmniFocus CLI'));
  });

  it('prints help with --help flag', async () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    await main(['--help']);
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('of - OmniFocus CLI'));
  });

  it('prints help with help command', async () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    await main(['help']);
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('of - OmniFocus CLI'));
  });

  it('exits with error for unknown command', async () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit');
    });

    await expect(main(['unknown'])).rejects.toThrow('process.exit');
    expect(errSpy).toHaveBeenCalledWith(expect.stringContaining("Unknown command 'unknown'"));
    exitSpy.mockRestore();
  });
});
