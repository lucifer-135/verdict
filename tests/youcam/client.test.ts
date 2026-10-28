// @vitest-environment node
import { vi } from 'vitest';
import fileInit from '@/fixtures/youcam/file-init.json';
import analysisCreate from '@/fixtures/youcam/skin-analysis-create.json';
import analysisRunning from '@/fixtures/youcam/skin-analysis-running.json';
import analysisSuccess from '@/fixtures/youcam/skin-analysis-success.json';
import analysisError from '@/fixtures/youcam/skin-analysis-error-face.json';
import simCreate from '@/fixtures/youcam/skin-simulation-create.json';
import simSuccess from '@/fixtures/youcam/skin-simulation-success.json';
import { createYouCamClient, getClient } from '@/lib/youcam/client';
import { YouCamError } from '@/lib/youcam/errors';
import { SD_ACTIONS } from '@/lib/verdict/concerns';

const BASE = 'https://api.test';
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

function setup(...responses: Response[]) {
  const fetchMock = vi.fn<typeof fetch>();
  for (const r of responses) fetchMock.mockResolvedValueOnce(r);
  const client = createYouCamClient({ apiKey: 'test-key', baseUrl: BASE, fetch: fetchMock });
  return { client, fetchMock };
}

const bytes = new Uint8Array([1, 2, 3, 4]);

test('createSkinAnalysis: file init → PUT → task, with bearer auth', async () => {
  const { client, fetchMock } = setup(json(fileInit), new Response(null), json(analysisCreate));
  const { taskId } = await client.createSkinAnalysis({ bytes }, SD_ACTIONS);

  const [initUrl, initReq] = fetchMock.mock.calls[0];
  expect(initUrl).toBe(`${BASE}/s2s/v2.0/file`);
  expect(new Headers(initReq!.headers).get('Authorization')).toBe('Bearer test-key');
  expect(JSON.parse(initReq!.body as string)).toEqual({
    files: [{ content_type: 'image/jpeg', file_name: 'scan.jpg', file_size: 4 }],
  });

  const [putUrl, putReq] = fetchMock.mock.calls[1];
  expect(putUrl).toBe(fileInit.data.files[0].requests[0].url);
  expect(putReq!.method).toBe('PUT');
  expect(new Headers(putReq!.headers).get('Authorization')).toBeNull();

  const [taskUrl, taskReq] = fetchMock.mock.calls[2];
  expect(taskUrl).toBe(`${BASE}/s2s/v2.0/task/skin-analysis`);
  const body = JSON.parse(taskReq!.body as string);
  expect(body.src_file_id).toBe(fileInit.data.files[0].file_id);
  expect(body.dst_actions).toHaveLength(16);
  expect(body.format).toBe('json');
  expect(body.miniserver_args).toEqual({ enable_mask_overlay: false });
  expect(taskId).toBe(analysisCreate.data.task_id);
});

test('getSkinAnalysis normalizes success fixture', async () => {
  const { client, fetchMock } = setup(json(analysisSuccess));
  const s = await client.getSkinAnalysis('a/b+c');
  expect(fetchMock.mock.calls[0][0]).toBe(`${BASE}/s2s/v2.0/task/skin-analysis/a%2Fb%2Bc`);
  expect(s.status).toBe('success');
  if (s.status !== 'success') return;
  expect(s.result.scores.oiliness).toEqual({ raw: 72.12769317626953, ui: 77 });
  expect(Object.keys(s.result.scores)).toHaveLength(15);
  expect(s.result.overall).toBe(80.8);
  expect(s.result.skinAge).toBe(21);
  expect(s.result.skinType).toBe('Combination');
  expect(s.result.maskUrls.oiliness).toBe('/fixtures/masks/oiliness.jpg');
  expect(s.result.maskUrls).not.toHaveProperty('skin_type');
});

test('getSkinAnalysis maps running and error fixtures', async () => {
  const { client } = setup(json(analysisRunning), json(analysisError));
  expect(await client.getSkinAnalysis('t')).toEqual({ status: 'running' });
  expect(await client.getSkinAnalysis('t')).toEqual({
    status: 'error',
    code: 'error_src_face_too_small',
    message: analysisError.data.error_message,
  });
});

test('createSkinSimulation sends flat simulation keys', async () => {
  const { client, fetchMock } = setup(json(fileInit), new Response(null), json(simCreate));
  const { taskId } = await client.createSkinSimulation({ bytes }, [
    { concern: 'oiliness', intensity: 0.4 },
    { concern: 'pore', intensity: 0.4 },
  ]);
  const [url, req] = fetchMock.mock.calls[2];
  expect(url).toBe(`${BASE}/s2s/v2.0/task/skin-simulation`);
  expect(JSON.parse(req!.body as string)).toEqual({
    src_file_id: fileInit.data.files[0].file_id,
    oiliness: 0.4,
    pores: 0.4,
  });
  expect(taskId).toBe(simCreate.data.task_id);
});

test('getSkinSimulation returns the result image url', async () => {
  const { client } = setup(json(simSuccess));
  expect(await client.getSkinSimulation('t')).toEqual({
    status: 'success',
    result: { imageUrl: '/fixtures/sim-result.jpg' },
  });
});

test('API rejection becomes YouCamError with the error_code', async () => {
  const { client } = setup(json({ status: 400, error: 'Insufficient unit', error_code: 'CreditInsufficiency' }, 400));
  await expect(client.getSkinAnalysis('t')).rejects.toMatchObject({
    name: 'YouCamError',
    code: 'CreditInsufficiency',
    status: 400,
  });
  await expect(Promise.reject(new YouCamError('x', 500))).rejects.toBeInstanceOf(YouCamError);
});

describe('mock mode', () => {
  beforeEach(() => vi.stubEnv('YOUCAM_MOCK', '1'));
  afterEach(() => vi.unstubAllEnvs());

  test('never calls fetch', async () => {
    const spy = vi.spyOn(globalThis, 'fetch');
    const client = getClient();
    const { taskId } = await client.createSkinAnalysis({ bytes }, SD_ACTIONS);
    const s = await client.getSkinAnalysis(taskId);
    expect(s.status).toBe('success');
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  test('a subset of actions returns improved scores for just those concerns', async () => {
    const client = getClient();
    const { taskId } = await client.createSkinAnalysis({ bytes }, ['oiliness']);
    const s = await client.getSkinAnalysis(taskId);
    if (s.status !== 'success') throw new Error('expected success');
    expect(Object.keys(s.result.scores)).toEqual(['oiliness']);
    expect(s.result.scores.oiliness!.raw).toBeGreaterThan(72.12769317626953);
  });

  test('simulation returns the committed placeholder image', async () => {
    const client = getClient();
    const { taskId } = await client.createSkinSimulation({ bytes }, [{ concern: 'oiliness', intensity: 0.4 }]);
    expect(await client.getSkinSimulation(taskId)).toEqual({
      status: 'success',
      result: { imageUrl: '/fixtures/sim-placeholder.svg' },
    });
  });
});
