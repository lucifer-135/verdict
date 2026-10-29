import { Eye, EyeSlash } from '@phosphor-icons/react/dist/ssr';
import { getConcern, type ConcernId } from '@/lib/verdict/concerns';
import type { ConcernScore } from '@/lib/verdict/types';

/** Bar tone by YouCam ui_score (higher = healthier). */
const tone = (ui: number) => (ui >= 80 ? 'bg-emerald-600' : ui >= 65 ? 'bg-amber-500' : 'bg-rose-600');

export function ScoreList({
  scores,
  withMask,
  selected,
  onSelect,
}: {
  scores: Partial<Record<ConcernId, ConcernScore>>;
  withMask?: Set<ConcernId>;
  selected?: ConcernId | null;
  onSelect?: (c: ConcernId) => void;
}) {
  const rows = (Object.entries(scores) as [ConcernId, ConcernScore][]).sort((a, b) => a[1].ui - b[1].ui);
  return (
    <ul className="divide-y divide-line">
      {rows.map(([concern, s]) => {
        const body = (
          <>
            <span className="w-28 shrink-0 text-left text-sm font-medium">{getConcern(concern).label}</span>
            <span className="h-2 flex-1 overflow-hidden rounded-full bg-muted" aria-hidden>
              <span className={`block h-full rounded-full ${tone(s.ui)}`} style={{ width: `${s.ui}%` }} />
            </span>
            <span className="w-8 text-right text-sm font-semibold tabular-nums">{s.ui}</span>
          </>
        );
        const clickable = onSelect && withMask?.has(concern);
        return (
          <li key={concern}>
            {clickable ? (
              <button
                type="button"
                aria-pressed={selected === concern}
                onClick={() => onSelect(concern)}
                className={`flex min-h-12 w-full cursor-pointer items-center gap-3 rounded-lg px-2 transition-colors duration-150 ${
                  selected === concern ? 'bg-primary-soft' : 'hover:bg-muted'
                }`}
              >
                {body}
                {selected === concern ? (
                  <EyeSlash aria-hidden data-icon="eye-slash" size={16} className="text-primary" />
                ) : (
                  <Eye aria-hidden data-icon="eye" size={16} className="text-ink-muted" />
                )}
                <span className="sr-only">{selected === concern ? 'Hide map' : 'Show map'}</span>
              </button>
            ) : (
              <div className="flex min-h-12 items-center gap-3 px-2">
                {body}
                {withMask && <span className="w-4" />}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
