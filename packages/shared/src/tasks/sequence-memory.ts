import type { TaskDefinition, TaskParams, GeneratedTask, TaskResult } from '../types/task.js';

export interface SequenceMemoryData {
  sequence: number[];
  displayTimeMs: number;
}

export type SequenceMemoryAnswer = number[];

export const sequenceMemoryTask: TaskDefinition<SequenceMemoryData, SequenceMemoryAnswer> = {
  type: 'sequence_memory',
  category: 'memory',
  nameKey: 'tasks.sequence_memory.name',
  descriptionKey: 'tasks.sequence_memory.description',

  generate(params: TaskParams): GeneratedTask<SequenceMemoryData> {
    const lengthMap: Record<number, number> = { 1: 4, 2: 5, 3: 7, 4: 9, 5: 12 };
    const length = lengthMap[params.difficulty] ?? 7;
    const sequence = Array.from({ length }, () => Math.floor(Math.random() * 9) + 1);
    const displayTimeMs = 1000 + length * 600;

    return {
      type: 'sequence_memory',
      category: 'memory',
      difficulty: params.difficulty,
      data: { sequence, displayTimeMs },
      timeLimitMs: displayTimeMs + length * 2000,
    };
  },

  validate(
    task: GeneratedTask<SequenceMemoryData>,
    answer: SequenceMemoryAnswer,
    timeMs: number,
  ): TaskResult {
    const { sequence } = task.data;
    const isCorrect =
      answer.length === sequence.length && answer.every((v, i) => v === sequence[i]);

    let score = 0;
    if (isCorrect) {
      score = 50 + Math.min(50, Math.round(sequence.length * 5));
    } else {
      // Partial credit for partially correct
      let correct = 0;
      for (let i = 0; i < Math.min(answer.length, sequence.length); i++) {
        if (answer[i] === sequence[i]) correct++;
      }
      score = Math.round((correct / sequence.length) * 30);
    }

    return { score, timeMs, isCorrect };
  },

  sanitizeForClient(data: SequenceMemoryData) {
    return { sequence: data.sequence, displayTimeMs: data.displayTimeMs };
  },
};
