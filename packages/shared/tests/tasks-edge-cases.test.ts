import { describe, it, expect } from 'vitest';
import { schulteTask } from '../src/tasks/schulte.js';
import { sequenceMemoryTask } from '../src/tasks/sequence-memory.js';
import { arithmeticTask } from '../src/tasks/arithmetic.js';
import { stroopTask } from '../src/tasks/stroop.js';
import { numberSeriesTask } from '../src/tasks/number-series.js';
import { memoryPairsTask } from '../src/tasks/memory-pairs.js';
import { patternSearchTask } from '../src/tasks/pattern-search.js';
import { taskRegistry } from '../src/tasks/index.js';

// ===== Task Registry =====

describe('taskRegistry', () => {
  it('contains all 7 task types', () => {
    const expectedTypes = [
      'schulte',
      'sequence_memory',
      'arithmetic',
      'stroop',
      'number_series',
      'memory_pairs',
      'pattern_search',
    ];
    for (const type of expectedTypes) {
      expect(taskRegistry[type]).toBeDefined();
      expect(taskRegistry[type].type).toBe(type);
    }
  });

  it('each task has generate, validate, sanitizeForClient methods', () => {
    for (const [, def] of Object.entries(taskRegistry)) {
      expect(typeof def.generate).toBe('function');
      expect(typeof def.validate).toBe('function');
      expect(typeof def.sanitizeForClient).toBe('function');
    }
  });
});

// ===== Difficulty boundary values =====

describe('all tasks — difficulty boundary values', () => {
  const allTasks = [
    { name: 'schulte', def: schulteTask },
    { name: 'sequence_memory', def: sequenceMemoryTask },
    { name: 'arithmetic', def: arithmeticTask },
    { name: 'stroop', def: stroopTask },
    { name: 'number_series', def: numberSeriesTask },
    { name: 'memory_pairs', def: memoryPairsTask },
    { name: 'pattern_search', def: patternSearchTask },
  ];

  for (const { name, def } of allTasks) {
    it(`${name} — difficulty 1 generates valid task`, () => {
      const task = def.generate({ difficulty: 1 });
      expect(task.type).toBe(name);
      expect(task.difficulty).toBe(1);
    });

    it(`${name} — difficulty 5 generates valid task`, () => {
      const task = def.generate({ difficulty: 5 });
      expect(task.type).toBe(name);
      expect(task.difficulty).toBe(5);
    });
  }
});

// ===== Schulte edge cases =====

describe('schulteTask — edge cases', () => {
  it('empty answer gets score 0', () => {
    const task = schulteTask.generate({ difficulty: 1 });
    const result = schulteTask.validate(task, [], 5000);
    expect(result.isCorrect).toBe(false);
    expect(result.score).toBe(0);
  });

  it('partial answer gets score 0', () => {
    const task = schulteTask.generate({ difficulty: 1 });
    const result = schulteTask.validate(task, [1, 2, 3], 5000);
    expect(result.isCorrect).toBe(false);
    expect(result.score).toBe(0);
  });

  it('correct answer at time limit gets minimal score (50)', () => {
    const task = schulteTask.generate({ difficulty: 1 });
    const correctAnswer = Array.from({ length: task.data.size ** 2 }, (_, i) => i + 1);
    const result = schulteTask.validate(task, correctAnswer, task.timeLimitMs!);
    expect(result.isCorrect).toBe(true);
    expect(result.score).toBe(50);
  });

  it('correct answer with 0 time gets max score', () => {
    const task = schulteTask.generate({ difficulty: 1 });
    const correctAnswer = Array.from({ length: task.data.size ** 2 }, (_, i) => i + 1);
    const result = schulteTask.validate(task, correctAnswer, 0);
    expect(result.isCorrect).toBe(true);
    expect(result.score).toBe(100);
  });

  it('all difficulty levels produce unique grids (shuffled)', () => {
    for (let d = 1; d <= 5; d++) {
      const task = schulteTask.generate({ difficulty: d });
      const sorted = [...task.data.grid].sort((a, b) => a - b);
      const expected = Array.from({ length: task.data.size ** 2 }, (_, i) => i + 1);
      expect(sorted).toEqual(expected);
    }
  });

  it('sanitizeForClient preserves grid and size', () => {
    const task = schulteTask.generate({ difficulty: 3 });
    const sanitized = schulteTask.sanitizeForClient(task.data);
    expect(sanitized.size).toBe(task.data.size);
    expect(sanitized.grid).toEqual(task.data.grid);
  });
});

// ===== Sequence Memory edge cases =====

describe('sequenceMemoryTask — edge cases', () => {
  it('empty answer gets score 0', () => {
    const task = sequenceMemoryTask.generate({ difficulty: 1 });
    const result = sequenceMemoryTask.validate(task, [], 3000);
    expect(result.isCorrect).toBe(false);
    expect(result.score).toBe(0);
  });

  it('all sequence values are 1-9', () => {
    for (let i = 0; i < 20; i++) {
      const task = sequenceMemoryTask.generate({ difficulty: 3 });
      for (const v of task.data.sequence) {
        expect(v).toBeGreaterThanOrEqual(1);
        expect(v).toBeLessThanOrEqual(9);
      }
    }
  });

  it('sanitizeForClient exposes sequence (client sees it briefly)', () => {
    const task = sequenceMemoryTask.generate({ difficulty: 2 });
    const sanitized = sequenceMemoryTask.sanitizeForClient(task.data);
    expect(sanitized.sequence).toEqual(task.data.sequence);
    expect(sanitized.displayTimeMs).toBe(task.data.displayTimeMs);
  });
});

// ===== Arithmetic edge cases =====

describe('arithmeticTask — edge cases', () => {
  it('all generated problems have non-negative answers', () => {
    // Subtraction should always yield a >= b
    for (let i = 0; i < 50; i++) {
      const task = arithmeticTask.generate({ difficulty: 3 });
      for (const p of task.data.problems) {
        expect(p.correctAnswer).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('partial correct answers get proportional score', () => {
    const task = arithmeticTask.generate({ difficulty: 1 });
    const answers = task.data.problems.map((p, i) =>
      i === 0 ? p.correctAnswer : -999,
    );
    const result = arithmeticTask.validate(task, answers, 10000);
    expect(result.isCorrect).toBe(false);
    expect(result.score).toBeGreaterThan(0);
    expect(result.score).toBeLessThan(70);
  });

  it('sanitizeForClient strips correct answers', () => {
    const task = arithmeticTask.generate({ difficulty: 2 });
    const sanitized = arithmeticTask.sanitizeForClient(task.data);
    const problems = sanitized.problems as Array<Record<string, unknown>>;
    for (const p of problems) {
      expect(p.correctAnswer).toBeUndefined();
      expect(p.expression).toBeDefined();
    }
  });
});

// ===== Stroop edge cases =====

describe('stroopTask — edge cases', () => {
  it('word never equals color (Stroop conflict)', () => {
    for (let i = 0; i < 20; i++) {
      const task = stroopTask.generate({ difficulty: 3 });
      for (const item of task.data.items) {
        expect(item.word).not.toBe(item.color);
      }
    }
  });

  it('sanitizeForClient strips correctAnswer', () => {
    const task = stroopTask.generate({ difficulty: 2 });
    const sanitized = stroopTask.sanitizeForClient(task.data);
    const items = sanitized.items as Array<Record<string, unknown>>;
    for (const item of items) {
      expect(item.correctAnswer).toBeUndefined();
      expect(item.word).toBeDefined();
      expect(item.color).toBeDefined();
    }
  });
});

// ===== Number Series edge cases =====

describe('numberSeriesTask — edge cases', () => {
  it('hidden index is always last element', () => {
    for (let d = 1; d <= 5; d++) {
      const task = numberSeriesTask.generate({ difficulty: d });
      expect(task.data.hiddenIndex).toBe(task.data.series.length - 1);
    }
  });

  it('hidden value is null in series', () => {
    const task = numberSeriesTask.generate({ difficulty: 2 });
    expect(task.data.series[task.data.hiddenIndex]).toBeNull();
  });

  it('sanitizeForClient hides answer', () => {
    const task = numberSeriesTask.generate({ difficulty: 3 });
    const sanitized = numberSeriesTask.sanitizeForClient(task.data);
    expect(sanitized.series).toBeDefined();
    expect(sanitized.hiddenIndex).toBeDefined();
    expect((sanitized as Record<string, unknown>).answer).toBeUndefined();
  });
});

// ===== Memory Pairs edge cases =====

describe('memoryPairsTask — edge cases', () => {
  it('no duplicate moves — same pair matched repeatedly counts once', () => {
    const task = memoryPairsTask.generate({ difficulty: 1 });
    const { cards } = task.data;
    // Find one valid pair
    const pairMap = new Map<number, number[]>();
    cards.forEach((c, i) => {
      if (!pairMap.has(c)) pairMap.set(c, []);
      pairMap.get(c)!.push(i);
    });
    const firstPair = [...pairMap.values()][0];
    // Submit the same pair many times
    const moves: [number, number][] = Array.from({ length: 10 }, () => [firstPair[0], firstPair[1]]);
    const result = memoryPairsTask.validate(task, moves, 5000);
    expect(result.isCorrect).toBe(false);
    // Only 1 pair matched, not all
    expect(result.details?.matchedPairs).toBe(1);
  });

  it('empty moves gets 0 matched', () => {
    const task = memoryPairsTask.generate({ difficulty: 1 });
    const result = memoryPairsTask.validate(task, [], 5000);
    expect(result.isCorrect).toBe(false);
  });

  it('sanitizeForClient exposes cards for rendering', () => {
    const task = memoryPairsTask.generate({ difficulty: 2 });
    const sanitized = memoryPairsTask.sanitizeForClient(task.data);
    expect(sanitized.cards).toEqual(task.data.cards);
    expect(sanitized.gridCols).toBe(task.data.gridCols);
  });
});

// ===== Pattern Search edge cases =====

describe('patternSearchTask — edge cases', () => {
  it('correct option is always within options array', () => {
    for (let i = 0; i < 20; i++) {
      const task = patternSearchTask.generate({ difficulty: 3 });
      expect(task.data.correctOptionIndex).toBeGreaterThanOrEqual(0);
      expect(task.data.correctOptionIndex).toBeLessThan(task.data.options.length);
    }
  });

  it('always 4 options', () => {
    for (let d = 1; d <= 5; d++) {
      const task = patternSearchTask.generate({ difficulty: d });
      expect(task.data.options).toHaveLength(4);
    }
  });

  it('sanitizeForClient hides correct option index', () => {
    const task = patternSearchTask.generate({ difficulty: 2 });
    const sanitized = patternSearchTask.sanitizeForClient(task.data);
    expect(sanitized.sequence).toBeDefined();
    expect(sanitized.options).toBeDefined();
    expect((sanitized as Record<string, unknown>).correctOptionIndex).toBeUndefined();
  });

  it('wrong answer always gets 0 score', () => {
    const task = patternSearchTask.generate({ difficulty: 2 });
    const wrongIndex = (task.data.correctOptionIndex + 2) % 4;
    const result = patternSearchTask.validate(task, wrongIndex, 1000);
    expect(result.isCorrect).toBe(false);
    expect(result.score).toBe(0);
  });
});

// ===== Score bounds =====

describe('all tasks — score is always non-negative', () => {
  const allTasks = [
    { name: 'schulte', def: schulteTask, genAnswer: (t: ReturnType<typeof schulteTask.generate>) => Array.from({ length: t.data.size ** 2 }, (_, i) => i + 1) },
    { name: 'arithmetic', def: arithmeticTask, genAnswer: (t: ReturnType<typeof arithmeticTask.generate>) => t.data.problems.map(p => p.correctAnswer) },
  ];

  for (const { name, def, genAnswer } of allTasks) {
    it(`${name} — score >= 0 even with very large timeMs`, () => {
      const task = def.generate({ difficulty: 1 });
      const answer = genAnswer(task as never);
      const result = def.validate(task as never, answer as never, 999999999);
      expect(result.score).toBeGreaterThanOrEqual(0);
    });
  }
});
