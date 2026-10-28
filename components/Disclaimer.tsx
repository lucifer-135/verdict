import { Info } from '@phosphor-icons/react/dist/ssr';

export function Disclaimer() {
  return (
    <p className="mt-8 flex items-center justify-center gap-1.5 text-center text-xs text-ink-muted">
      <Info aria-hidden size={14} />
      Cosmetic insight, not medical advice.
    </p>
  );
}
