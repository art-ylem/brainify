import type { TaskDefinition } from '../types/task.js';
import { schulteTask } from './schulte.js';
import { sequenceMemoryTask } from './sequence-memory.js';
import { arithmeticTask } from './arithmetic.js';
import { stroopTask } from './stroop.js';
import { numberSeriesTask } from './number-series.js';
import { memoryPairsTask } from './memory-pairs.js';
import { patternSearchTask } from './pattern-search.js';

export const taskRegistry: Record<string, TaskDefinition> = {
  schulte: schulteTask,
  sequence_memory: sequenceMemoryTask,
  arithmetic: arithmeticTask,
  stroop: stroopTask,
  number_series: numberSeriesTask,
  memory_pairs: memoryPairsTask,
  pattern_search: patternSearchTask,
};

export {
  schulteTask,
  sequenceMemoryTask,
  arithmeticTask,
  stroopTask,
  numberSeriesTask,
  memoryPairsTask,
  patternSearchTask,
};
