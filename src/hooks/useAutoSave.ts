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

    // Check if resume has changed
    if (currentResume !== previousResumeRef.current) {
      previousResumeRef.current = currentResume;

      // Show brief "saving" indicator for UX feedback
      setIsSaving(true);
      const timeout = setTimeout(() => {
        setIsSaving(false);
        setLastSaved(new Date());
      }, 300);

      return () => clearTimeout(timeout);
    }
  }, [resume]);

  return { isSaving, lastSaved };
};
