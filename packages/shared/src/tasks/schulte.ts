import type { TaskDefinition, TaskParams, GeneratedTask, TaskResult } from '../types/task.js';

export interface SchulteData {
  size: number;
  grid: number[];
}

/** User submits the order in which they tapped the cells */
export type SchulteAnswer = number[];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export const schulteTask: TaskDefinition<SchulteData, SchulteAnswer> = {
  type: 'schulte',
  category: 'attention',
  nameKey: 'tasks.schulte.name',
  descriptionKey: 'tasks.schulte.description',

  generate(params: TaskParams): GeneratedTask<SchulteData> {
    const sizeMap: Record<number, number> = { 1: 3, 2: 4, 3: 5, 4: 6, 5: 7 };
    const size = sizeMap[params.difficulty] ?? 5;
    const total = size * size;
    const numbers = Array.from({ length: total }, (_, i) => i + 1);

    return {
      type: 'schulte',
      category: 'attention',
      difficulty: params.difficulty,
      data: { size, grid: shuffle(numbers) },
      timeLimitMs: (30 + size * 15) * 1000,
    };
  },

  validate(task: GeneratedTask<SchulteData>, answer: SchulteAnswer, timeMs: number): TaskResult {
    const expected = Array.from({ length: task.data.size * task.data.size }, (_, i) => i + 1);
    const isCorrect =
      answer.length === expected.length && answer.every((v, i) => v === expected[i]);

    const timeLimitMs = task.timeLimitMs ?? 120_000;
    const timeBonus = Math.max(0, Math.round((1 - timeMs / timeLimitMs) * 50));
    const score = isCorrect ? 50 + timeBonus : 0;

    return { score, timeMs, isCorrect };
  },

  sanitizeForClient(data: SchulteData) {
    return { size: data.size, grid: data.grid };
  },
};
