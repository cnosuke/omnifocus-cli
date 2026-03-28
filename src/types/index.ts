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

export interface ProjectBrief {
  id: string;
  name: string;
  status: string;
  dueDate: string | null;
  deferDate: string | null;
  flagged: boolean;
  taskCount: number;
  folderName: string | null;
}

export interface ProjectDetail extends ProjectBrief {
  note: string;
  completionDate: string | null;
  estimatedMinutes: number | null;
  sequential: boolean;
  tags: string[];
  remainingTaskCount: number;
}

export interface ProjectAddOptions {
  dueDate?: string;
  deferDate?: string;
  flagged?: boolean;
  note?: string;
  sequential?: boolean;
  tags?: string[];
  folder?: string;
}

export interface JxaSuccessResponse {
  success: true;
  task?: unknown;
  tasks?: unknown[];
  totalCount?: number;
  perspectiveNames?: string[];
  project?: unknown;
  projects?: unknown[];
}

export interface JxaErrorResponse {
  success: false;
  error: string;
}

export type JxaResponse = JxaSuccessResponse | JxaErrorResponse;
