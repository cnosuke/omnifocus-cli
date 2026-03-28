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

const PROJECT_STATUS_MAP: Record<string, string> = {
  active: 'active status',
  'on-hold': 'on hold status',
  done: 'done status',
  dropped: 'dropped status',
};

export const VALID_PROJECT_STATUSES = Object.keys(PROJECT_STATUS_MAP);

export function mapProjectStatus(status: string): string {
  const mapped = PROJECT_STATUS_MAP[status];
  if (!mapped) {
    throw new Error(
      `Invalid status '${status}'. Must be one of: ${VALID_PROJECT_STATUSES.join(', ')}`,
    );
  }
  return mapped;
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
