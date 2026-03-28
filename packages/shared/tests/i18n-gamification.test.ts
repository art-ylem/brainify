import { describe, it, expect } from 'vitest';
import { t } from '../src/i18n/index.js';

const NEW_KEYS = [
  // Difficulty selection (Stage 1)
  'difficulty.title',
  'difficulty.1',
  'difficulty.2',
  'difficulty.3',
  'difficulty.4',
  'difficulty.5',
  'difficulty.recommended',
  'difficulty.start',
  // Daily challenge (Stage 3)
  'challenge.daily_title',
  'challenge.accept',
  'challenge.completed',
  'challenge.bonus',
  // Cognitive profile (Stages 4-5)
  'cognitive.title',
  'cognitive.overall',
  'cognitive.percentile',
  'cognitive.percentile_text',
  'cognitive.weekly_trend',
  'cognitive.not_enough_data',
  // Training session (Stage 6)
  'training.title',
  'training.start',
  'training.step',
  'training.summary',
  'training.total_score',
  // Recommendations (Stage 4)
  'recommendation.expert',
  'recommendation.intermediate',
  'recommendation.beginner',
  // Onboarding (Stage 9)
  'onboarding.title',
  'onboarding.description',
  'onboarding.start',
  'onboarding.skip',
  'onboarding.result_title',
  'onboarding.continue',
];

describe('i18n — gamification/analytics new keys', () => {
  describe('all new keys exist in RU locale', () => {
    for (const key of NEW_KEYS) {
      it(`key "${key}" resolves in RU`, () => {
        const val = t('ru', key);
        expect(val).not.toBe(key); // should not return key itself
        expect(val.length).toBeGreaterThan(0);
      });
    }
  });

  describe('all new keys exist in EN locale', () => {
    for (const key of NEW_KEYS) {
      it(`key "${key}" resolves in EN`, () => {
        const val = t('en', key);
        expect(val).not.toBe(key);
        expect(val.length).toBeGreaterThan(0);
      });
    }
  });

  describe('difficulty names are unique', () => {
    it('RU difficulty names are all different', () => {
      const names = [1, 2, 3, 4, 5].map((d) => t('ru', `difficulty.${d}`));
      expect(new Set(names).size).toBe(5);
    });

    it('EN difficulty names are all different', () => {
      const names = [1, 2, 3, 4, 5].map((d) => t('en', `difficulty.${d}`));
      expect(new Set(names).size).toBe(5);
    });
  });

  describe('recommendation keys resolve differently', () => {
    it('3 distinct recommendations in RU', () => {
      const recs = ['expert', 'intermediate', 'beginner'].map((r) =>
        t('ru', `recommendation.${r}`),
      );
      expect(new Set(recs).size).toBe(3);
    });
  });
});
