import { describe, it, expect } from 'vitest';
import { schulteTask } from '../src/tasks/schulte.js';
import { sequenceMemoryTask } from '../src/tasks/sequence-memory.js';
import { arithmeticTask } from '../src/tasks/arithmetic.js';
import { stroopTask } from '../src/tasks/stroop.js';
import { numberSeriesTask } from '../src/tasks/number-series.js';
import { memoryPairsTask } from '../src/tasks/memory-pairs.js';
import { patternSearchTask } from '../src/tasks/pattern-search.js';

describe('schulteTask', () => {
  it('generates a grid of correct size', () => {
    const task = schulteTask.generate({ difficulty: 3 });
    expect(task.data.size).toBe(5);
    expect(task.data.grid).toHaveLength(25);
    expect(new Set(task.data.grid).size).toBe(25);
  });

  it('validates correct answer', () => {
    const task = schulteTask.generate({ difficulty: 1 });
    const correctAnswer = Array.from({ length: task.data.size ** 2 }, (_, i) => i + 1);
    const result = schulteTask.validate(task, correctAnswer, 5000);
    expect(result.isCorrect).toBe(true);
    expect(result.score).toBeGreaterThan(0);
  });

  it('rejects wrong answer', () => {
    const task = schulteTask.generate({ difficulty: 1 });
    const result = schulteTask.validate(task, [9, 8, 7, 6, 5, 4, 3, 2, 1], 5000);
    expect(result.isCorrect).toBe(false);
    expect(result.score).toBe(0);
  });
});

describe('sequenceMemoryTask', () => {
  it('generates a sequence of correct length', () => {
    const task = sequenceMemoryTask.generate({ difficulty: 2 });
    expect(task.data.sequence).toHaveLength(5);
    expect(task.data.displayTimeMs).toBeGreaterThan(0);
  });

  it('validates correct answer', () => {
    const task = sequenceMemoryTask.generate({ difficulty: 1 });
    const result = sequenceMemoryTask.validate(task, [...task.data.sequence], 3000);
    expect(result.isCorrect).toBe(true);
    expect(result.score).toBeGreaterThan(0);
  });

  it('gives partial credit for partial answer', () => {
    const task = sequenceMemoryTask.generate({ difficulty: 1 });
    const partialAnswer = [task.data.sequence[0], 0, 0, 0];
    const result = sequenceMemoryTask.validate(task, partialAnswer, 3000);
    expect(result.isCorrect).toBe(false);
    expect(result.score).toBeGreaterThan(0);
  });
});

describe('arithmeticTask', () => {
  it('generates problems with correct count', () => {
    const task = arithmeticTask.generate({ difficulty: 1 });
    expect(task.data.problems).toHaveLength(5);
    task.data.problems.forEach((p) => {
      expect(p.expression).toBeTruthy();
      expect(typeof p.correctAnswer).toBe('number');
    });
  });

  it('validates all correct answers', () => {
    const task = arithmeticTask.generate({ difficulty: 1 });
    const correct = task.data.problems.map((p) => p.correctAnswer);
    const result = arithmeticTask.validate(task, correct, 10000);
    expect(result.isCorrect).toBe(true);
    expect(result.score).toBeGreaterThan(70);
  });

  it('validates wrong answers', () => {
    const task = arithmeticTask.generate({ difficulty: 1 });
    const wrong = task.data.problems.map(() => -999);
    const result = arithmeticTask.validate(task, wrong, 10000);
    expect(result.isCorrect).toBe(false);
    expect(result.score).toBe(0);
  });
});

describe('stroopTask', () => {
  it('generates items with conflicting word/color', () => {
    const task = stroopTask.generate({ difficulty: 3 });
    expect(task.data.items).toHaveLength(10);
    task.data.items.forEach((item) => {
      expect(item.word).not.toBe(item.color);
      expect(item.correctAnswer).toBe(item.color);
    });
  });

  it('validates correct answers', () => {
    const task = stroopTask.generate({ difficulty: 1 });
    const correct = task.data.items.map((i) => i.correctAnswer);
    const result = stroopTask.validate(task, correct, 5000);
    expect(result.isCorrect).toBe(true);
    expect(result.score).toBeGreaterThan(0);
  });
});

describe('numberSeriesTask', () => {
  it('generates a series with hidden answer', () => {
    const task = numberSeriesTask.generate({ difficulty: 1 });
    expect(task.data.series.length).toBeGreaterThanOrEqual(5);
    expect(typeof task.data.answer).toBe('number');
    // The hidden index should be null in visible series
    expect(task.data.series[task.data.hiddenIndex]).toBeNull();
  });

  it('validates correct answer', () => {
    const task = numberSeriesTask.generate({ difficulty: 1 });
    const result = numberSeriesTask.validate(task, task.data.answer, 10000);
    expect(result.isCorrect).toBe(true);
    expect(result.score).toBeGreaterThan(0);
  });

  it('rejects wrong answer', () => {
    const task = numberSeriesTask.generate({ difficulty: 1 });
    const result = numberSeriesTask.validate(task, task.data.answer + 99999, 10000);
    expect(result.isCorrect).toBe(false);
    expect(result.score).toBe(0);
  });
});

describe('memoryPairsTask', () => {
  it('generates cards with correct pair count', () => {
    const task = memoryPairsTask.generate({ difficulty: 1 });
    expect(task.data.cards).toHaveLength(8);
    // Each value appears exactly twice
    const counts = new Map<number, number>();
    for (const c of task.data.cards) {
      counts.set(c, (counts.get(c) ?? 0) + 1);
    }
    counts.forEach((count) => expect(count).toBe(2));
  });

  it('validates all pairs found', () => {
    const task = memoryPairsTask.generate({ difficulty: 1 });
    const { cards } = task.data;
    // Find all pairs perfectly
    const moves: [number, number][] = [];
    const seen = new Map<number, number>();
    for (let i = 0; i < cards.length; i++) {
      if (seen.has(cards[i])) {
        moves.push([seen.get(cards[i])!, i]);
      } else {
        seen.set(cards[i], i);
      }
    }
    const result = memoryPairsTask.validate(task, moves, 10000);
    expect(result.isCorrect).toBe(true);
    expect(result.score).toBeGreaterThan(0);
  });
});

describe('patternSearchTask', () => {
  it('generates a pattern with options', () => {
    const task = patternSearchTask.generate({ difficulty: 1 });
    expect(task.data.sequence.length).toBeGreaterThanOrEqual(5);
    expect(task.data.options).toHaveLength(4);
    expect(task.data.correctOptionIndex).toBeGreaterThanOrEqual(0);
    expect(task.data.correctOptionIndex).toBeLessThan(4);
  });

  it('validates correct answer', () => {
    const task = patternSearchTask.generate({ difficulty: 1 });
    const result = patternSearchTask.validate(task, task.data.correctOptionIndex, 5000);
    expect(result.isCorrect).toBe(true);
    expect(result.score).toBeGreaterThan(0);
  });

  it('rejects wrong answer', () => {
    const task = patternSearchTask.generate({ difficulty: 1 });
    const wrongIndex = (task.data.correctOptionIndex + 1) % 4;
    const result = patternSearchTask.validate(task, wrongIndex, 5000);
    expect(result.isCorrect).toBe(false);
    expect(result.score).toBe(0);
  });
});
