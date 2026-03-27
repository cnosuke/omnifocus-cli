import { describe, expect, it } from 'vitest';
import { parseJxaOutput } from '../../../src/jxa/parse.js';

describe('parseJxaOutput', () => {
  it('returns parsed response on success', () => {
    const result = { stdout: '{"success":true,"tasks":[],"totalCount":0}', exitCode: 0 };
    const response = parseJxaOutput(result);
    expect(response).toEqual({ success: true, tasks: [], totalCount: 0 });
  });

  it('throws on error response', () => {
    const result = { stdout: '{"success":false,"error":"not running"}', exitCode: 0 };
    expect(() => parseJxaOutput(result)).toThrow('not running');
  });

  it('throws on invalid JSON', () => {
    const result = { stdout: 'garbage', exitCode: 0 };
    expect(() => parseJxaOutput(result)).toThrow('Invalid JSON from osascript: garbage');
  });

  it('throws on empty stdout', () => {
    const result = { stdout: '', exitCode: 0 };
    expect(() => parseJxaOutput(result)).toThrow('Invalid JSON from osascript');
  });

  it('throws on response missing success field', () => {
    const result = { stdout: '{"tasks":[]}', exitCode: 0 };
    expect(() => parseJxaOutput(result)).toThrow("missing 'success' field");
  });

  it('throws on non-object response', () => {
    const result = { stdout: '"just a string"', exitCode: 0 };
    expect(() => parseJxaOutput(result)).toThrow("missing 'success' field");
  });
});
