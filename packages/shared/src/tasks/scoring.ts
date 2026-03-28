import type { TaskType } from '../types/task.js';

/**
 * Returns the maximum possible score for a given task type and difficulty.
 * All 7 current tasks have a theoretical max score of 100:
 * - schulte: 50 (base) + 50 (time bonus) = 100
 * - arithmetic: accuracy*70 + timeBonus(max 30) = 100
 * - sequence_memory: 50 + min(50, length*5) = 100 (at length>=10)
 * - stroop: accuracy*70 + timeBonus(max 30) = 100
 * - number_series: 60 + timeBonus(max 40) = 100
 * - memory_pairs: matchRatio*50 + efficiency*30 + timeBonus(max 20) = 100
 * - pattern_search: 60 + timeBonus(max 40) = 100
 *
 * Difficulty does not change max score — it changes task parameters.
 */
export function getMaxScore(_taskType: TaskType, _difficulty: number): number {
  return 100;
}
