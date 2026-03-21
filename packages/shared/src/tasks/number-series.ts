import type { TaskDefinition, TaskParams, GeneratedTask, TaskResult } from '../types/task.js';

export interface NumberSeriesData {
  series: number[];
  answer: number;
  /** The hidden numbers to show as blanks */
  hiddenIndex: number;
}

export type NumberSeriesAnswer = number;

type PatternGenerator = (start: number, length: number) => number[];

const patterns: PatternGenerator[] = [
  // Arithmetic: constant difference
  (start, length) => {
    const diff = Math.floor(Math.random() * 5) + 2;
    return Array.from({ length }, (_, i) => start + diff * i);
  },
  // Geometric: multiply by constant
  (start, length) => {
    const factor = Math.floor(Math.random() * 3) + 2;
    const s = Math.max(1, Math.min(start, 5));
    return Array.from({ length }, (_, i) => s * factor ** i);
  },
  // Alternating add
  (_start, length) => {
    const a = Math.floor(Math.random() * 5) + 1;
    const b = Math.floor(Math.random() * 5) + 1;
    const arr: number[] = [Math.floor(Math.random() * 10) + 1];
    for (let i = 1; i < length; i++) {
      arr.push(arr[i - 1] + (i % 2 === 1 ? a : b));
    }
    return arr;
  },
  // Squares
  (_start, length) => {
    const offset = Math.floor(Math.random() * 5) + 1;
    return Array.from({ length }, (_, i) => (i + offset) ** 2);
  },
  // Fibonacci-like
  (_start, length) => {
    const a = Math.floor(Math.random() * 5) + 1;
    const b = Math.floor(Math.random() * 5) + 1;
    const arr = [a, b];
    for (let i = 2; i < length; i++) {
      arr.push(arr[i - 1] + arr[i - 2]);
    }
    return arr;
  },
];

export const numberSeriesTask: TaskDefinition<NumberSeriesData, NumberSeriesAnswer> = {
  type: 'number_series',
  category: 'logic',
  nameKey: 'tasks.number_series.name',
  descriptionKey: 'tasks.number_series.description',

  generate(params: TaskParams): GeneratedTask<NumberSeriesData> {
    const lengthMap: Record<number, number> = { 1: 5, 2: 6, 3: 6, 4: 7, 5: 8 };
    const length = lengthMap[params.difficulty] ?? 6;

    const availablePatterns =
      params.difficulty <= 2 ? patterns.slice(0, 2) : patterns;
    const pattern = availablePatterns[Math.floor(Math.random() * availablePatterns.length)];
    const start = Math.floor(Math.random() * 10) + 1;
    const series = pattern(start, length);

    const hiddenIndex = series.length - 1;
    const answer = series[hiddenIndex];

    // Strip the hidden value from the series sent to the client
    const visibleSeries = [...series];
    visibleSeries[hiddenIndex] = null as unknown as number;

    return {
      type: 'number_series',
      category: 'logic',
      difficulty: params.difficulty,
      data: { series: visibleSeries, answer, hiddenIndex },
      timeLimitMs: 60_000,
    };
  },

  validate(
    task: GeneratedTask<NumberSeriesData>,
    answer: NumberSeriesAnswer,
    timeMs: number,
  ): TaskResult {
    const isCorrect = answer === task.data.answer;
    const timeLimitMs = task.timeLimitMs ?? 60_000;
    const timeBonus = Math.max(0, Math.round((1 - timeMs / timeLimitMs) * 40));
    const score = isCorrect ? 60 + timeBonus : 0;

    return { score, timeMs, isCorrect };
  },

  sanitizeForClient(data: NumberSeriesData) {
    const series = [...data.series];
    series[data.hiddenIndex] = null as unknown as number;
    return { series, hiddenIndex: data.hiddenIndex };
  },
};
