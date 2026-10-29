'use client';

import { useState } from 'react';
import { ShareNetwork } from '@phosphor-icons/react';
import { drawVerdictCard, shareCardContent } from '@/lib/share/verdictCard';
import type { Trial, VerdictResult } from '@/lib/verdict/types';
import { Button } from './ui';

const fileName = (product: string) =>
  `verdict-${product.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'trial'}.png`;

/** Share the verdict as an image: the phone's share sheet when it accepts files, otherwise a download. */
export function ShareButton({ trial, verdict }: { trial: Trial; verdict: VerdictResult }) {
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  async function share() {
    setBusy(true);
    setFailed(false);
    try {
      const content = shareCardContent(trial, verdict, window.location.host);
      const file = new File([await drawVerdictCard(content)], fileName(trial.productName), { type: 'image/png' });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: `Verdict: ${trial.productName}`, text: verdict.reason });
      } else {
        const url = URL.createObjectURL(file);
        const a = document.createElement('a');
        a.href = url;
        a.download = file.name;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (e) {
      // Closing the share sheet is a normal choice, not a failure.
      if (!(e instanceof DOMException && e.name === 'AbortError')) setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button variant="secondary" className="mt-3 w-full" onClick={share} disabled={busy}>
        <ShareNetwork aria-hidden size={20} weight="bold" />
        {busy ? 'Preparing image…' : 'Share verdict'}
      </Button>
      {failed && (
        <p role="alert" className="mt-2 text-center text-sm text-rose-700">
          The image could not be shared. Please try again.
        </p>
      )}
    </>
  );
}
