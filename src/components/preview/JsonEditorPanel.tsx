'use client';

import { useMemo, useRef, useState, type ChangeEvent } from 'react';
import { AlertCircle, CheckCircle2, FileJson, LocateFixed, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { migrateResume } from '@/lib/migrations';
import { formatJsonApplyError, getLineStartIndex } from '@/lib/jsonApplyError';
import { resumeToEditorJson } from '@/lib/hashResume';
import { APPLY_IDLE_MESSAGE, APPLY_OK_MESSAGE, type StatusState } from '@/lib/jsonLoadState';
import type { Resume } from '@/types/resume';

interface JsonEditorPanelProps {
  resume: Resume;
  appliedEpoch: number;
  epochSource: 'hash' | 'apply';
  onBeginAttempt: () => number;
  onCommitIfCurrent: (attemptId: number) => boolean;
  onApply: (resume: Resume) => void;
  onErrorStateChange?: (hasErrors: boolean) => void;
}

const parseResumeJson = (draft: string): Resume => {
  const parsed: unknown = JSON.parse(draft);
  return migrateResume(parsed);
};

export const JsonEditorPanel = ({
  resume,
  appliedEpoch,
  epochSource,
  onBeginAttempt,
  onCommitIfCurrent,
  onApply,
  onErrorStateChange,
}: JsonEditorPanelProps) => {
  const incoming = useMemo(() => resumeToEditorJson(resume), [resume]);
  const [draft, setDraft] = useState(incoming);
  const [incomingSnapshot, setIncomingSnapshot] = useState(incoming);
  const [seenEpoch, setSeenEpoch] = useState(appliedEpoch);
  const [applyStatus, setApplyStatus] = useState<StatusState>('idle');
  const [applyMessage, setApplyMessage] = useState(APPLY_IDLE_MESSAGE);
  const lineNumbers = useMemo(
    () => Array.from({ length: draft.split('\n').length }, (_, index) => index + 1),
    [draft]
  );
  const lineNumberRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [errorLine, setErrorLine] = useState<number | null>(null);
  const [isJumpingToError, setIsJumpingToError] = useState(false);

  if (appliedEpoch !== seenEpoch) {
    setSeenEpoch(appliedEpoch);
    setIncomingSnapshot(incoming);
    setDraft(incoming);
    if (epochSource === 'hash') {
      setApplyStatus('idle');
      setApplyMessage(APPLY_IDLE_MESSAGE);
      setErrorLine(null);
      setIsJumpingToError(false);
    }
  } else if (incoming !== incomingSnapshot) {
    if (draft === incomingSnapshot) {
      setDraft(incoming);
    }
    setIncomingSnapshot(incoming);
  }

  const handleJumpToErrorLine = () => {
    if (!errorLine || !textareaRef.current) return;

    setIsJumpingToError(true);
    const textarea = textareaRef.current;
    const lineHeight = Number.parseFloat(getComputedStyle(textarea).lineHeight);
    const fallbackLineHeight = 18;
    const targetScrollTop =
      (errorLine - 1) * (Number.isFinite(lineHeight) ? lineHeight : fallbackLineHeight);
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
    const attemptId = onBeginAttempt();

    try {
      const parsedResume = parseResumeJson(draft);
      if (!onCommitIfCurrent(attemptId)) return;
      onApply(parsedResume);
      setApplyStatus('ok');
      setApplyMessage(APPLY_OK_MESSAGE);
      setErrorLine(null);
      setIsJumpingToError(false);
      onErrorStateChange?.(false);
    } catch (err) {
      if (!onCommitIfCurrent(attemptId)) return;
      const formatted = formatJsonApplyError(err, draft);
      setApplyStatus('error');
      setApplyMessage(formatted.message);
      setErrorLine(formatted.line);
      onErrorStateChange?.(true);
    }
  };

  const handleResetJson = () => {
    setDraft(incomingSnapshot);
    setApplyStatus('idle');
    setApplyMessage(APPLY_IDLE_MESSAGE);
    setErrorLine(null);
    setIsJumpingToError(false);
    onErrorStateChange?.(false);
  };

  const handleDraftChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    setDraft(event.target.value);
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
            data-testid="reset-json"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Reset
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleApplyJson}
            aria-label="Apply JSON changes"
            data-testid="apply-json"
          >
            Apply JSON
          </Button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-3 p-4">
        <span
          data-testid="apply-status"
          data-state={applyStatus}
          className={
            applyStatus === 'error'
              ? 'text-sm text-destructive'
              : applyStatus === 'ok'
                ? 'text-sm text-emerald-800 dark:text-emerald-200'
                : 'text-sm text-muted-foreground'
          }
        >
          {applyMessage}
        </span>
        {applyStatus === 'error' && (
          <div
            id="json-editor-error"
            className="flex flex-wrap items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
            role="alert"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="min-w-0 flex-1">{applyMessage}</span>
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
        {applyStatus === 'ok' && (
          <div
            id="json-editor-success"
            className="flex items-start gap-2 rounded-md border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200"
            role="status"
            aria-live="polite"
          >
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{APPLY_OK_MESSAGE}</span>
          </div>
        )}
        <div className="flex min-h-105 flex-1 overflow-hidden rounded-md border border-input bg-transparent focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50">
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
            onChange={handleDraftChange}
            onScroll={(event) => {
              if (lineNumberRef.current) {
                lineNumberRef.current.scrollTop = event.currentTarget.scrollTop;
              }
            }}
            spellCheck={false}
            className="min-h-105 flex-1 resize-none overflow-auto rounded-none border-0 font-mono text-xs leading-relaxed shadow-none focus-visible:ring-0 md:text-xs"
            aria-label="Resume JSON"
            data-testid="resume-json"
            aria-invalid={applyStatus === 'error'}
            aria-describedby={
              applyStatus === 'error'
                ? 'json-editor-error'
                : applyStatus === 'ok'
                  ? 'json-editor-success'
                  : undefined
            }
          />
        </div>
      </div>
    </section>
  );
};
