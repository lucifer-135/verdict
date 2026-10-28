import success from '@/fixtures/youcam/skin-analysis-success.json';
import { isConcernId, SD_ACTIONS, type ConcernId } from '@/lib/verdict/concerns';
import { normalizeAnalysis } from './normalize';
import type { YouCamClient } from './client';

/** How much a goal (subset) analysis improves each raw score in mock mode. */
const MOCK_GOAL_LIFT = 15;

/**
 * Fixture-backed client for YOUCAM_MOCK=1. A full 16-concern scan returns the
 * recorded result; a subset (the goal analysis) returns lifted scores for just
 * those concerns.
 */
export function createMockClient(): YouCamClient {
  const full = normalizeAnalysis(success.data.results.output);
  return {
    async createSkinAnalysis(_src, actions) {
      return { taskId: `mock-analysis:${actions.join(',')}` };
    },
    async getSkinAnalysis(taskId) {
      const actions = taskId.replace(/^mock-analysis:/, '').split(',').filter(isConcernId);
      if (actions.length >= SD_ACTIONS.length) return { status: 'success', result: full };
      const scores: typeof full.scores = {};
      for (const c of actions as ConcernId[]) {
        const s = full.scores[c];
        if (s) scores[c] = { raw: Math.min(99, s.raw + MOCK_GOAL_LIFT), ui: Math.min(99, s.ui + MOCK_GOAL_LIFT) };
      }
      return { status: 'success', result: { overall: null, skinAge: null, skinType: null, scores, maskUrls: {} } };
    },
    async createSkinSimulation() {
      return { taskId: 'mock-simulation' };
    },
    async getSkinSimulation() {
      return { status: 'success', result: { imageUrl: '/fixtures/sim-placeholder.svg' } };
    },
  };
}
