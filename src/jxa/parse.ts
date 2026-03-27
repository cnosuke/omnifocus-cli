import type { JxaResponse } from '../types/index.js';
import type { JxaResult } from './types.js';

export function parseJxaOutput(result: JxaResult): JxaResponse {
  let parsed: unknown;
  try {
    parsed = JSON.parse(result.stdout);
  } catch {
    throw new Error(`Invalid JSON from osascript: ${result.stdout}`);
  }

  if (typeof parsed !== 'object' || parsed === null || !('success' in parsed)) {
    throw new Error(`Invalid response from osascript: missing 'success' field`);
  }

  const response = parsed as JxaResponse;
  if (!response.success) {
    throw new Error(response.error);
  }
  return response;
}
