import { runJxa } from '../jxa/runner.js';
import { parseJxaOutput } from '../jxa/parse.js';
import type { JxaRunnerOptions } from '../jxa/types.js';
import type { JxaSuccessResponse } from '../types/index.js';

export async function runAndPrint<T extends JxaSuccessResponse = JxaSuccessResponse>(
  script: string,
  options?: JxaRunnerOptions,
): Promise<void> {
  const result = await runJxa(script, options);
  const response = parseJxaOutput<T>(result);
  console.log(JSON.stringify(response, null, 2));
}
