import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { YouCamClient } from './client';
import type { SkinAnalysisResult } from './normalize';

const CACHED = 'cached:';
/** Separates the real task id from the cache key; YouCam task ids never contain it. */
const SEP = '~';

/**
 * Development-only wrapper: a finished skin analysis is stored on disk keyed by
 * image bytes + actions, so re-scanning the same photo spends no units. The key
 * rides along in the task id, so no server state is needed between requests.
 * Mask URLs in cached results expire after 24 h.
 */
export function withDevCache(inner: YouCamClient, dir: string): YouCamClient {
  const fileFor = (key: string) => join(dir, `${key}.json`);

  return {
    ...inner,

    async createSkinAnalysis(src, actions) {
      const key = createHash('sha256')
        .update(src.bytes)
        .update(`skin-analysis|${actions.join(',')}`)
        .digest('hex');
      if (existsSync(fileFor(key))) return { taskId: `${CACHED}${key}` };
      const { taskId } = await inner.createSkinAnalysis(src, actions);
      return { taskId: `${taskId}${SEP}${key}` };
    },

    async getSkinAnalysis(taskId) {
      if (taskId.startsWith(CACHED)) {
        const result = JSON.parse(readFileSync(fileFor(taskId.slice(CACHED.length)), 'utf8')) as SkinAnalysisResult;
        return { status: 'success', result };
      }
      const [realId, key] = taskId.split(SEP);
      const state = await inner.getSkinAnalysis(realId);
      if (state.status === 'success' && key) {
        mkdirSync(dir, { recursive: true });
        writeFileSync(fileFor(key), JSON.stringify(state.result));
      }
      return state;
    },
  };
}
