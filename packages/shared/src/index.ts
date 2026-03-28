export { t, resolveLocale, locales } from './i18n/index.js';
export type { Locale } from './i18n/index.js';

export type {
  TaskCategory,
  TaskType,
  TaskParams,
  GeneratedTask,
  TaskResult,
  TaskDefinition,
} from './types/task.js';

export { taskRegistry } from './tasks/index.js';
export {
  schulteTask,
  sequenceMemoryTask,
  arithmeticTask,
  stroopTask,
  numberSeriesTask,
  memoryPairsTask,
  patternSearchTask,
} from './tasks/index.js';
export { getMaxScore } from './tasks/scoring.js';
