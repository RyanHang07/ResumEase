'use client';

import { useCallback } from 'react';
import { useResumeStore } from '@/store/resumeStore';
import { useLatexCompile } from '@/hooks/useLatexCompile';
import { useAutoSave } from '@/hooks/useAutoSave';
import { EditorPanel } from '@/components/editor/EditorPanel';
import { PreviewPanel } from '@/components/preview/PreviewPanel';
import { Sidebar, SidebarView } from '@/components/layout/Sidebar';
import { TemplatesPanel } from '@/components/layout/TemplatesPanel';
import { SavedResumesPanel } from '@/components/layout/SavedResumesPanel';
import { Toolbar } from '@/components/layout/Toolbar';
import { exportResumeAsJson, importResumeFromJson } from '@/lib/storage';
import { downloadLatexSource } from '@/lib/latex-generator';
import { getSampleDataForTemplate } from '@/lib/sampleData';
import { Section, Resume } from '@/types/resume';
import { useState } from 'react';

export default function HomePage() {
  const [activeView, setActiveView] = useState<SidebarView>('editor');

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
    loadSampleData,
  } = useResumeStore();

  const { pdfUrl, isCompiling, error, downloadPdf, compile } = useLatexCompile(resume, currentTemplate);
  const { isSaving, lastSaved } = useAutoSave(resume);

  const handleExportJson = useCallback(() => {
    exportResumeAsJson(resume);
  }, [resume]);

  const handleExportLatex = useCallback(() => {
    downloadLatexSource(resume, currentTemplate);
  }, [resume, currentTemplate]);

  const handleImport = useCallback(
    async (file: File) => {
      try {
        const importedResume = await importResumeFromJson(file);
        importResume(importedResume);
      } catch (err) {
        console.error('Import failed:', err);
        alert('Failed to import resume. Please check the file format.');
      }
    },
    [importResume]
  );

  const handleClearAll = useCallback(() => {
    resetResume();
  }, [resetResume]);

  const handleUpdateSection = useCallback(
    (sectionId: string, data: Partial<Section>) => {
      updateSection(sectionId, data);
    },
    [updateSection]
  );

  const handleSelectTemplate = useCallback(
    (templateId: string) => {
      setTemplate(templateId);
      // Load sample data for the selected template
      const sampleData = getSampleDataForTemplate(templateId);
      loadSampleData(sampleData);
    },
    [setTemplate, loadSampleData]
  );

  const handleLoadSavedResume = useCallback(
    (loadedResume: Resume, templateId: string) => {
      setTemplate(templateId);
      importResume(loadedResume);
      setActiveView('editor');
    },
    [setTemplate, importResume]
  );

  return (
    <div className="h-screen flex flex-col">
      <Toolbar
        onExportJson={handleExportJson}
        onExportLatex={handleExportLatex}
        onDownloadPdf={downloadPdf}
        onImport={handleImport}
        onClearAll={handleClearAll}
        isPdfReady={!!pdfUrl && !isCompiling}
      />
      <div className="flex flex-1 overflow-hidden">
        {/* Collapsible Sidebar */}
        <Sidebar activeView={activeView} onViewChange={setActiveView} />

        {/* Left Panel - Templates, Editor, or Saved */}
        <div className="w-2/5 min-w-[300px] max-w-[500px] border-r overflow-hidden">
          {activeView === 'templates' ? (
            <TemplatesPanel
              selectedTemplate={currentTemplate}
              onSelectTemplate={handleSelectTemplate}
            />
          ) : activeView === 'saved' ? (
            <SavedResumesPanel onLoadResume={handleLoadSavedResume} />
          ) : (
            <EditorPanel
              resume={resume}
              onUpdateHeader={updateHeader}
              onAddSection={addSection}
              onUpdateSection={handleUpdateSection}
              onRemoveSection={removeSection}
              onReorderSections={reorderSections}
            />
          )}
        </div>

        {/* Right Panel - Preview (always visible) */}
        <div className="flex-1 overflow-hidden">
          <PreviewPanel
            pdfUrl={pdfUrl}
            isLoading={isCompiling}
            error={error}
            lastSaved={lastSaved}
            isSaving={isSaving}
            onRecompile={compile}
          />
        </div>
      </div>
    </div>
  );
}
