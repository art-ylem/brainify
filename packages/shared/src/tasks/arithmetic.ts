import type { TaskDefinition, TaskParams, GeneratedTask, TaskResult } from '../types/task.js';

type Operator = '+' | '-' | '*';

export interface ArithmeticProblem {
  expression: string;
  correctAnswer: number;
}

export interface ArithmeticData {
  problems: ArithmeticProblem[];
}

export type ArithmeticAnswer = number[];

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateProblem(difficulty: number): ArithmeticProblem {
  const operators: Operator[] = difficulty <= 2 ? ['+', '-'] : ['+', '-', '*'];
  const op = operators[Math.floor(Math.random() * operators.length)];

  let a: number, b: number, answer: number;

  const maxNum = [10, 20, 50, 100, 200][difficulty - 1] ?? 50;

  switch (op) {
    case '+':
      a = randomInt(1, maxNum);
      b = randomInt(1, maxNum);
      answer = a + b;
      break;
    case '-':
      a = randomInt(1, maxNum);
      b = randomInt(1, a); // ensure non-negative result
      answer = a - b;
      break;
    case '*':
      a = randomInt(2, Math.min(maxNum, 12));
      b = randomInt(2, Math.min(maxNum, 12));
      answer = a * b;
      break;
    default:
      a = 1;
      b = 1;
      answer = 2;
  }

  return { expression: `${a} ${op} ${b}`, correctAnswer: answer };
}

export const arithmeticTask: TaskDefinition<ArithmeticData, ArithmeticAnswer> = {
  type: 'arithmetic',
  category: 'speed',
  nameKey: 'tasks.arithmetic.name',
  descriptionKey: 'tasks.arithmetic.description',

  generate(params: TaskParams): GeneratedTask<ArithmeticData> {
    const countMap: Record<number, number> = { 1: 5, 2: 8, 3: 10, 4: 12, 5: 15 };
    const count = countMap[params.difficulty] ?? 10;
    const problems = Array.from({ length: count }, () => generateProblem(params.difficulty));

    return {
      type: 'arithmetic',
      category: 'speed',
      difficulty: params.difficulty,
      data: { problems },
      timeLimitMs: count * 8000,
    };
  },

  validate(
    task: GeneratedTask<ArithmeticData>,
    answer: ArithmeticAnswer,
    timeMs: number,
  ): TaskResult {
    const { problems } = task.data;
    let correct = 0;

    for (let i = 0; i < problems.length; i++) {
      if (answer[i] === problems[i].correctAnswer) correct++;
    }

    const accuracy = correct / problems.length;
    const isCorrect = accuracy === 1;
    const timeLimitMs = task.timeLimitMs ?? 60_000;
    const timeBonus = Math.max(0, Math.round((1 - timeMs / timeLimitMs) * 30));
    const score = Math.round(accuracy * 70) + (isCorrect ? timeBonus : 0);

    return {
      score,
      timeMs,
      isCorrect,
      details: { correct, total: problems.length },
    };
  },

  sanitizeForClient(data: ArithmeticData) {
    return {
      problems: data.problems.map((p) => ({ expression: p.expression })),
    };
  },
};
