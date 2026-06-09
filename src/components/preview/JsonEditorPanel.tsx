'use client';

import { useMemo, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, FileJson, LocateFixed, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import type {
  Header,
  Resume,
  Section,
  SkillCategory,
  SkillsSection,
  StandardEntry,
  StandardSection,
} from '@/types/resume';

interface JsonEditorPanelProps {
  resume: Resume;
  onApply: (resume: Resume) => void;
  onErrorStateChange?: (hasErrors: boolean) => void;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const asString = (value: unknown, fallback = ''): string =>
  typeof value === 'string' ? value : fallback;

const asStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string');
};

const createId = (prefix: string): string => `${prefix}-${crypto.randomUUID()}`;

const normalizeHeader = (value: unknown): Header => {
  if (!isRecord(value)) {
    throw new Error('JSON must include a valid header object.');
  }

  return {
    name: asString(value.name),
    email: asString(value.email),
    phone: asString(value.phone),
    linkedIn: asString(value.linkedIn),
    github: asString(value.github),
    useIcons: typeof value.useIcons === 'boolean' ? value.useIcons : true,
  };
};

const normalizeStandardEntry = (value: unknown): StandardEntry => {
  if (!isRecord(value)) {
    throw new Error('Each standard entry must be an object.');
  }

  return {
    id: asString(value.id, createId('entry')),
    title: asString(value.title),
    organization: asString(value.organization),
    dateRange: asString(value.dateRange),
    bulletPoints: asStringArray(value.bulletPoints),
  };
};

const normalizeSkillCategory = (value: unknown): SkillCategory => {
  if (!isRecord(value)) {
    throw new Error('Each skill category must be an object.');
  }

  return {
    id: asString(value.id, createId('category')),
    categoryName: asString(value.categoryName),
    skills: asStringArray(value.skills),
  };
};

const normalizeSection = (value: unknown, index: number): Section => {
  if (!isRecord(value)) {
    throw new Error('Each section must be an object.');
  }

  const baseSection = {
    id: asString(value.id, createId('section')),
    sectionName: asString(value.sectionName, 'Untitled Section'),
    order: typeof value.order === 'number' ? value.order : index,
  };

  if (value.type === 'skills') {
    if (!Array.isArray(value.categories)) {
      throw new Error('Skills sections must include a categories array.');
    }

    return {
      ...baseSection,
      type: 'skills',
      categories: value.categories.map(normalizeSkillCategory),
    } satisfies SkillsSection;
  }

  if (value.type === 'standard') {
    if (!Array.isArray(value.entries)) {
      throw new Error('Standard sections must include an entries array.');
    }

    return {
      ...baseSection,
      type: 'standard',
      entries: value.entries.map(normalizeStandardEntry),
    } satisfies StandardSection;
  }

  throw new Error('Each section type must be either "standard" or "skills".');
};

const parseResumeJson = (draft: string): Resume => {
  const parsed: unknown = JSON.parse(draft);

  if (!isRecord(parsed)) {
    throw new Error('JSON must describe a resume object.');
  }
  if (!Array.isArray(parsed.sections)) {
    throw new Error('JSON must include a sections array.');
  }

  return {
    id: asString(parsed.id, createId('resume')),
    header: normalizeHeader(parsed.header),
    sections: parsed.sections.map(normalizeSection),
    lastModified: new Date(),
  };
};

const getLineFromJsonError = (message: string, draft: string): number | null => {
  const lineMatch = message.match(/line\s+(\d+)/i);
  if (lineMatch?.[1]) return Number(lineMatch[1]);

  const positionMatch = message.match(/position\s+(\d+)/i);
  if (!positionMatch?.[1]) return null;

  const position = Number(positionMatch[1]);
  if (!Number.isFinite(position)) return null;

  return draft.slice(0, position).split('\n').length;
};

const getLineStartIndex = (text: string, lineNumber: number): number => {
  if (lineNumber <= 1) return 0;

  const linesBeforeTarget = text.split('\n').slice(0, lineNumber - 1);
  return linesBeforeTarget.join('\n').length + 1;
};

export const JsonEditorPanel = ({
  resume,
  onApply,
  onErrorStateChange,
}: JsonEditorPanelProps) => {
  const initialJson = useMemo(() => JSON.stringify(resume, null, 2), [resume]);
  const [draft, setDraft] = useState(initialJson);
  const lineNumbers = useMemo(
    () => Array.from({ length: draft.split('\n').length }, (_, index) => index + 1),
    [draft]
  );
  const lineNumberRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorLine, setErrorLine] = useState<number | null>(null);
  const [isJumpingToError, setIsJumpingToError] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleJumpToErrorLine = () => {
    if (!errorLine || !textareaRef.current) return;

    setIsJumpingToError(true);
    const textarea = textareaRef.current;
    const lineHeight = Number.parseFloat(getComputedStyle(textarea).lineHeight);
    const fallbackLineHeight = 18;
    const targetScrollTop = (errorLine - 1) * (Number.isFinite(lineHeight) ? lineHeight : fallbackLineHeight);
    const cursorPosition = getLineStartIndex(draft, errorLine);

    textarea.focus({ preventScroll: true });
    textarea.scrollTo({
      top: targetScrollTop,
      behavior: 'smooth',
    });

    if (lineNumberRef.current) {
      lineNumberRef.current.scrollTo({
        top: targetScrollTop,
        behavior: 'smooth',
      });
    }

    window.setTimeout(() => {
      textarea.setSelectionRange(cursorPosition, cursorPosition);
    }, 200);
    window.setTimeout(() => setIsJumpingToError(false), 450);
  };

  const handleApplyJson = () => {
    setSuccessMessage(null);

    try {
      const parsedResume = parseResumeJson(draft);
      onApply(parsedResume);
      setDraft(JSON.stringify(parsedResume, null, 2));
      setError(null);
      setErrorLine(null);
      setIsJumpingToError(false);
      onErrorStateChange?.(false);
      setSuccessMessage('JSON applied successfully.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Invalid resume JSON.';
      setError(message);
      setErrorLine(getLineFromJsonError(message, draft));
      onErrorStateChange?.(true);
    }
  };

  const handleResetJson = () => {
    setDraft(initialJson);
    setError(null);
    setErrorLine(null);
    setIsJumpingToError(false);
    onErrorStateChange?.(false);
    setSuccessMessage(null);
  };

  return (
    <section className="flex h-full flex-col bg-background" aria-label="JSON editor">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-muted/30 px-4 py-3">
        <div className="flex items-center gap-2">
          <FileJson className="h-4 w-4 text-primary" aria-hidden="true" />
          <div>
            <h2 className="text-sm font-semibold">JSON Editor</h2>
            <p className="text-xs text-muted-foreground">
              Edit resume data directly, then apply when valid.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleResetJson}
            aria-label="Reset JSON editor"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Reset
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleApplyJson}
            aria-label="Apply JSON changes"
          >
            Apply JSON
          </Button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-3 p-4">
        {error && (
          <div
            id="json-editor-error"
            className="flex flex-wrap items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
            role="alert"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="min-w-0 flex-1">{errorLine ? `Line ${errorLine}: ${error}` : error}</span>
            {errorLine && (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={handleJumpToErrorLine}
                disabled={isJumpingToError}
                className="h-8 shrink-0 border border-destructive/60 bg-destructive/10 text-destructive shadow-sm transition-all hover:-translate-y-0.5 hover:bg-destructive/30 hover:shadow-md focus-visible:ring-destructive/40 disabled:translate-y-0 disabled:cursor-wait disabled:opacity-80"
                aria-label={`Jump to JSON error on line ${errorLine}`}
              >
                <LocateFixed
                  className={`h-3.5 w-3.5 ${isJumpingToError ? 'animate-pulse' : ''}`}
                  aria-hidden="true"
                />
                {isJumpingToError ? 'Jumping...' : 'Jump to line'}
              </Button>
            )}
          </div>
        )}
        {successMessage && !error && (
          <div
            id="json-editor-success"
            className="flex items-start gap-2 rounded-md border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200"
            role="status"
            aria-live="polite"
          >
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{successMessage}</span>
          </div>
        )}
        <div className="flex min-h-[420px] flex-1 overflow-hidden rounded-md border border-input bg-transparent focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50">
          <div
            ref={lineNumberRef}
            className="select-none overflow-hidden border-r bg-muted/40 py-2 font-mono text-xs leading-relaxed text-muted-foreground"
            aria-hidden="true"
          >
            {lineNumbers.map((lineNumber) => (
              <div
                key={lineNumber}
                className={`px-3 text-right ${
                  lineNumber === errorLine
                    ? 'bg-destructive/20 font-semibold text-destructive'
                    : ''
                }`}
              >
                {lineNumber}
              </div>
            ))}
          </div>
          <Textarea
            ref={textareaRef}
            value={draft}
            onChange={(event) => {
              setDraft(event.target.value);
              setError(null);
              setErrorLine(null);
              onErrorStateChange?.(false);
              setSuccessMessage(null);
            }}
            onScroll={(event) => {
              if (lineNumberRef.current) {
                lineNumberRef.current.scrollTop = event.currentTarget.scrollTop;
              }
            }}
            spellCheck={false}
            className="min-h-[420px] flex-1 resize-none overflow-auto rounded-none border-0 font-mono text-xs leading-relaxed shadow-none focus-visible:ring-0 md:text-xs"
            aria-label="Resume JSON"
            aria-invalid={!!error}
            aria-describedby={
              error
                ? 'json-editor-error'
                : successMessage
                  ? 'json-editor-success'
                  : undefined
            }
          />
        </div>
      </div>
    </section>
  );
};
