import type { JxaResponse } from '../types/index.js';
import type { JxaResult } from './types.js';

export function parseJxaOutput<T>(result: JxaResult): JxaResponse<T> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(result.stdout);
  } catch {
    throw new Error(`Invalid JSON from osascript: ${result.stdout}`);
  }

  const response = parsed as JxaResponse<T>;
  if (!response.success) {
    throw new Error(response.error);
  }
  return response;
}
