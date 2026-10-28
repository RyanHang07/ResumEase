'use client';

import { useMemo, useRef, useState } from 'react';
import { Check, ClipboardPaste, Copy, FileUp, Link2 } from 'lucide-react';
import type { Resume } from '@/types/resume';
import { cn } from '@/lib/utils';
import {
  buildClaudeInstructions,
  buildResumeLink,
  parseResumeInput,
} from '@/lib/claudeImport';
import { resumeToEditorJson } from '@/lib/hashResume';
import { resumeBaseName } from '@/lib/resumeFilename';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface ClaudeImportPanelProps {
  resume: Resume;
  onLoadResume: (resume: Resume, downloadPdf: boolean) => void;
}

type Status = { kind: 'idle' } | { kind: 'ok'; message: string } | { kind: 'error'; message: string };
type CopyTarget = 'json' | 'link' | 'instructions';

export const ClaudeImportPanel = ({ resume, onLoadResume }: ClaudeImportPanelProps) => {
  const [draft, setDraft] = useState('');
  const [downloadAfterLoad, setDownloadAfterLoad] = useState(true);
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const [isDragging, setIsDragging] = useState(false);
  const [copied, setCopied] = useState<CopyTarget | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const instructions = useMemo(() => buildClaudeInstructions(), []);

  const load = (text: string, source: string) => {
    const result = parseResumeInput(text);
    if (!result.ok) {
      setStatus({ kind: 'error', message: result.message });
      return;
    }
    onLoadResume(result.resume, downloadAfterLoad);
    setDraft('');
    setStatus({
      kind: 'ok',
      message: `Loaded ${resumeBaseName(result.resume)} from ${source}.${
        downloadAfterLoad ? ' The PDF downloads once it compiles.' : ''
      }`,
    });
  };

  const handlePasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      load(text, 'clipboard');
    } catch {
      setStatus({
        kind: 'error',
        message: 'Clipboard access was blocked. Paste into the box below instead.',
      });
    }
  };

  const loadFile = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.json') && file.type !== 'application/json') {
      setStatus({ kind: 'error', message: `${file.name} is not a .json file.` });
      return;
    }
    load(await file.text(), file.name);
  };

  const handleDrop = async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (file) {
      await loadFile(file);
      return;
    }
    const text = event.dataTransfer.getData('text/plain');
    if (text) load(text, 'dropped text');
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (file) await loadFile(file);
  };

  const copy = async (target: CopyTarget, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(target);
      setTimeout(() => setCopied((current) => (current === target ? null : current)), 1500);
    } catch {
      setStatus({ kind: 'error', message: 'Clipboard access was blocked.' });
    }
  };

  const copyIcon = (target: CopyTarget, Icon: typeof Copy) =>
    copied === target ? (
      <Check className="h-3.5 w-3.5" aria-hidden="true" />
    ) : (
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
    );

  return (
    <div className="h-full space-y-4 overflow-y-auto p-4">
      <section
        className="rounded-lg border bg-card p-4 text-card-foreground shadow-sm"
        aria-labelledby="claude-load-heading"
      >
        <h2 id="claude-load-heading" className="text-sm font-semibold">
          Load from Claude
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Paste the JSON, a ```json block, or a resume link. Nothing is stored in the browser.
        </p>

        <div className="mt-3 flex flex-wrap gap-2">
          <Button type="button" size="sm" onClick={handlePasteFromClipboard}>
            <ClipboardPaste className="h-3.5 w-3.5" aria-hidden="true" />
            Paste from clipboard
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
          >
            <FileUp className="h-3.5 w-3.5" aria-hidden="true" />
            Choose .json
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            onChange={handleFileChange}
            className="hidden"
            aria-hidden="true"
            tabIndex={-1}
          />
        </div>

        <div className="mt-3 flex items-center gap-2">
          <Checkbox
            id="claude-download-after-load"
            checked={downloadAfterLoad}
            onCheckedChange={(checked) => setDownloadAfterLoad(checked === true)}
          />
          <Label htmlFor="claude-download-after-load" className="text-xs font-normal">
            Download the PDF after loading
          </Label>
        </div>

        <div
          onDragOver={(event) => {
            event.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={cn(
            'mt-3 rounded-md border border-dashed p-2 transition-colors',
            isDragging && 'border-primary bg-primary/5'
          )}
        >
          <Label htmlFor="claude-json-input" className="sr-only">
            Resume JSON or link
          </Label>
          <Textarea
            id="claude-json-input"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Paste here, or drop a .json file"
            rows={6}
            className="border-0 font-mono text-xs shadow-none focus-visible:ring-0"
            spellCheck={false}
          />
          <div className="flex justify-end">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => load(draft, 'the text box')}
              disabled={!draft.trim()}
            >
              Load
            </Button>
          </div>
        </div>

        <p
          role={status.kind === 'error' ? 'alert' : 'status'}
          className={cn(
            'mt-2 text-xs',
            status.kind === 'error' && 'text-destructive',
            status.kind === 'ok' && 'text-emerald-700 dark:text-emerald-400',
            status.kind === 'idle' && 'sr-only'
          )}
        >
          {status.kind === 'idle' ? '' : status.message}
        </p>
      </section>

      <section
        className="rounded-lg border bg-card p-4 text-card-foreground shadow-sm"
        aria-labelledby="claude-send-heading"
      >
        <h2 id="claude-send-heading" className="text-sm font-semibold">
          Send to Claude
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Current file name: <span className="font-mono">{resumeBaseName(resume)}.pdf</span>
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => copy('json', resumeToEditorJson(resume))}
          >
            {copyIcon('json', Copy)}
            Copy JSON
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => copy('link', buildResumeLink(resume, { downloadPdf: downloadAfterLoad }))}
          >
            {copyIcon('link', Link2)}
            Copy link
          </Button>
        </div>
      </section>

      <section
        className="rounded-lg border bg-card p-4 text-card-foreground shadow-sm"
        aria-labelledby="claude-instructions-heading"
      >
        <div className="flex items-center justify-between gap-2">
          <h2 id="claude-instructions-heading" className="text-sm font-semibold">
            Instructions for Claude
          </h2>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => copy('instructions', instructions)}
          >
            {copyIcon('instructions', Copy)}
            Copy
          </Button>
        </div>
        <pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap rounded border bg-muted/40 p-2 text-[11px]">
          {instructions}
        </pre>
      </section>
    </div>
  );
};
