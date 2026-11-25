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

  it('throws error for unknown command', async () => {
    await expect(main(['unknown'])).rejects.toThrow("Unknown command 'unknown'");
  });
});
