'use client';

import { useMemo } from 'react';
import type { Resume } from '@/types/resume';
import { analyzeFit, type FitTier } from '@/lib/fitCheck';
import { cn } from '@/lib/utils';

const TIER_COPY: Record<FitTier, { label: string; className: string }> = {
  A: { label: 'A: no eligibility flags', className: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400' },
  B: { label: 'B: check before tailoring', className: 'bg-amber-500/15 text-amber-700 dark:text-amber-400' },
  C: { label: 'C: likely skip', className: 'bg-destructive/15 text-destructive' },
};

export const FitCheck = ({ resume, jdText }: { resume: Resume; jdText: string }) => {
  const fit = useMemo(() => analyzeFit(resume, jdText), [resume, jdText]);
  const { facts } = fit;
  const basis = [
    facts.graduated ? `graduated ${facts.graduated}` : facts.stillStudying ? 'still studying' : null,
    `about ${(facts.experienceMonths / 12).toFixed(1)} yrs experience`,
    facts.location || null,
  ].filter(Boolean);

  return (
    <div className="mt-3 rounded-md border p-2 text-xs" aria-label="Fit check">
      <div className="flex items-center gap-2">
        <span className="font-medium">Fit</span>
        <span className={cn('rounded px-1.5 py-0.5 font-semibold', TIER_COPY[fit.tier].className)}>
          {TIER_COPY[fit.tier].label}
        </span>
      </div>
      {fit.flags.length > 0 && (
        <ul className="mt-2 space-y-1.5">
          {fit.flags.map((flag) => (
            <li key={flag.id}>
              <span className={cn('font-semibold', flag.severity === 'C' ? 'text-destructive' : 'text-amber-700 dark:text-amber-400')}>
                {flag.severity}
              </span>{' '}
              {flag.label}
              {flag.evidence && <p className="mt-0.5 text-muted-foreground italic">{flag.evidence}</p>}
            </li>
          ))}
        </ul>
      )}
      <p className="mt-2 text-muted-foreground">
        From your resume: {basis.join(', ')}. Pattern match only; read the posting to confirm.
      </p>
    </div>
  );
};
