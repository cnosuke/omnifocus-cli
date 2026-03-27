export interface JxaRunnerOptions {
  args?: string[];
  timeout?: number;
}

export interface JxaResult {
  stdout: string;
  exitCode: number;
}
