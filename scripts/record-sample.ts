/**
 * Records the bundled sample journey (plan Task 11) from real API responses on
 * consented, dated selfies of one person using one product.
 *
 *   npm run record-sample -- --product "Niacinamide serum" --concerns oiliness,pore --start 2026-08-01 --consent
 *
 * Photos: .local/sample/*.{jpg,jpeg,png}, dated by a YYYY-MM-DD in the file name or EXIF DateTimeOriginal.
 * Cost: 16 units per photo, plus 13 for the goal. Writes lib/sample/journey.json and public/sample/.
 * The photos become public in the repo, hence --consent.
 */
import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import exifr from 'exifr';
import sharp from 'sharp';
import type { SampleJourney } from '@/lib/sample/load';
import { GOAL_INTENSITY } from '@/lib/scan/runGoal';
import { SD_ACTIONS, getConcern, isConcernId, type ConcernId } from '@/lib/verdict/concerns';
import { createYouCamClient } from '@/lib/youcam/client';
import type { TaskState } from '@/lib/youcam/normalize';

const SRC = '.local/sample';
const OUT = 'public/sample';
const PUBLIC_LONG_SIDE = 1080;

const { values } = parseArgs({
  options: {
    product: { type: 'string' },
    concerns: { type: 'string' },
    start: { type: 'string' },
    consent: { type: 'boolean', default: false },
  },
});

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

if (!values.consent) fail('Refusing to run without --consent: these photos will be published in the repo.');
if (!values.product || !values.concerns || !values.start || !/^\d{4}-\d{2}-\d{2}$/.test(values.start)) {
  fail('Usage: npm run record-sample -- --product "<name>" --concerns oiliness,pore --start YYYY-MM-DD --consent');
}
const concerns = values.concerns.split(',').map(s => s.trim());
if (!concerns.every(c => isConcernId(c) && getConcern(c).targetable) || concerns.length > 3) {
  fail(`--concerns must be 1–3 of: ${SD_ACTIONS.filter(c => getConcern(c).targetable).join(', ')}`);
}
const targets = concerns as ConcernId[];
if (!process.env.YOUCAM_API_KEY) fail('YOUCAM_API_KEY missing from .env.local');

const client = createYouCamClient({
  apiKey: process.env.YOUCAM_API_KEY,
  baseUrl: process.env.YOUCAM_BASE_URL || 'https://yce-api-01.makeupar.com',
});

async function waitFor<T>(get: (id: string) => Promise<TaskState<T>>, taskId: string, label: string): Promise<T> {
  const deadline = Date.now() + 120_000;
  for (;;) {
    const state = await get(taskId);
    if (state.status === 'success') return state.result;
    if (state.status === 'error') fail(`${label}: ${state.code} ${state.message}`);
    if (Date.now() > deadline) fail(`${label}: timed out`);
    await new Promise(r => setTimeout(r, 2000));
  }
}

async function takenAt(file: string, bytes: Buffer): Promise<string> {
  const m = file.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12).toISOString();
  const exif = await exifr.parse(bytes, ['DateTimeOriginal']).catch(() => null);
  if (exif?.DateTimeOriginal instanceof Date) return exif.DateTimeOriginal.toISOString();
  return fail(`${file}: no date in file name or EXIF`);
}

const forUpload = (bytes: Buffer) =>
  sharp(bytes).rotate().resize(2560, 2560, { fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 90 }).toBuffer();
const savePublic = (bytes: Buffer, path: string) =>
  sharp(bytes)
    .rotate()
    .resize(PUBLIC_LONG_SIDE, PUBLIC_LONG_SIDE, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 82 })
    .toFile(join(OUT, path))
    .then(() => `/sample/${path}`);

async function main() {
  const files = readdirSync(SRC).filter(f => /\.(jpe?g|png)$/i.test(f));
  if (files.length < 2) fail(`Put at least 2 dated selfies in ${SRC}`);
  const photos = await Promise.all(
    files.map(async f => {
      const bytes = readFileSync(join(SRC, f));
      return { file: f, bytes, takenAt: await takenAt(f, bytes) };
    }),
  );
  photos.sort((a, b) => a.takenAt.localeCompare(b.takenAt));
  console.log(`Scanning ${photos.length} photos (${photos.length * 16} units) + goal (13 units)`);

  rmSync(OUT, { recursive: true, force: true });
  mkdirSync(join(OUT, 'photos'), { recursive: true });
  mkdirSync(join(OUT, 'masks'), { recursive: true });

  const scans: SampleJourney['scans'] = [];
  let firstUpload: Buffer | null = null;
  for (const [i, p] of photos.entries()) {
    const upload = await forUpload(p.bytes);
    firstUpload ??= upload;
    const { taskId } = await client.createSkinAnalysis({ bytes: upload }, SD_ACTIONS);
    const result = await waitFor(id => client.getSkinAnalysis(id), taskId, p.file);
    const masks: SampleJourney['scans'][number]['masks'] = {};
    for (const c of targets) {
      const url = result.maskUrls[c];
      if (!url) continue;
      const mask = Buffer.from(await (await fetch(url)).arrayBuffer());
      masks[c] = await savePublic(mask, `masks/${i + 1}-${c}.jpg`);
    }
    scans.push({
      takenAt: p.takenAt,
      photo: await savePublic(p.bytes, `photos/${i + 1}.jpg`),
      overall: result.overall,
      skinAge: result.skinAge,
      skinType: result.skinType,
      scores: result.scores,
      masks,
    });
    console.log(`  ${p.file} → ${targets.map(c => `${c} ${result.scores[c]?.raw.toFixed(1)}`).join(', ')}`);
  }

  let goal: SampleJourney['goal'] = null;
  const simulable = targets.filter(c => getConcern(c).simulable);
  if (simulable.length && firstUpload) {
    const sim = await client.createSkinSimulation(
      { bytes: firstUpload },
      simulable.map(concern => ({ concern, intensity: GOAL_INTENSITY })),
    );
    const { imageUrl } = await waitFor(id => client.getSkinSimulation(id), sim.taskId, 'goal simulation');
    const simBytes = Buffer.from(await (await fetch(imageUrl)).arrayBuffer());
    const analysis = await client.createSkinAnalysis({ bytes: simBytes }, simulable);
    const result = await waitFor(id => client.getSkinAnalysis(id), analysis.taskId, 'goal analysis');
    const scores: Partial<Record<ConcernId, number>> = {};
    for (const c of simulable) if (result.scores[c]) scores[c] = result.scores[c]!.raw;
    goal = { image: await savePublic(simBytes, 'goal.jpg'), scores };
  }

  const journey: SampleJourney = {
    trial: { productName: values.product!, concerns: targets, startDate: values.start! },
    goal,
    scans,
  };
  writeFileSync('lib/sample/journey.json', `${JSON.stringify(journey, null, 2)}\n`);
  console.log(`Wrote lib/sample/journey.json and ${OUT}/`);
}

main().catch(e => fail(String(e)));
