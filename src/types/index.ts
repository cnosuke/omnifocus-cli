export interface TaskBrief {
  id: string;
  name: string;
  dueDate: string | null;
  flagged: boolean;
  completed: boolean;
}

export interface TaskDetail extends TaskBrief {
  note: string;
  deferDate: string | null;
  completionDate: string | null;
  estimatedMinutes: number | null;
  inInbox: boolean;
  tags: string[];
  projectName: string | null;
}

export interface TaskAddOptions {
  project?: string;
  dueDate?: string;
  deferDate?: string;
  flagged?: boolean;
  note?: string;
  estimatedMinutes?: number;
  tags?: string[];
}

export interface TaskSearchOptions {
  project?: string;
  flagged?: boolean;
  limit?: number;
}

export interface JxaTaskResponse<T> {
  success: true;
  task: T;
}

export interface JxaTasksResponse<T> {
  success: true;
  tasks: T[];
  totalCount: number;
}

export interface JxaErrorResponse {
  success: false;
  error: string;
}

export type JxaResponse<T> =
  | JxaTaskResponse<T>
  | JxaTasksResponse<T>
  | JxaErrorResponse;
