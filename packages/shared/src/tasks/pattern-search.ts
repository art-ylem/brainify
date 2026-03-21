import type { TaskDefinition, TaskParams, GeneratedTask, TaskResult } from '../types/task.js';

export interface PatternSearchData {
  /** The sequence the user sees */
  sequence: number[];
  /** Multiple-choice options */
  options: number[];
  /** Index of the correct option in `options` */
  correctOptionIndex: number;
}

export type PatternSearchAnswer = number; // index of chosen option

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export const patternSearchTask: TaskDefinition<PatternSearchData, PatternSearchAnswer> = {
  type: 'pattern_search',
  category: 'logic',
  nameKey: 'tasks.pattern_search.name',
  descriptionKey: 'tasks.pattern_search.description',

  generate(params: TaskParams): GeneratedTask<PatternSearchData> {
    const length = 4 + params.difficulty;

    // Generate a repeating pattern
    const patternLength = params.difficulty <= 2 ? 2 : params.difficulty <= 4 ? 3 : 4;
    const base = Array.from({ length: patternLength }, () => randomInt(1, 9));

    const fullSequence: number[] = [];
    for (let i = 0; i < length + 1; i++) {
      fullSequence.push(base[i % patternLength]);
    }

    const correctAnswer = fullSequence[fullSequence.length - 1];
    const sequence = fullSequence.slice(0, -1);

    // Generate wrong options
    const wrongOptions = new Set<number>();
    while (wrongOptions.size < 3) {
      const wrong = randomInt(1, 9);
      if (wrong !== correctAnswer) wrongOptions.add(wrong);
    }

    const allOptions = shuffle([correctAnswer, ...wrongOptions]);
    const correctOptionIndex = allOptions.indexOf(correctAnswer);

    return {
      type: 'pattern_search',
      category: 'logic',
      difficulty: params.difficulty,
      data: { sequence, options: allOptions, correctOptionIndex },
      timeLimitMs: 45_000,
    } as GeneratedTask<PatternSearchData>;
  },

  validate(
    task: GeneratedTask<PatternSearchData>,
    answer: PatternSearchAnswer,
    timeMs: number,
  ): TaskResult {
    const isCorrect = answer === task.data.correctOptionIndex;
    const timeLimitMs = task.timeLimitMs ?? 45_000;
    const timeBonus = Math.max(0, Math.round((1 - timeMs / timeLimitMs) * 40));
    const score = isCorrect ? 60 + timeBonus : 0;

    return { score, timeMs, isCorrect };
  },

  sanitizeForClient(data: PatternSearchData) {
    return { sequence: data.sequence, options: data.options };
  },
};
