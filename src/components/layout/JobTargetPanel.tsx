'use client';

import { useMemo, useState } from 'react';
import { Save } from 'lucide-react';
import type { Resume } from '@/types/resume';
import { analyzeJdGap } from '@/lib/jobTarget';
import { MAX_SAVED_RESUMES } from '@/lib/savedResumes';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface JobTargetPanelProps {
  resume: Resume;
  templateId: string;
  onUpdateJobTarget: (jobTarget: Resume['jobTarget']) => void;
}

export const JobTargetPanel = ({
  resume,
  templateId,
  onUpdateJobTarget,
}: JobTargetPanelProps) => {
  const jobTarget = resume.jobTarget ?? { company: '', role: '', jdText: '' };
  const [saveMessage, setSaveMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const gap = useMemo(
    () => analyzeJdGap(resume, jobTarget.jdText),
    [resume, jobTarget.jdText]
  );

  const handleFieldChange = (field: 'company' | 'role' | 'jdText', value: string) => {
    onUpdateJobTarget({
      ...jobTarget,
      [field]: value,
    });
  };

  const handleDuplicateForJd = async () => {
    setSaveMessage('');
    setIsSaving(true);
    try {
      const company = jobTarget.company.trim() || 'Target';
      const role = jobTarget.role.trim() || 'Intern';
      const response = await fetch('/api/resumes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `${role} @ ${company}`.slice(0, 80),
          templateId,
          data: {
            ...resume,
            id: crypto.randomUUID(),
            jobTarget,
            lastModified: new Date().toISOString(),
          },
        }),
      });

      if (response.status === 401) {
        setSaveMessage('Sign in to save a tailored copy.');
        return;
      }

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        setSaveMessage(
          typeof payload.error === 'string'
            ? payload.error
            : `Could not save tailored copy. At ${MAX_SAVED_RESUMES} saves, delete an old one first.`
        );
        return;
      }

      setSaveMessage('Tailored copy saved. Open Saved Resumes to load it.');
    } catch {
      setSaveMessage('Could not save tailored copy.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section
      className="mb-6 rounded-lg border bg-card p-4 text-card-foreground shadow-sm"
      aria-label="Target job"
    >
      <h3 className="text-sm font-semibold">Target job</h3>
      <p className="mt-1 text-xs text-muted-foreground">
        Paste a JD for literal keyword gaps. Duplicate saves a cloud copy with this target.
      </p>

      <div className="mt-3 grid grid-cols-1 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="job-company">Company</Label>
          <Input
            id="job-company"
            value={jobTarget.company}
            onChange={(e) => handleFieldChange('company', e.target.value)}
            placeholder="Acme"
            tabIndex={0}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="job-role">Role</Label>
          <Input
            id="job-role"
            value={jobTarget.role}
            onChange={(e) => handleFieldChange('role', e.target.value)}
            placeholder="Software Engineering Intern"
            tabIndex={0}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="job-jd">Job description</Label>
          <Textarea
            id="job-jd"
            value={jobTarget.jdText}
            onChange={(e) => handleFieldChange('jdText', e.target.value)}
            placeholder="Paste the internship JD…"
            rows={5}
            tabIndex={0}
          />
        </div>
      </div>

      {jobTarget.jdText.trim() && (
        <div className="mt-3 space-y-2 text-xs">
          <p>
            Coverage: {gap.coverageBySection.bullets} in bullets,{' '}
            {gap.coverageBySection.skillsOnly} skills-only, {gap.coverageBySection.missing}{' '}
            missing.
          </p>
          {gap.misses.length > 0 && (
            <div>
              <p className="font-medium">Literal misses</p>
              <div className="mt-1 flex flex-wrap gap-1">
                {gap.misses.slice(0, 20).map((token) => (
                  <span
                    key={token}
                    className="rounded border px-1.5 py-0.5 text-[11px]"
                  >
                    {token}
                  </span>
                ))}
              </div>
            </div>
          )}
          {gap.hits.length > 0 && (
            <div>
              <p className="font-medium">Present keywords</p>
              <div className="mt-1 flex flex-wrap gap-1">
                {gap.hits.slice(0, 16).map((hit) => (
                  <span
                    key={hit.token}
                    className="rounded border px-1.5 py-0.5 text-[11px]"
                  >
                    {hit.token}
                    {hit.inBullets ? '' : hit.inSkills ? ' (skills)' : ''}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          onClick={handleDuplicateForJd}
          disabled={isSaving || !jobTarget.jdText.trim()}
          aria-label="Duplicate resume for this job description"
          tabIndex={0}
        >
          <Save className="h-3.5 w-3.5" aria-hidden="true" />
          {isSaving ? 'Saving…' : 'Duplicate for JD'}
        </Button>
      </div>

      {saveMessage && <p className="mt-2 text-xs text-muted-foreground">{saveMessage}</p>}

    </section>
  );
};
