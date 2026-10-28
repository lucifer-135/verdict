import type { Metadata, Viewport } from 'next';
import Link from 'next/link';
import { Figtree, Newsreader } from 'next/font/google';
import { Scales } from '@phosphor-icons/react/dist/ssr';
import { StorageBanner } from '@/components/StorageBanner';
import './globals.css';

const figtree = Figtree({ variable: '--font-figtree', subsets: ['latin'], display: 'swap' });
const newsreader = Newsreader({ variable: '--font-newsreader', subsets: ['latin'], display: 'swap' });

export const metadata: Metadata = {
  title: 'Verdict — Is your skincare actually working?',
  description:
    'Track a skincare product with repeat YouCam Skin AI scans and get a noise-aware verdict: keep going, give it time, or stop.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#faf7f2',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${figtree.variable} ${newsreader.variable}`}>
      <body className="min-h-dvh antialiased">
        <StorageBanner />
        <div className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col px-4 pb-10">
          <nav className="flex h-14 items-center justify-between" aria-label="Main">
            <Link href="/" className="inline-flex min-h-11 items-center gap-2 rounded-lg font-serif text-xl font-semibold">
              <span className="grid size-8 place-items-center rounded-full bg-primary text-on-primary">
                <Scales aria-hidden size={18} weight="bold" />
              </span>
              Verdict
            </Link>
          </nav>
          <main id="main" className="flex-1">
            {children}
          </main>
          <footer className="pt-10 text-center text-xs text-ink-muted">Skin analysis by YouCam API</footer>
        </div>
      </body>
    </html>
  );
}
