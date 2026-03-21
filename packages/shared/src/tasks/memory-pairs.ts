import type { TaskDefinition, TaskParams, GeneratedTask, TaskResult } from '../types/task.js';

export interface MemoryPairsData {
  /** Card values face-down, arranged in a grid. Each value appears exactly twice. */
  cards: number[];
  gridCols: number;
}

/** Each move is [index1, index2] — the two cards flipped */
export type MemoryPairsAnswer = [number, number][];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export const memoryPairsTask: TaskDefinition<MemoryPairsData, MemoryPairsAnswer> = {
  type: 'memory_pairs',
  category: 'memory',
  nameKey: 'tasks.memory_pairs.name',
  descriptionKey: 'tasks.memory_pairs.description',

  generate(params: TaskParams): GeneratedTask<MemoryPairsData> {
    const pairsMap: Record<number, number> = { 1: 4, 2: 6, 3: 8, 4: 10, 5: 12 };
    const pairs = pairsMap[params.difficulty] ?? 8;
    const values = Array.from({ length: pairs }, (_, i) => i + 1);
    const cards = shuffle([...values, ...values]);
    const gridCols = pairs <= 4 ? 4 : pairs <= 6 ? 4 : 5;

    return {
      type: 'memory_pairs',
      category: 'memory',
      difficulty: params.difficulty,
      data: { cards, gridCols },
      timeLimitMs: pairs * 10_000,
    };
  },

  validate(
    task: GeneratedTask<MemoryPairsData>,
    answer: MemoryPairsAnswer,
    timeMs: number,
  ): TaskResult {
    const { cards } = task.data;
    const totalPairs = cards.length / 2;

    // Deduplicate: count unique matched pairs by card indices
    const matched = new Set<string>();
    for (const [i1, i2] of answer) {
      if (cards[i1] === cards[i2] && i1 !== i2) {
        matched.add(`${Math.min(i1, i2)}-${Math.max(i1, i2)}`);
      }
    }
    const uniqueMatched = matched.size;

    const isCorrect = uniqueMatched === totalPairs;
    const efficiency = totalPairs > 0 ? totalPairs / Math.max(answer.length, totalPairs) : 0;
    const timeLimitMs = task.timeLimitMs ?? 120_000;
    const timeBonus = Math.max(0, Math.round((1 - timeMs / timeLimitMs) * 20));
    const score = Math.round((uniqueMatched / totalPairs) * 50 + efficiency * 30) + (isCorrect ? timeBonus : 0);

    return {
      score,
      timeMs,
      isCorrect,
      details: { matchedPairs: uniqueMatched, totalPairs, moves: answer.length },
    };
  },

  sanitizeForClient(data: MemoryPairsData) {
    return { cards: data.cards, gridCols: data.gridCols };
  },
};
