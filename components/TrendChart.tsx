'use client';

import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { ChartData } from '@/lib/trials/chartData';

const INK_MUTED = 'var(--color-ink-muted)';

/** Raw score over days since start, with the noise band around baseline and the goal line. */
export function TrendChart({ data, label }: { data: ChartData; label: string }) {
  const { points, band, goal } = data;
  if (points.length === 0) {
    return <p className="rounded-xl bg-muted px-4 py-8 text-center text-sm text-ink-muted">No scans yet for {label.toLowerCase()}.</p>;
  }

  const values = [...points.map(p => p.raw), ...(band ?? []), ...(goal !== null ? [goal] : [])];
  const yMin = Math.max(0, Math.floor(Math.min(...values) - 4));
  const yMax = Math.min(100, Math.ceil(Math.max(...values) + 4));
  const xMin = Math.min(0, points[0].day);
  const xMax = Math.max(14, points[points.length - 1].day);
  const first = points[0];
  const last = points[points.length - 1];
  const summary =
    `${label} raw score: ${first.raw.toFixed(1)} on day ${first.day}` +
    (points.length > 1 ? `, ${last.raw.toFixed(1)} on day ${last.day}` : '') +
    (goal !== null ? `. Realistic goal ${goal.toFixed(1)}.` : '.');

  return (
    <figure>
      <div className="h-56" role="img" aria-label={summary}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={points} margin={{ top: 12, right: 12, bottom: 0, left: -18 }}>
            <CartesianGrid stroke="var(--color-line)" vertical={false} />
            {band && <ReferenceArea y1={band[0]} y2={band[1]} fill="var(--color-primary)" fillOpacity={0.08} ifOverflow="extendDomain" />}
            {goal !== null && (
              <ReferenceLine
                y={goal}
                stroke="var(--color-accent)"
                strokeWidth={2}
                strokeDasharray="6 4"
                label={{ value: 'Goal', position: 'insideTopRight', fill: '#7a3f2c', fontSize: 11, fontWeight: 600 }}
              />
            )}
            <XAxis
              dataKey="day"
              type="number"
              domain={[xMin, xMax]}
              tickFormatter={d => `D${d}`}
              tick={{ fill: INK_MUTED, fontSize: 12 }}
              axisLine={{ stroke: 'var(--color-line)' }}
              tickLine={false}
            />
            <YAxis domain={[yMin, yMax]} tick={{ fill: INK_MUTED, fontSize: 12 }} axisLine={false} tickLine={false} width={44} />
            <Tooltip
              formatter={v => [Number(v).toFixed(1), 'Raw score']}
              labelFormatter={d => `Day ${d}`}
              contentStyle={{ borderRadius: 12, border: '1px solid var(--color-line)', fontSize: 13 }}
            />
            <Line
              dataKey="raw"
              stroke="var(--color-primary)"
              strokeWidth={2.5}
              dot={{ r: 4, fill: 'var(--color-primary)', strokeWidth: 0 }}
              activeDot={{ r: 6 }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <figcaption className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-ink-muted">
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden className="h-0.5 w-4 rounded bg-primary" /> Your raw score (higher is healthier)
        </span>
        {band && (
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden className="h-3 w-4 rounded-sm bg-primary/10" /> Normal scan noise
          </span>
        )}
        {goal !== null && (
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden className="w-4 border-t-2 border-dashed border-accent" /> Realistic goal
          </span>
        )}
      </figcaption>
    </figure>
  );
}
