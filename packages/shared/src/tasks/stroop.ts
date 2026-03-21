import type { TaskDefinition, TaskParams, GeneratedTask, TaskResult } from '../types/task.js';

const COLORS = ['red', 'blue', 'green', 'yellow', 'purple', 'orange'] as const;
export type StroopColor = (typeof COLORS)[number];

export interface StroopItem {
  word: string;
  color: StroopColor;
  correctAnswer: StroopColor;
}

export interface StroopData {
  items: StroopItem[];
}

export type StroopAnswer = StroopColor[];

export const stroopTask: TaskDefinition<StroopData, StroopAnswer> = {
  type: 'stroop',
  category: 'attention',
  nameKey: 'tasks.stroop.name',
  descriptionKey: 'tasks.stroop.description',

  generate(params: TaskParams): GeneratedTask<StroopData> {
    const countMap: Record<number, number> = { 1: 5, 2: 8, 3: 10, 4: 12, 5: 15 };
    const count = countMap[params.difficulty] ?? 10;

    const items: StroopItem[] = Array.from({ length: count }, () => {
      const wordIndex = Math.floor(Math.random() * COLORS.length);
      let colorIndex: number;
      do {
        colorIndex = Math.floor(Math.random() * COLORS.length);
      } while (colorIndex === wordIndex);

      return {
        word: COLORS[wordIndex],
        color: COLORS[colorIndex],
        correctAnswer: COLORS[colorIndex],
      };
    });

    return {
      type: 'stroop',
      category: 'attention',
      difficulty: params.difficulty,
      data: { items },
      timeLimitMs: count * 5000,
    };
  },

  validate(task: GeneratedTask<StroopData>, answer: StroopAnswer, timeMs: number): TaskResult {
    const { items } = task.data;
    let correct = 0;

    for (let i = 0; i < items.length; i++) {
      if (answer[i] === items[i].correctAnswer) correct++;
    }

    const accuracy = correct / items.length;
    const isCorrect = accuracy === 1;
    const timeLimitMs = task.timeLimitMs ?? 60_000;
    const timeBonus = Math.max(0, Math.round((1 - timeMs / timeLimitMs) * 30));
    const score = Math.round(accuracy * 70) + (isCorrect ? timeBonus : 0);

    return {
      score,
      timeMs,
      isCorrect,
      details: { correct, total: items.length },
    };
  },

  sanitizeForClient(data: StroopData) {
    return {
      items: data.items.map((item) => ({ word: item.word, color: item.color })),
    };
  },
};
