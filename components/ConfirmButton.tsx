'use client';

import { useState } from 'react';
import { Button } from './ui';

/**
 * A destructive action that asks inside the page before running. Browser dialogs
 * (window.confirm) are blocked in some in-app browsers and return false at once,
 * which made the action silently do nothing.
 */
export function ConfirmButton({
  label,
  question,
  confirmLabel,
  onConfirm,
  className = '',
}: {
  label: string;
  question: string;
  confirmLabel: string;
  onConfirm: () => void | Promise<void>;
  className?: string;
}) {
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!asking) {
    return (
      <Button variant="ghost" className={`w-full ${className}`} onClick={() => setAsking(true)}>
        {label}
      </Button>
    );
  }

  return (
    <div role="alertdialog" aria-label={label} className="rounded-2xl bg-rose-50 p-4 ring-1 ring-rose-200">
      <p className="text-sm text-rose-900">{question}</p>
      <div className="mt-3 flex gap-2">
        <Button variant="secondary" className="flex-1" onClick={() => setAsking(false)} disabled={busy}>
          Cancel
        </Button>
        <Button
          className="flex-1 bg-rose-700 hover:bg-rose-800 active:bg-rose-800"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await onConfirm();
            } finally {
              setBusy(false);
            }
          }}
        >
          {confirmLabel}
        </Button>
      </div>
    </div>
  );
}
