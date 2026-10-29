import { costLine } from '@/lib/trials/cost';
import { getConcern } from '@/lib/verdict/concerns';
import type { Trial, VerdictKind, VerdictResult } from '@/lib/verdict/types';

const LABELS: Record<VerdictKind, string> = {
  too_early: 'Too early',
  working: 'Working',
  give_it_time: 'Give it time',
  not_moving: 'Not moving',
  pause: 'Pause',
};

/** Pill colours for the image (tint and text), matching the in-app verdict chips. */
const PILL: Record<VerdictKind, { bg: string; fg: string }> = {
  too_early: { bg: '#f1f5f9', fg: '#334155' },
  working: { bg: '#ecfdf5', fg: '#065f46' },
  give_it_time: { bg: '#fffbeb', fg: '#92400e' },
  not_moving: { bg: '#f4f4f5', fg: '#3f3f46' },
  pause: { bg: '#fff1f2', fg: '#9f1239' },
};

export interface ShareCardContent {
  product: string;
  concerns: string;
  verdictLabel: string;
  verdictKind: VerdictKind;
  reason: string;
  meta: string;
  goalPercent: number | null;
  costLine: string | null;
  sampleNote: string | null;
  footer: string;
}

/** Everything the shared image says. It never includes a face photo. */
export function shareCardContent(trial: Trial, verdict: VerdictResult, appHost: string): ShareCardContent {
  return {
    product: trial.productName,
    concerns: trial.concerns.map(c => getConcern(c).label).join(' · '),
    verdictLabel: LABELS[verdict.kind],
    verdictKind: verdict.kind,
    reason: verdict.reason,
    meta: `Day ${Math.max(0, verdict.daysIn)} · Confidence: ${verdict.confidence}`,
    goalPercent: verdict.goalProgress === null ? null : Math.round(verdict.goalProgress * 100),
    costLine: trial.cost ? costLine(verdict.kind, trial.cost) : null,
    sampleNote: trial.isSample ? 'Simulated sample. The photos behind it are AI-generated.' : null,
    footer: `Skin analysis by YouCam API · ${appHost}`,
  };
}

/** Greedy word wrap; the last allowed line ends with "…" when text is left over. */
export function wrapLines(text: string, maxWidth: number, measure: (s: string) => number, maxLines = Infinity): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (measure(next) <= maxWidth || !line) {
      line = next;
      continue;
    }
    lines.push(line);
    line = word;
    if (lines.length === maxLines) break;
  }
  if (line && lines.length < maxLines) lines.push(line);
  else if (line && lines.length === maxLines) lines[maxLines - 1] += '…';
  return lines;
}

const W = 1080;
const H = 1350;
const INK = '#1f1a17';
const MUTED = '#5f5650';
const PRIMARY = '#0f5e5a';

/** Font stacks from the page (next/font names its families), with safe fallbacks. */
function fontStack(variable: string, fallback: string): string {
  const fromPage = getComputedStyle(document.documentElement).getPropertyValue(variable).trim();
  return fromPage ? `${fromPage}, ${fallback}` : fallback;
}

/** Draw the share image as a PNG, 1080 px wide and as tall as its content. Browser only (uses canvas). */
export async function drawVerdictCard(c: ShareCardContent): Promise<Blob> {
  await document.fonts?.ready;
  const serif = fontStack('--font-newsreader', 'Georgia, serif');
  const sans = fontStack('--font-figtree', 'system-ui, sans-serif');
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const g = canvas.getContext('2d')!;
  const round = (x: number, y: number, w: number, h: number, r: number) => {
    g.beginPath();
    g.roundRect(x, y, w, h, r);
  };

  // Wordmark
  g.fillStyle = PRIMARY;
  g.beginPath();
  g.arc(110, 110, 34, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#ffffff';
  g.font = `600 34px ${serif}`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText('V', 110, 112);
  g.textAlign = 'left';
  g.fillStyle = INK;
  g.font = `600 48px ${serif}`;
  g.fillText('Verdict', 160, 112);

  // Content goes on its own layer first, so the card behind it can be sized to the content.
  const cx = 60;
  const cy = 190;
  const cw = W - 120;
  const left = cx + 70;
  const width = cw - 140;
  let y = cy + 80;
  g.textBaseline = 'alphabetic';

  if (c.sampleNote) {
    g.font = `600 26px ${sans}`;
    const label = 'Simulated sample';
    const pw = g.measureText(label).width + 40;
    g.fillStyle = '#f6e6df';
    round(left, y - 34, pw, 48, 24);
    g.fill();
    g.fillStyle = '#7a3f2c';
    g.fillText(label, left + 20, y);
    y += 70;
  }

  g.fillStyle = INK;
  g.font = `600 64px ${serif}`;
  for (const line of wrapLines(c.product, width, s => g.measureText(s).width, 2)) {
    g.fillText(line, left, y);
    y += 74;
  }
  g.fillStyle = MUTED;
  g.font = `400 32px ${sans}`;
  g.fillText(c.concerns, left, y);
  y += 80;

  // Verdict pill
  g.font = `700 40px ${sans}`;
  const pillW = g.measureText(c.verdictLabel).width + 64;
  g.fillStyle = PILL[c.verdictKind].bg;
  round(left, y - 50, pillW, 72, 36);
  g.fill();
  g.fillStyle = PILL[c.verdictKind].fg;
  g.fillText(c.verdictLabel, left + 32, y);
  g.fillStyle = MUTED;
  g.font = `400 28px ${sans}`;
  g.textAlign = 'right';
  g.fillText(c.meta, left + width, y - 4);
  g.textAlign = 'left';
  y += 90;

  g.fillStyle = INK;
  g.font = `400 46px ${serif}`;
  for (const line of wrapLines(c.reason, width, s => g.measureText(s).width, 5)) {
    g.fillText(line, left, y);
    y += 60;
  }

  if (c.goalPercent !== null) {
    y += 30;
    g.fillStyle = MUTED;
    g.font = `400 30px ${sans}`;
    g.fillText('Toward realistic goal', left, y);
    g.textAlign = 'right';
    g.fillStyle = INK;
    g.font = `700 30px ${sans}`;
    g.fillText(`${c.goalPercent}%`, left + width, y);
    g.textAlign = 'left';
    y += 26;
    g.fillStyle = '#f3eee7';
    round(left, y, width, 16, 8);
    g.fill();
    g.fillStyle = PILL[c.verdictKind].fg;
    round(left, y, Math.max(16, (width * Math.min(100, c.goalPercent)) / 100), 16, 8);
    g.fill();
    y += 40;
  }

  if (c.costLine) {
    y += 40;
    g.fillStyle = PRIMARY;
    g.font = `600 32px ${sans}`;
    for (const line of wrapLines(c.costLine, width, s => g.measureText(s).width, 2)) {
      g.fillText(line, left, y);
      y += 42;
    }
  }

  const cardH = y - cy + 30;

  // Footer under the card
  let fy = cy + cardH + 80;
  g.fillStyle = MUTED;
  g.font = `400 28px ${sans}`;
  g.textAlign = 'center';
  for (const line of [c.sampleNote, c.footer, 'Cosmetic insight, not medical advice.']) {
    if (!line) continue;
    g.fillText(line, W / 2, fy);
    fy += 42;
  }

  // Final image: page colour, then the card sized to the content, then the content layer on top.
  const out = document.createElement('canvas');
  out.width = W;
  out.height = Math.min(H, fy + 20);
  const o = out.getContext('2d')!;
  o.fillStyle = '#faf7f2';
  o.fillRect(0, 0, out.width, out.height);
  o.save();
  o.shadowColor = 'rgba(31, 26, 23, 0.10)';
  o.shadowBlur = 40;
  o.shadowOffsetY = 12;
  o.fillStyle = '#ffffff';
  o.beginPath();
  o.roundRect(cx, cy, cw, cardH, 44);
  o.fill();
  o.restore();
  o.fillStyle = PILL[c.verdictKind].fg;
  o.beginPath();
  o.roundRect(cx, cy, 14, cardH, 7);
  o.fill();
  o.drawImage(canvas, 0, 0);
  return new Promise((resolve, reject) => out.toBlob(b => (b ? resolve(b) : reject(new Error('canvas_failed'))), 'image/png'));
}
