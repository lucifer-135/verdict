'use client';

import { useEffect, useState } from 'react';
import { DownloadSimple } from '@phosphor-icons/react';
import { Button } from './ui';

/** Chrome and Edge fire this when the site can be installed; it is not in the standard DOM types yet. */
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/** "Install app" appears only when the browser offers installation (Android Chrome, desktop Chrome and Edge). */
export function InstallButton() {
  const [offer, setOffer] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const onOffer = (e: Event) => {
      e.preventDefault();
      setOffer(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => setOffer(null);
    window.addEventListener('beforeinstallprompt', onOffer);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onOffer);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  if (!offer) return null;
  return (
    <Button
      variant="secondary"
      className="w-full"
      onClick={async () => {
        await offer.prompt();
        await offer.userChoice;
        // The browser allows each offer to be used once.
        setOffer(null);
      }}
    >
      <DownloadSimple aria-hidden size={20} weight="bold" />
      Install app
    </Button>
  );
}
