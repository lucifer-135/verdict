import Link from 'next/link';
import { ArrowLeft } from '@phosphor-icons/react/dist/ssr';
import type { ComponentProps, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost';

const BASE =
  'inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-xl px-5 text-base font-semibold transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-45';
const VARIANTS: Record<Variant, string> = {
  primary: 'bg-primary text-on-primary shadow-soft hover:bg-primary-hover active:bg-primary-hover',
  secondary: 'bg-surface text-ink ring-1 ring-inset ring-line hover:bg-muted active:bg-muted',
  ghost: 'text-primary hover:bg-primary-soft active:bg-primary-soft',
};

export const buttonClass = (variant: Variant = 'primary', extra = '') => `${BASE} ${VARIANTS[variant]} ${extra}`;

export function Button({ variant = 'primary', className = '', ...props }: ComponentProps<'button'> & { variant?: Variant }) {
  return <button className={buttonClass(variant, className)} {...props} />;
}

export function ButtonLink({
  variant = 'primary',
  className = '',
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant }) {
  return <Link className={buttonClass(variant, className)} {...props} />;
}

export function Card({ className = '', ...props }: ComponentProps<'div'>) {
  return <div className={`rounded-2xl bg-surface p-5 shadow-soft ring-1 ring-line/70 ${className}`} {...props} />;
}

export function PageHeader({
  title,
  eyebrow,
  subtitle,
  back,
}: {
  title: ReactNode;
  eyebrow?: string;
  subtitle?: ReactNode;
  back?: { href: string; label: string };
}) {
  return (
    <header className="mb-6">
      {back && (
        <Link
          href={back.href}
          className="-ml-2 mb-3 inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-sm font-medium text-ink-muted hover:text-ink"
        >
          <ArrowLeft aria-hidden size={16} weight="bold" />
          {back.label}
        </Link>
      )}
      {eyebrow && <p className="mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-primary">{eyebrow}</p>}
      <h1 className="font-serif text-[2rem] leading-tight font-semibold text-balance">{title}</h1>
      {subtitle && <p className="mt-2 text-base leading-relaxed text-ink-muted">{subtitle}</p>}
    </header>
  );
}

/** Thin progress bar with an accessible value. */
export function ProgressBar({ value, label, tone = 'bg-primary' }: { value: number; label: string; tone?: string }) {
  const pct = Math.round(Math.min(1, Math.max(0, value)) * 100);
  return (
    <div role="progressbar" aria-label={label} aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div className={`h-full rounded-full ${tone} transition-[width] duration-500`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
