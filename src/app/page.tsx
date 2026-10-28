'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { SignedIn } from '@clerk/nextjs';
import { FileEdit, FileJson, FileText, LayoutTemplate, Save, ShieldCheck } from 'lucide-react';
import { useResumeStore } from '@/store/resumeStore';
import { useLatexCompile } from '@/hooks/useLatexCompile';
import { useAutoSave } from '@/hooks/useAutoSave';
import { EditorPanel } from '@/components/editor/EditorPanel';
import { PreviewPanel } from '@/components/preview/PreviewPanel';
import { JsonEditorPanel } from '@/components/preview/JsonEditorPanel';
import { JsonErrorLeaveDialog } from '@/components/preview/JsonErrorLeaveDialog';
import { Sidebar, SidebarView } from '@/components/layout/Sidebar';
import { TemplatesPanel } from '@/components/layout/TemplatesPanel';
import { ParseReadinessPanel } from '@/components/layout/ParseReadinessPanel';
import { SavedResumesPanel } from '@/components/layout/SavedResumesPanel';
import { Toolbar } from '@/components/layout/Toolbar';
import { exportResumeAsJson, importResumeFromJson } from '@/lib/storage';
import { downloadLatexSource } from '@/lib/latex-generator';
import { downloadDocx } from '@/lib/docx-generator';
import { Section, Resume } from '@/types/resume';
import { cn } from '@/lib/utils';
import {
  hydrateResumeFromHashPayload,
  parseHashFragment,
} from '@/lib/hashResume';
import type { StatusState } from '@/lib/jsonLoadState';

type PreviewMode = 'pdf' | 'json';
type MobileView = SidebarView | 'preview' | 'json';

interface ViewToggleButtonProps {
  isActive: boolean;
  onClick: () => void;
  icon: ReactNode;
  label: string;
  controlsId: string;
}

const ViewToggleButton = ({
  isActive,
  onClick,
  icon,
  label,
  controlsId,
}: ViewToggleButtonProps) => (
  <button
    type="button"
    role="tab"
    onClick={onClick}
    className={cn(
      'inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
      isActive
        ? 'bg-primary text-primary-foreground'
        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
    )}
    aria-label={`Show ${label}`}
    aria-selected={isActive}
    aria-controls={controlsId}
    tabIndex={isActive ? 0 : -1}
  >
    {icon}
    <span className="hidden sm:inline">{label}</span>
  </button>
);

export default function HomePage() {
  const [activeView, setActiveView] = useState<SidebarView>('editor');
  const [mobileView, setMobileView] = useState<MobileView>('editor');
  const [previewMode, setPreviewMode] = useState<PreviewMode>('pdf');
  const [jsonHasErrors, setJsonHasErrors] = useState(false);
  const [pendingJsonLeaveAction, setPendingJsonLeaveAction] = useState<(() => void) | null>(null);
  const [isDocxExporting, setIsDocxExporting] = useState(false);
  const [appliedEpoch, setAppliedEpoch] = useState(0);
  const [epochSource, setEpochSource] = useState<'hash' | 'apply'>('hash');
  const [hashStatus, setHashStatus] = useState<StatusState>('idle');
  const [hashMessage, setHashMessage] = useState('');
  const loadAttemptsRef = useRef({ latest: 0, lastHashPayload: null as string | null });

  const {
    resume,
    currentTemplate,
    updateHeader,
    addSection,
    updateSection,
    removeSection,
    reorderSections,
    importResume,
    resetResume,
    setTemplate,
    updateJobTarget,
    applyParserFixes,
    applyLinkVerification,
  } = useResumeStore();

  const { pdfUrl, isCompiling, error, downloadPdf, compile, pdfRoundTrip, isExtracting } =
    useLatexCompile(resume, currentTemplate, 1000, true);
  const { isSaving, lastSaved } = useAutoSave(resume);

  const beginLoadAttempt = useCallback(() => {
    loadAttemptsRef.current.latest += 1;
    return loadAttemptsRef.current.latest;
  }, []);

  const commitIfCurrent = useCallback(
    (attemptId: number) => attemptId === loadAttemptsRef.current.latest,
    []
  );

  const markExternalLoad = useCallback(() => {
    setEpochSource('hash');
    setAppliedEpoch((epoch) => epoch + 1);
  }, []);

  useEffect(() => {
    const clearHashFragment = () => {
      const { pathname, search } = window.location;
      window.history.replaceState(null, '', `${pathname}${search}`);
    };

    const handleHash = () => {
      const fragment = parseHashFragment(window.location.hash);
      if (fragment.kind !== 'payload') return;
      if (fragment.payload === loadAttemptsRef.current.lastHashPayload) {
        clearHashFragment();
        return;
      }

      const attemptId = beginLoadAttempt();
      const result = hydrateResumeFromHashPayload(fragment.payload);
      clearHashFragment();
      if (!commitIfCurrent(attemptId)) return;

      loadAttemptsRef.current.lastHashPayload = fragment.payload;
      if (!result.ok) {
        setHashStatus('error');
        setHashMessage(result.message);
        return;
      }

      importResume(result.resume);
      setHashStatus('idle');
      setHashMessage('');
      markExternalLoad();
    };

    handleHash();
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, [beginLoadAttempt, commitIfCurrent, importResume, markExternalLoad]);

  const runWithJsonErrorGuard = useCallback(
    (action: () => void) => {
      if (previewMode === 'json' && jsonHasErrors) {
        setPendingJsonLeaveAction(() => action);
        return;
      }

      action();
    },
    [jsonHasErrors, previewMode]
  );

  const handleExportJson = useCallback(() => {
    exportResumeAsJson(resume);
  }, [resume]);

  const handleExportLatex = useCallback(() => {
    downloadLatexSource(resume, currentTemplate);
  }, [resume, currentTemplate]);

  const handleExportDocx = useCallback(async () => {
    setIsDocxExporting(true);
    try {
      await downloadDocx(resume);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Export failed';
      alert(message);
    } finally {
      setIsDocxExporting(false);
    }
  }, [resume]);

  const handleImport = useCallback(
    async (file: File) => {
      try {
        const importedResume = await importResumeFromJson(file);
        importResume(importedResume);
        markExternalLoad();
      } catch (err) {
        console.error('Import failed:', err);
        alert('Failed to import resume. Please check the file format.');
      }
    },
    [importResume, markExternalLoad]
  );

  const handleClearAll = useCallback(() => {
    resetResume();
    markExternalLoad();
  }, [resetResume, markExternalLoad]);

  const handleUpdateSection = useCallback(
    (sectionId: string, data: Partial<Section>) => {
      updateSection(sectionId, data);
    },
    [updateSection]
  );

  const handleSelectTemplate = useCallback(
    (templateId: string) => {
      runWithJsonErrorGuard(() => {
        setTemplate(templateId);
        setPreviewMode('pdf');
      });
    },
    [runWithJsonErrorGuard, setTemplate]
  );

  const handleLoadSavedResume = useCallback(
    (loadedResume: Resume, templateId: string) => {
      setTemplate(templateId);
      importResume(loadedResume);
      markExternalLoad();
      setActiveView('editor');
      setMobileView('editor');
      setJsonHasErrors(false);
    },
    [setTemplate, importResume, markExternalLoad]
  );

  const handleApplyJson = useCallback(
    (parsedResume: Resume) => {
      importResume(parsedResume);
      setEpochSource('apply');
      setAppliedEpoch((epoch) => epoch + 1);
    },
    [importResume]
  );

  const handleDesktopPreviewModeChange = useCallback((mode: PreviewMode) => {
    if (mode === previewMode) return;
    runWithJsonErrorGuard(() => setPreviewMode(mode));
  }, [previewMode, runWithJsonErrorGuard]);

  const handleMobileViewChange = useCallback((view: MobileView) => {
    if (view === mobileView) return;

    runWithJsonErrorGuard(() => {
      setMobileView(view);
      if (view === 'preview') {
        setPreviewMode('pdf');
        return;
      }
      if (view === 'json') {
        setPreviewMode('json');
        return;
      }
      setActiveView(view);
    });
  }, [mobileView, runWithJsonErrorGuard]);

  const handleConfirmJsonLeave = useCallback(() => {
    pendingJsonLeaveAction?.();
    setPendingJsonLeaveAction(null);
    setJsonHasErrors(false);
  }, [pendingJsonLeaveAction]);

  const renderLeftPanel = () => {
    if (activeView === 'templates') {
      return (
        <TemplatesPanel
          selectedTemplate={currentTemplate}
          onSelectTemplate={handleSelectTemplate}
        />
      );
    }

    if (activeView === 'parse') {
      return (
        <ParseReadinessPanel
          selectedTemplate={currentTemplate}
          onSelectTemplate={handleSelectTemplate}
          resume={resume}
          onApplyParserFixes={applyParserFixes}
          onUpdateJobTarget={updateJobTarget}
          onApplyLinkVerification={applyLinkVerification}
          pdfRoundTrip={pdfRoundTrip}
          isExtractingPdf={isExtracting}
        />
      );
    }

    if (activeView === 'saved') {
      return <SavedResumesPanel onLoadResume={handleLoadSavedResume} />;
    }

    return (
      <EditorPanel
        resume={resume}
        onUpdateHeader={updateHeader}
        onAddSection={addSection}
        onUpdateSection={handleUpdateSection}
        onRemoveSection={removeSection}
        onReorderSections={reorderSections}
      />
    );
  };

  const renderPreviewPanel = () =>
    previewMode === 'json' ? (
      <JsonEditorPanel
        resume={resume}
        appliedEpoch={appliedEpoch}
        epochSource={epochSource}
        onBeginAttempt={beginLoadAttempt}
        onCommitIfCurrent={commitIfCurrent}
        onApply={handleApplyJson}
        onErrorStateChange={setJsonHasErrors}
      />
    ) : (
      <PreviewPanel
        pdfUrl={pdfUrl}
        isLoading={isCompiling}
        error={error}
        lastSaved={lastSaved}
        isSaving={isSaving}
        onRecompile={compile}
      />
    );

  const renderMobilePanel = () => {
    if (mobileView === 'preview' || mobileView === 'json') {
      return renderPreviewPanel();
    }

    return renderLeftPanel();
  };

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <a
        href="#workspace-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-background focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-foreground focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-ring"
      >
        Skip to resume workspace
      </a>
      <Toolbar
        onExportJson={handleExportJson}
        onExportLatex={handleExportLatex}
        onExportDocx={handleExportDocx}
        onDownloadPdf={downloadPdf}
        onImport={handleImport}
        onClearAll={handleClearAll}
        isPdfReady={!!pdfUrl && !isCompiling}
        isDocxExporting={isDocxExporting}
      />
      <div
        data-testid="hash-data-status"
        data-state={hashStatus}
        role={hashStatus === 'error' ? 'alert' : 'status'}
        className={
          hashStatus === 'error'
            ? 'border-b border-destructive/30 bg-destructive/10 px-4 py-2 text-sm text-destructive'
            : 'sr-only'
        }
      >
        {hashStatus === 'error' ? hashMessage : ''}
      </div>
      <JsonErrorLeaveDialog
        open={!!pendingJsonLeaveAction}
        onOpenChange={(open) => {
          if (!open) setPendingJsonLeaveAction(null);
        }}
        onConfirm={handleConfirmJsonLeave}
      />

      <main
        id="workspace-content"
        tabIndex={-1}
        className="flex min-h-0 flex-1 flex-col overflow-hidden focus:outline-none"
        aria-label="Resume workspace"
      >
        <nav
          className="flex shrink-0 gap-2 overflow-x-auto border-b bg-background p-2 lg:hidden"
          aria-label="Mobile workspace views"
          role="tablist"
        >
          <ViewToggleButton
            isActive={mobileView === 'editor'}
            onClick={() => handleMobileViewChange('editor')}
            icon={<FileEdit className="h-4 w-4" aria-hidden="true" />}
            label="Editor"
            controlsId="mobile-workspace-panel"
          />
          <ViewToggleButton
            isActive={mobileView === 'templates'}
            onClick={() => handleMobileViewChange('templates')}
            icon={<LayoutTemplate className="h-4 w-4" aria-hidden="true" />}
            label="Templates"
            controlsId="mobile-workspace-panel"
          />
          <ViewToggleButton
            isActive={mobileView === 'parse'}
            onClick={() => handleMobileViewChange('parse')}
            icon={<ShieldCheck className="h-4 w-4" aria-hidden="true" />}
            label="Parse"
            controlsId="mobile-workspace-panel"
          />
          <SignedIn>
            <ViewToggleButton
              isActive={mobileView === 'saved'}
              onClick={() => handleMobileViewChange('saved')}
              icon={<Save className="h-4 w-4" aria-hidden="true" />}
              label="Saved"
              controlsId="mobile-workspace-panel"
            />
          </SignedIn>
          <ViewToggleButton
            isActive={mobileView === 'preview'}
            onClick={() => handleMobileViewChange('preview')}
            icon={<FileText className="h-4 w-4" aria-hidden="true" />}
            label="Preview"
            controlsId="mobile-workspace-panel"
          />
          <ViewToggleButton
            isActive={mobileView === 'json'}
            onClick={() => handleMobileViewChange('json')}
            icon={<FileJson className="h-4 w-4" aria-hidden="true" />}
            label="JSON"
            controlsId="mobile-workspace-panel"
          />
        </nav>

      <div className="hidden min-h-0 flex-1 overflow-hidden lg:flex">
        {/* Collapsible Sidebar */}
        <Sidebar activeView={activeView} onViewChange={setActiveView} />

        {/* Left Panel - Templates, Parse, Editor, or Saved */}
        <div className="w-2/5 min-w-75 max-w-125 border-r overflow-hidden">
          {renderLeftPanel()}
        </div>

        {/* Right Panel - Preview or JSON */}
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <div
            className="flex shrink-0 justify-end gap-2 border-b bg-background px-4 py-2"
            role="tablist"
            aria-label="Preview panel mode"
          >
            <ViewToggleButton
              isActive={previewMode === 'pdf'}
              onClick={() => handleDesktopPreviewModeChange('pdf')}
              icon={<FileText className="h-4 w-4" aria-hidden="true" />}
              label="PDF Preview"
              controlsId="desktop-preview-panel"
            />
            <ViewToggleButton
              isActive={previewMode === 'json'}
              onClick={() => handleDesktopPreviewModeChange('json')}
              icon={<FileJson className="h-4 w-4" aria-hidden="true" />}
              label="JSON Editor"
              controlsId="desktop-preview-panel"
            />
          </div>
          <div
            id="desktop-preview-panel"
            role="tabpanel"
            className="min-h-0 flex-1 overflow-hidden"
          >
            {renderPreviewPanel()}
          </div>
        </div>
      </div>

        <div
          id="mobile-workspace-panel"
          role="tabpanel"
          className="min-h-0 flex-1 overflow-hidden lg:hidden"
        >
          {renderMobilePanel()}
        </div>
      </main>
    </div>
  );
}
