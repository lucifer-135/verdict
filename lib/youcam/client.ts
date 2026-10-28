import 'server-only';
import { getConcern, type ConcernId } from '@/lib/verdict/concerns';
import { withDevCache } from './devCache';
import { YouCamError } from './errors';
import { createMockClient } from './mock';
import {
  normalizeAnalysis,
  toTaskState,
  type SkinAnalysisResult,
  type SkinSimulationResult,
  type TaskData,
  type TaskState,
} from './normalize';

export type { SkinAnalysisResult, SkinSimulationResult, TaskState } from './normalize';

export interface YouCamClient {
  createSkinAnalysis(src: { bytes: Uint8Array }, actions: readonly ConcernId[]): Promise<{ taskId: string }>;
  getSkinAnalysis(taskId: string): Promise<TaskState<SkinAnalysisResult>>;
  createSkinSimulation(
    src: { bytes: Uint8Array },
    concerns: { concern: ConcernId; intensity: number }[],
  ): Promise<{ taskId: string }>;
  getSkinSimulation(taskId: string): Promise<TaskState<SkinSimulationResult>>;
}

interface ClientOptions {
  apiKey: string;
  baseUrl: string;
  fetch?: typeof fetch;
}

/** Real client for the YouCam s2s v2.0 API. Request shapes: docs/youcam-api-notes.md. */
export function createYouCamClient({ apiKey, baseUrl, fetch: doFetch = fetch }: ClientOptions): YouCamClient {
  async function api<T>(method: 'GET' | 'POST', path: string, body?: unknown): Promise<T> {
    const res = await doFetch(`${baseUrl}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new YouCamError(json.error_code ?? `http_${res.status}`, res.status, json.error ?? res.statusText);
    return json.data as T;
  }

  /** Reserve an upload slot, then PUT the bytes to the presigned URL. Returns the file id. */
  async function upload(bytes: Uint8Array): Promise<string> {
    const init = await api<{ files: { file_id: string; requests: { method: string; url: string; headers: Record<string, string> }[] }[] }>(
      'POST',
      '/s2s/v2.0/file',
      { files: [{ content_type: 'image/jpeg', file_name: 'scan.jpg', file_size: bytes.length }] },
    );
    const file = init.files[0];
    const put = file.requests[0];
    const res = await doFetch(put.url, { method: put.method, headers: put.headers, body: bytes as BodyInit });
    if (!res.ok) throw new YouCamError('upload_failed', res.status);
    return file.file_id;
  }

  const taskPath = (kind: string, taskId: string) => `/s2s/v2.0/task/${kind}/${encodeURIComponent(taskId)}`;

  return {
    async createSkinAnalysis({ bytes }, actions) {
      const fileId = await upload(bytes);
      const data = await api<{ task_id: string }>('POST', '/s2s/v2.0/task/skin-analysis', {
        src_file_id: fileId,
        dst_actions: actions,
        miniserver_args: { enable_mask_overlay: false },
        format: 'json',
      });
      return { taskId: data.task_id };
    },

    async getSkinAnalysis(taskId) {
      const data = await api<TaskData>('GET', taskPath('skin-analysis', taskId));
      return toTaskState(data, r => normalizeAnalysis(r.output ?? []));
    },

    async createSkinSimulation({ bytes }, concerns) {
      const fileId = await upload(bytes);
      const body: Record<string, unknown> = { src_file_id: fileId };
      for (const { concern, intensity } of concerns) {
        const key = getConcern(concern).simKey;
        if (key) body[key] = intensity;
      }
      const data = await api<{ task_id: string }>('POST', '/s2s/v2.0/task/skin-simulation', body);
      return { taskId: data.task_id };
    },

    async getSkinSimulation(taskId) {
      const data = await api<TaskData>('GET', taskPath('skin-simulation', taskId));
      return toTaskState(data, r => ({ imageUrl: r.url ?? '' }));
    },
  };
}

/** Mock client when YOUCAM_MOCK=1; otherwise the real client, disk-cached in development. */
export function getClient(): YouCamClient {
  if (process.env.YOUCAM_MOCK === '1') return createMockClient();
  const apiKey = process.env.YOUCAM_API_KEY;
  if (!apiKey) throw new YouCamError('missing_api_key', 500, 'YOUCAM_API_KEY is not set');
  const client = createYouCamClient({
    apiKey,
    baseUrl: process.env.YOUCAM_BASE_URL || 'https://yce-api-01.makeupar.com',
  });
  return process.env.NODE_ENV === 'development' ? withDevCache(client, '.cache/youcam') : client;
}
