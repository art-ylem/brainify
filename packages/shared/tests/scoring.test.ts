import { describe, it, expect } from 'vitest';
import { getMaxScore } from '../src/tasks/scoring.js';
import type { TaskType } from '../src/types/task.js';

const ALL_TASK_TYPES: TaskType[] = [
  'schulte',
  'sequence_memory',
  'arithmetic',
  'stroop',
  'number_series',
  'memory_pairs',
  'pattern_search',
];

describe('getMaxScore', () => {
  it('returns 100 for all task types at difficulty 1', () => {
    for (const taskType of ALL_TASK_TYPES) {
      expect(getMaxScore(taskType, 1)).toBe(100);
    }
  });

  it('returns 100 for all task types at difficulty 5', () => {
    for (const taskType of ALL_TASK_TYPES) {
      expect(getMaxScore(taskType, 5)).toBe(100);
    }
  });

  it('returns 100 for all difficulty levels (1-5)', () => {
    for (let d = 1; d <= 5; d++) {
      for (const taskType of ALL_TASK_TYPES) {
        expect(getMaxScore(taskType, d)).toBe(100);
      }
    }
  });

  it('returns a number', () => {
    expect(typeof getMaxScore('schulte', 1)).toBe('number');
  });
});
