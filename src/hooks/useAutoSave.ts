'use client';

import { useEffect, useRef, useState } from 'react';
import { Resume } from '@/types/resume';

interface UseAutoSaveReturn {
  isSaving: boolean;
  lastSaved: Date | null;
}

// Simplified hook - no actual persistence, just tracks modification state
export const useAutoSave = (resume: Resume): UseAutoSaveReturn => {
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const previousResumeRef = useRef<string>('');

  useEffect(() => {
    const currentResume = JSON.stringify(resume);

    if (currentResume === previousResumeRef.current) return;

    previousResumeRef.current = currentResume;

    const startTimeout = window.setTimeout(() => {
      setIsSaving(true);
    }, 0);
    const doneTimeout = window.setTimeout(() => {
      setIsSaving(false);
      setLastSaved(new Date());
    }, 300);

    return () => {
      window.clearTimeout(startTimeout);
      window.clearTimeout(doneTimeout);
    };
  }, [resume]);

  return { isSaving, lastSaved };
};
