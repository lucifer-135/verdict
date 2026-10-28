/**
 * One-off live check of the YouCam API shapes (plan Task 3).
 * Reads .local/spike-selfie.jpg and .local/spike-selfie-2.jpg, records responses
 * to fixtures/youcam/ and masks to public/fixtures/masks/. Costs ~45 units.
 * Run: npm run spike
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const KEY = process.env.YOUCAM_API_KEY;
const BASE = process.env.YOUCAM_BASE_URL ?? 'https://yce-api-01.makeupar.com';
if (!KEY) throw new Error('YOUCAM_API_KEY missing from .env.local');

const SD = [
  'wrinkle', 'droopy_upper_eyelid', 'droopy_lower_eyelid', 'firmness', 'acne', 'moisture',
  'eye_bag', 'dark_circle_v2', 'age_spot', 'radiance', 'redness', 'oiliness', 'pore',
  'texture', 'tear_trough', 'skin_type',
];
const FIX = 'fixtures/youcam';
const MASKS = 'public/fixtures/masks';
mkdirSync(FIX, { recursive: true });
mkdirSync(MASKS, { recursive: true });

const auth = { Authorization: `Bearer ${KEY}` };
const save = (name: string, data: unknown) => writeFileSync(`${FIX}/${name}.json`, JSON.stringify(data, null, 2));
const log = (...a: unknown[]) => console.log(new Date().toISOString().slice(11, 19), ...a);

async function api(method: string, path: string, body?: unknown) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { ...auth, ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  log(method, path, res.status, JSON.stringify(json).slice(0, 300));
  return json as any;
}

async function upload(bytes: Uint8Array, contentType: string, fileName: string) {
  const init = await api('POST', '/s2s/v2.0/file', {
    files: [{ content_type: contentType, file_name: fileName, file_size: bytes.length }],
  });
  const file = init.data.files[0];
  const req = file.requests[0];
  const put = await fetch(req.url, { method: req.method, headers: req.headers, body: bytes as BodyInit });
  log('PUT presigned', put.status);
  return { init, fileId: file.file_id as string };
}

async function poll(kind: string, taskId: string, onFirstRunning?: (r: unknown) => void) {
  const t0 = Date.now();
  for (;;) {
    const r = await api('GET', `/s2s/v2.0/task/${kind}/${encodeURIComponent(taskId)}`);
    const status = r?.data?.task_status;
    if (status === 'running') onFirstRunning?.(r), (onFirstRunning = undefined);
    if (status === 'success' || status === 'error' || !status) {
      log(`${kind} finished: ${status} in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
      return r;
    }
    if (Date.now() - t0 > 120_000) throw new Error(`${kind} poll timeout`);
    await new Promise(r => setTimeout(r, 2000));
  }
}

/** Solid grey PNG, used to provoke an engine error (no units charged on error). */
function greyPng(w: number, h: number): Uint8Array {
  const crcTable = Array.from({ length: 256 }, (_, n) => {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
  });
  const crc = (buf: Buffer) => {
    let c = 0xffffffff;
    for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };
  const chunk = (type: string, data: Buffer) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type), data]);
    const c = Buffer.alloc(4);
    c.writeUInt32BE(crc(td));
    return Buffer.concat([len, td, c]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 0; // greyscale
  const raw = Buffer.alloc((w + 1) * h, 0x80);
  for (let y = 0; y < h; y++) raw[y * (w + 1)] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

async function analyze(fileId: string, label: string, actions = SD) {
  const create = await api('POST', '/s2s/v2.0/task/skin-analysis', {
    src_file_id: fileId,
    dst_actions: actions,
    miniserver_args: { enable_mask_overlay: false },
    format: 'json',
  });
  if (label === 'skin-analysis') save('skin-analysis-create', create);
  return poll('skin-analysis', create.data.task_id, r => label === 'skin-analysis' && save('skin-analysis-running', r));
}

// Run 1 used spike-selfie.jpg (rejected: face too small) and recorded the error fixtures.
// Run 2 uses selfie 2 as primary and a re-framed crop of it for the noise check.
const PRIMARY = process.env.SPIKE_A ?? '.local/spike-selfie-2.jpg';
const SECONDARY = process.env.SPIKE_B ?? '.local/spike-selfie-2-crop.jpg';
const SKIP_ERROR = process.env.SPIKE_SKIP_ERROR === '1';

async function goalAnalysis(bytes: Uint8Array) {
  const up = await upload(bytes, 'image/jpeg', 'goal.jpg');
  const goal = await analyze(up.fileId, 'goal', ['oiliness', 'pore']);
  for (const o of goal.data?.results?.output ?? []) o.mask_urls = [];
  save('skin-analysis-goal-success', goal);
}

async function main() {
  if (process.env.SPIKE_GOAL_ONLY === '1') return goalAnalysis(readFileSync('.local/sim-result.jpg'));

  // 1. Primary selfie, all 16 SD concerns
  const s1 = readFileSync(PRIMARY);
  const { init, fileId } = await upload(s1, 'image/jpeg', 'spike-selfie.jpg');
  init.data.files[0].requests[0].url = 'https://example.invalid/presigned-upload';
  save('file-init', init);
  const sa1 = await analyze(fileId, 'skin-analysis');

  // 2. Masks → public/fixtures/masks, fixture URLs rewritten to local paths
  const hosts = new Set<string>();
  for (const o of sa1.data?.results?.output ?? []) {
    const urls: string[] = o.mask_urls ?? [];
    o.mask_urls = [];
    for (const [i, u] of urls.entries()) {
      hosts.add(new URL(u).hostname);
      const res = await fetch(u);
      const ext = (res.headers.get('content-type') ?? '').includes('png') ? 'png' : 'jpg';
      const name = `${o.type}${urls.length > 1 ? `-${i}` : ''}.${ext}`;
      writeFileSync(`${MASKS}/${name}`, Buffer.from(await res.arrayBuffer()));
      o.mask_urls.push(`/fixtures/masks/${name}`);
    }
  }
  save('skin-analysis-success', sa1);
  log('mask hosts:', [...hosts]);

  // 3. Secondary capture for scan-to-scan noise
  const s2 = await upload(readFileSync(SECONDARY), 'image/jpeg', 'spike-selfie-2.jpg');
  const sa2 = await analyze(s2.fileId, 'second');
  for (const o of sa2.data?.results?.output ?? []) o.mask_urls = [];
  save('skin-analysis-success-2', sa2);

  // 4. Skin Simulation on selfie 1 (re-using its file id)
  const simCreate = await api('POST', '/s2s/v2.0/task/skin-simulation', { src_file_id: fileId, oiliness: 0.4, pores: 0.4 });
  save('skin-simulation-create', simCreate);
  const sim = await poll('skin-simulation', simCreate.data.task_id);
  const simUrl: string | undefined = sim.data?.results?.url;
  if (simUrl) {
    hosts.add(new URL(simUrl).hostname);
    writeFileSync('.local/sim-result.jpg', Buffer.from(await (await fetch(simUrl)).arrayBuffer()));
    sim.data.results.url = '/fixtures/sim-result.jpg';
  }
  save('skin-simulation-success', sim);

  // 5. Goal analysis of the simulated image. Passing the result URL as src_file_url
  //    failed with error_download_image, so download it and upload it again.
  if (simUrl) await goalAnalysis(readFileSync('.local/sim-result.jpg'));

  // 6. Error fixture from a 300×300 grey image
  if (!SKIP_ERROR) {
    const bad = await upload(greyPng(300, 300), 'image/png', 'grey.png');
    save('skin-analysis-error', await analyze(bad.fileId, 'error'));
  }

  // Noise summary
  const raw = (r: any) => Object.fromEntries((r.data?.results?.output ?? []).map((o: any) => [o.type, o.raw_score]));
  const a = raw(sa1);
  const b = raw(sa2);
  log('raw diffs selfie1 vs selfie2:');
  for (const k of Object.keys(a)) console.log(`  ${k.padEnd(22)} ${a[k]} vs ${b[k]}  Δ=${typeof a[k] === 'number' ? (b[k] - a[k]).toFixed(2) : 'n/a'}`);
  log('all result hosts:', [...hosts]);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
