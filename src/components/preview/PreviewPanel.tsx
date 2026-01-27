'use client';

import { useState, useCallback } from 'react';
import { PDFViewer } from './PDFViewer';
import { PreviewControls } from './PreviewControls';

interface PreviewPanelProps {
  pdfUrl: string | null;
  isLoading: boolean;
  error: string | null;
  lastSaved?: Date | null;
  isSaving?: boolean;
  onRecompile: () => void;
}

export const PreviewPanel = ({
  pdfUrl,
  isLoading,
  error,
  lastSaved,
  isSaving,
  onRecompile,
}: PreviewPanelProps) => {
  const [zoom, setZoom] = useState(100);

  const handleZoomIn = useCallback(() => {
    setZoom((prev) => Math.min(prev + 10, 200));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom((prev) => Math.max(prev - 10, 50));
  }, []);

  const handleFitWidth = useCallback(() => {
    setZoom(100);
  }, []);

  return (
    <div className="h-full flex flex-col bg-background">
      <PreviewControls
        zoom={zoom}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onFitWidth={handleFitWidth}
        onRecompile={onRecompile}
        isCompiling={isLoading}
        lastSaved={lastSaved}
        isSaving={isSaving}
      />
      <div className="flex-1 overflow-hidden">
        <PDFViewer
          pdfUrl={pdfUrl}
          zoom={zoom}
          isLoading={isLoading}
          error={error}
        />
      </div>
    </div>
  );
};
