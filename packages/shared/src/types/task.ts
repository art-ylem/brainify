export type TaskCategory = 'memory' | 'attention' | 'logic' | 'speed';

export type TaskType =
  | 'schulte'
  | 'sequence_memory'
  | 'arithmetic'
  | 'stroop'
  | 'number_series'
  | 'memory_pairs'
  | 'pattern_search';

export interface TaskParams {
  difficulty: number; // 1-5
  [key: string]: unknown;
}

export interface GeneratedTask<TData = unknown> {
  type: TaskType;
  category: TaskCategory;
  difficulty: number;
  data: TData;
  /** Time limit in ms, if applicable */
  timeLimitMs?: number;
}

export interface TaskResult {
  score: number;
  timeMs: number;
  isCorrect: boolean;
  details?: Record<string, unknown>;
}

export interface TaskDefinition<TData = unknown, TAnswer = unknown> {
  type: TaskType;
  category: TaskCategory;
  nameKey: string;
  descriptionKey: string;
  /** Generate a task instance with randomized parameters */
  generate(params: TaskParams): GeneratedTask<TData>;
  /** Validate the user's answer and compute score */
  validate(task: GeneratedTask<TData>, answer: TAnswer, timeMs: number): TaskResult;
  /** Return a copy of data safe to send to the client (no answers) */
  sanitizeForClient(data: TData): Record<string, unknown>;
}
