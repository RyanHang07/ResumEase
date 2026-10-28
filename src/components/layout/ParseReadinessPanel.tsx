'use client';

import { useMemo, useState } from 'react';
import { AlertTriangle, ShieldCheck, Wrench } from 'lucide-react';
import { cn } from '@/lib/utils';
import { analyzeResumeForAts } from '@/lib/ats';
import {
  PARSER_PROFILES,
  analyzeParserProfile,
  type ParserProfileId,
} from '@/lib/parserProfiles';
import type { Resume } from '@/types/resume';
import type { PdfRoundTripResult } from '@/lib/pdfRoundTrip';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { JobTargetPanel } from '@/components/layout/JobTargetPanel';
import { isCompileTemplateId } from '@/lib/latex-generator';

interface ParseReadinessPanelProps {
  selectedTemplate: string;
  onSelectTemplate: (templateId: string) => void;
  resume: Resume;
  onApplyParserFixes: () => void;
  onUpdateJobTarget: (jobTarget: Resume['jobTarget']) => void;
  onApplyLinkVerification: (results: Array<{ url: string; ok: boolean }>) => void;
  pdfRoundTrip?: PdfRoundTripResult | null;
  isExtractingPdf?: boolean;
}

export const ParseReadinessPanel = ({
  selectedTemplate,
  onSelectTemplate,
  resume,
  onApplyParserFixes,
  onUpdateJobTarget,
  onApplyLinkVerification,
  pdfRoundTrip = null,
  isExtractingPdf = false,
}: ParseReadinessPanelProps) => {
  const analysis = useMemo(
    () => analyzeResumeForAts(resume, selectedTemplate, pdfRoundTrip),
    [resume, selectedTemplate, pdfRoundTrip]
  );
  const [parserProfileId, setParserProfileId] = useState<ParserProfileId>('workday');
  const [isVerifyingLinks, setIsVerifyingLinks] = useState(false);
  const [linkVerifyMessage, setLinkVerifyMessage] = useState('');
  const parserFindings = useMemo(
    () => analyzeParserProfile(resume, parserProfileId),
    [resume, parserProfileId]
  );
  const topFindings = analysis.findings.slice(0, 8);
  const mappedSections = analysis.autofillMap.filter(
    (mapping) => mapping.canonicalType !== 'custom'
  );
  const failedChecklist = analysis.checklist.filter((item) => !item.pass);
  const canApplyFixes =
    analysis.findings.some((finding) => finding.fixId) ||
    !isCompileTemplateId(selectedTemplate) ||
    resume.header.iconMode === 'icon';

  const handleApplyParserFixes = () => {
    onApplyParserFixes();
    if (!isCompileTemplateId(selectedTemplate)) {
      onSelectTemplate('classic');
    }
  };

  const projectUrls = useMemo(() => {
    const urls: string[] = [];
    for (const section of resume.sections) {
      if (section.type !== 'standard') continue;
      for (const entry of section.entries) {
        for (const link of entry.links ?? []) {
          const url = link.url.trim();
          if (url) urls.push(url);
        }
      }
    }
    return [...new Set(urls)].slice(0, 10);
  }, [resume.sections]);

  const handleVerifyLinks = async () => {
    setLinkVerifyMessage('');
    if (projectUrls.length === 0) {
      setLinkVerifyMessage('No project or entry links to verify.');
      return;
    }
    setIsVerifyingLinks(true);
    try {
      const response = await fetch('/api/links/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urls: projectUrls }),
      });
      if (response.status === 401) {
        setLinkVerifyMessage('Sign in to verify links.');
        return;
      }
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        setLinkVerifyMessage(
          typeof payload.error === 'string' ? payload.error : 'Link verification failed.'
        );
        return;
      }
      const payload = (await response.json()) as {
        results?: Array<{ url: string; ok: boolean; status: number }>;
      };
      const results = payload.results ?? [];
      onApplyLinkVerification(results);
      const okCount = results.filter((result) => result.ok).length;
      setLinkVerifyMessage(`Verified ${okCount}/${results.length} links (HEAD/GET).`);
    } catch {
      setLinkVerifyMessage('Link verification failed.');
    } finally {
      setIsVerifyingLinks(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto p-6 bg-background">
      <div className="mb-6">
        <h2 className="text-lg font-semibold">Parse readiness</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Flaws a parser will hit. Safe fixes and compile raise this score; JD/letter stay
          checklist-only.
        </p>
      </div>

      <section
        className="mb-6 rounded-lg border bg-card p-4 text-card-foreground shadow-sm"
        aria-label="Resume parse analysis"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold">
              <ShieldCheck className="h-4 w-4 text-primary" aria-hidden="true" />
              Score
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {isExtractingPdf
                ? 'Extracting text from the compiled PDF…'
                : pdfRoundTrip
                  ? `PDF extract: ${pdfRoundTrip.pageCount} page${pdfRoundTrip.pageCount === 1 ? '' : 's'}.`
                  : 'Compile the PDF preview to verify extraction.'}
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold">{analysis.score}</div>
            <div className="text-xs text-muted-foreground">{analysis.grade}</div>
          </div>
        </div>

        <ul className="mt-4 space-y-1.5" aria-label="Parse checklist">
          {analysis.checklist.map((item) => (
            <li key={item.id} className="flex items-start gap-2 text-xs">
              <span
                className={cn(
                  'mt-0.5 h-3.5 w-3.5 shrink-0 rounded-sm border',
                  item.pass
                    ? 'border-emerald-600 bg-emerald-600'
                    : 'border-muted-foreground/40 bg-background'
                )}
                aria-hidden="true"
              />
              <span className={item.pass ? 'text-foreground' : 'text-muted-foreground'}>
                {item.label}
              </span>
            </li>
          ))}
        </ul>

        {canApplyFixes && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={handleApplyParserFixes}
            aria-label="Apply parser fixes to this resume"
            tabIndex={0}
          >
            <Wrench className="h-3.5 w-3.5" aria-hidden="true" />
            Apply parser fixes
          </Button>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleVerifyLinks}
            disabled={isVerifyingLinks || projectUrls.length === 0}
            aria-label="Verify resume links"
            tabIndex={0}
          >
            {isVerifyingLinks ? 'Verifying…' : 'Verify links'}
          </Button>
          {linkVerifyMessage && (
            <span className="text-xs text-muted-foreground">{linkVerifyMessage}</span>
          )}
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {mappedSections.slice(0, 3).map((mapping) => (
            <span
              key={mapping.sectionId}
              className="rounded-full border bg-muted px-2 py-1 text-xs text-muted-foreground"
            >
              {mapping.sectionName} to {mapping.canonicalType}
            </span>
          ))}
        </div>

        {failedChecklist.length > 0 && (
          <p className="mt-3 text-xs text-muted-foreground">
            {failedChecklist.length} checklist{' '}
            {failedChecklist.length === 1 ? 'item' : 'items'} still open.
          </p>
        )}

        {topFindings.length > 0 && (
          <div className="mt-4 space-y-2">
            {topFindings.map((finding) => (
              <div key={finding.id} className="flex gap-2 text-xs">
                <AlertTriangle
                  className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600"
                  aria-hidden="true"
                />
                <div>
                  <div className="font-medium">{finding.title}</div>
                  <div className="text-muted-foreground">{finding.description}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 space-y-2 border-t pt-4">
          <Label htmlFor="parser-profile" className="text-xs font-semibold">
            ATS parser lens
          </Label>
          <select
            id="parser-profile"
            className="w-full rounded-md border bg-background px-2 py-1.5 text-xs"
            value={parserProfileId}
            onChange={(e) => setParserProfileId(e.target.value as ParserProfileId)}
            aria-label="Select ATS parser profile"
            tabIndex={0}
          >
            {PARSER_PROFILES.map((profile) => (
              <option key={profile.id} value={profile.id}>
                {profile.label}
              </option>
            ))}
          </select>
          <p className="text-[11px] text-muted-foreground">
            {PARSER_PROFILES.find((profile) => profile.id === parserProfileId)?.summary}
          </p>
          {parserFindings.length === 0 ? (
            <p className="text-xs text-muted-foreground">No extra issues under this lens.</p>
          ) : (
            <div className="space-y-2">
              {parserFindings.map((finding) => (
                <div key={finding.id} className="flex gap-2 text-xs">
                  <AlertTriangle
                    className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600"
                    aria-hidden="true"
                  />
                  <div>
                    <div className="font-medium">{finding.title}</div>
                    <div className="text-muted-foreground">{finding.description}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <JobTargetPanel
        resume={resume}
        templateId={selectedTemplate}
        onUpdateJobTarget={onUpdateJobTarget}
      />
    </div>
  );
};
