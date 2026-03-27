import { runJxa } from '../jxa/runner.js';
import { parseJxaOutput } from '../jxa/parse.js';
import type { JxaRunnerOptions } from '../jxa/types.js';

export async function runAndPrint(script: string, options?: JxaRunnerOptions): Promise<void> {
  const result = await runJxa(script, options);
  const response = parseJxaOutput(result);
  console.log(JSON.stringify(response, null, 2));
}
