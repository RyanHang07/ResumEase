'use client';

import { useMemo, useState } from 'react';
import { Copy, Save } from 'lucide-react';
import type { Resume } from '@/types/resume';
import { analyzeJdGap } from '@/lib/jobTarget';
import { buildCoverLetterMarkdown } from '@/lib/coverLetter';
import { getEntryPrimaryText } from '@/lib/resumeDisplay';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface JobTargetPanelProps {
  resume: Resume;
  templateId: string;
  onUpdateJobTarget: (jobTarget: Resume['jobTarget']) => void;
  onUpdateCoverLetter: (coverLetter: string | undefined) => void;
}

export const JobTargetPanel = ({
  resume,
  templateId,
  onUpdateJobTarget,
  onUpdateCoverLetter,
}: JobTargetPanelProps) => {
  const jobTarget = resume.jobTarget ?? { company: '', role: '', jdText: '' };
  const [selectedEntryIds, setSelectedEntryIds] = useState<string[]>([]);
  const [selectedKeywords, setSelectedKeywords] = useState<string[]>([]);
  const [referrer, setReferrer] = useState('');
  const [warnings, setWarnings] = useState<string[]>([]);
  const [saveMessage, setSaveMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const gap = useMemo(
    () => analyzeJdGap(resume, jobTarget.jdText),
    [resume, jobTarget.jdText]
  );

  const selectableEntries = useMemo(() => {
    const items: Array<{ id: string; label: string }> = [];
    for (const section of resume.sections) {
      if (section.type !== 'standard') continue;
      for (const entry of section.entries) {
        const label = getEntryPrimaryText(entry, section.sectionName);
        if (!label) continue;
        items.push({ id: entry.id, label: `${section.sectionName}: ${label}` });
      }
    }
    return items.slice(0, 12);
  }, [resume.sections]);

  const handleFieldChange = (field: 'company' | 'role' | 'jdText', value: string) => {
    onUpdateJobTarget({
      ...jobTarget,
      [field]: value,
    });
  };

  const handleToggleEntry = (entryId: string) => {
    setSelectedEntryIds((current) => {
      if (current.includes(entryId)) {
        return current.filter((id) => id !== entryId);
      }
      if (current.length >= 3) return current;
      return [...current, entryId];
    });
  };

  const handleToggleKeyword = (token: string) => {
    setSelectedKeywords((current) =>
      current.includes(token)
        ? current.filter((item) => item !== token)
        : [...current, token].slice(0, 6)
    );
  };

  const handleGenerateLetter = () => {
    const result = buildCoverLetterMarkdown(resume, {
      entryIds: selectedEntryIds,
      keywords: selectedKeywords,
      referrer,
    });
    onUpdateCoverLetter(result.markdown);
    setWarnings(result.warnings);
  };

  const handleCopyLetter = async () => {
    if (!resume.coverLetter?.trim()) return;
    await navigator.clipboard.writeText(resume.coverLetter);
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
        setSaveMessage('Sign in to save a tailored copy (max 5 saves).');
        return;
      }

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        setSaveMessage(
          typeof payload.error === 'string'
            ? payload.error
            : 'Could not save tailored copy. At 5 saves, replace an old one first.'
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
      aria-label="Target job and cover letter"
    >
      <h3 className="text-sm font-semibold">Target job</h3>
      <p className="mt-1 text-xs text-muted-foreground">
        Paste a JD for literal keyword gaps. Duplicate saves a cloud copy with this target (max 5).
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
                  <button
                    key={token}
                    type="button"
                    className="rounded border px-1.5 py-0.5 text-[11px] hover:bg-muted"
                    onClick={() => handleToggleKeyword(token)}
                    aria-pressed={selectedKeywords.includes(token)}
                    tabIndex={0}
                  >
                    {token}
                    {selectedKeywords.includes(token) ? ' ✓' : ''}
                  </button>
                ))}
              </div>
            </div>
          )}
          {gap.hits.length > 0 && (
            <div>
              <p className="font-medium">Present keywords (click to echo)</p>
              <div className="mt-1 flex flex-wrap gap-1">
                {gap.hits.slice(0, 16).map((hit) => (
                  <button
                    key={hit.token}
                    type="button"
                    className="rounded border px-1.5 py-0.5 text-[11px] hover:bg-muted"
                    onClick={() => handleToggleKeyword(hit.token)}
                    aria-pressed={selectedKeywords.includes(hit.token)}
                    tabIndex={0}
                  >
                    {hit.token}
                    {hit.inBullets ? '' : hit.inSkills ? ' (skills)' : ''}
                    {selectedKeywords.includes(hit.token) ? ' ✓' : ''}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="mt-4 space-y-2">
        <p className="text-xs font-medium">Cover letter evidence (pick up to 3)</p>
        <ul className="max-h-28 space-y-1 overflow-y-auto text-xs">
          {selectableEntries.map((item) => (
            <li key={item.id}>
              <label className="flex cursor-pointer items-start gap-2">
                <input
                  type="checkbox"
                  className="mt-0.5"
                  checked={selectedEntryIds.includes(item.id)}
                  onChange={() => handleToggleEntry(item.id)}
                  aria-label={`Include ${item.label}`}
                />
                <span>{item.label}</span>
              </label>
            </li>
          ))}
        </ul>
        <div className="space-y-1.5">
          <Label htmlFor="referrer">Referrer (optional)</Label>
          <Input
            id="referrer"
            value={referrer}
            onChange={(e) => setReferrer(e.target.value)}
            placeholder="Alex at Acme"
            tabIndex={0}
          />
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={handleGenerateLetter}
          aria-label="Generate cover letter from selected slots"
          tabIndex={0}
        >
          Generate letter
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={handleCopyLetter}
          disabled={!resume.coverLetter?.trim()}
          aria-label="Copy cover letter markdown"
          tabIndex={0}
        >
          <Copy className="h-3.5 w-3.5" aria-hidden="true" />
          Copy
        </Button>
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

      {warnings.length > 0 && (
        <ul className="mt-2 space-y-1 text-xs text-amber-700">
          {warnings.map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
        </ul>
      )}
      {saveMessage && <p className="mt-2 text-xs text-muted-foreground">{saveMessage}</p>}

      {resume.coverLetter?.trim() && (
        <pre className="mt-3 max-h-40 overflow-auto whitespace-pre-wrap rounded border bg-muted/40 p-2 text-[11px]">
          {resume.coverLetter}
        </pre>
      )}
    </section>
  );
};
