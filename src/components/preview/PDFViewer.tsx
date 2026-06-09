'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Loader2, FileWarning } from 'lucide-react';
import { cn } from '@/lib/utils';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Dynamically import react-pdf components to avoid SSR issues
const Document = dynamic(
  () => import('react-pdf').then((mod) => mod.Document),
  { ssr: false }
);

const Page = dynamic(
  () => import('react-pdf').then((mod) => mod.Page),
  { ssr: false }
);

interface PDFViewerProps {
  pdfUrl: string | null;
  zoom: number;
  isLoading: boolean;
  error: string | null;
}

export const PDFViewer = ({
  pdfUrl,
  zoom,
  isLoading,
  error,
}: PDFViewerProps) => {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageWidth, setPageWidth] = useState(600);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    
    // Set up PDF.js worker on client side only
    const setupWorker = async () => {
      const pdfjs = await import('react-pdf');
      pdfjs.pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.pdfjs.version}/build/pdf.worker.min.mjs`;
    };
    setupWorker();
  }, []);

  useEffect(() => {
    // Calculate page width based on zoom
    const baseWidth = 600;
    setPageWidth(baseWidth * (zoom / 100));
  }, [zoom]);

  const handleDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
  };

  if (error) {
    return (
      <div
        className="flex flex-col items-center justify-center h-full text-muted-foreground gap-4 p-8"
        role="alert"
      >
        <FileWarning className="h-12 w-12 text-destructive" aria-hidden="true" />
        <div className="text-center">
          <p className="font-medium text-destructive">Compilation Error</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      </div>
    );
  }

  if (!pdfUrl && !isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-4 p-8">
        <FileWarning className="h-12 w-12" aria-hidden="true" />
        <p className="text-center">
          Start filling out your resume to see a preview
        </p>
      </div>
    );
  }

  if (!isClient) {
    return (
      <div className="flex items-center justify-center h-full" role="status" aria-live="polite">
        <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden="true" />
        <span className="sr-only">Loading PDF viewer</span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'relative h-full bg-muted/30',
        isLoading ? 'overflow-hidden' : 'overflow-auto'
      )}
      role="region"
      aria-label="PDF resume preview"
      aria-busy={isLoading}
    >
      {isLoading && (
        <div
          className="absolute inset-0 flex items-center justify-center bg-background/80 z-10"
          role="status"
          aria-live="polite"
        >
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden="true" />
            <span className="text-sm text-muted-foreground">
              Generating PDF...
            </span>
          </div>
        </div>
      )}

      {pdfUrl && (
        <div className="flex justify-center px-4 pt-4 pb-2" aria-label="Rendered resume pages">
          <Document
            file={pdfUrl}
            onLoadSuccess={handleDocumentLoadSuccess}
            loading={
              <div className="flex items-center justify-center p-8" role="status" aria-live="polite">
                <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden="true" />
                <span className="sr-only">Loading PDF document</span>
              </div>
            }
            error={
              <div className="flex flex-col items-center justify-center p-8 text-destructive" role="alert">
                <FileWarning className="h-8 w-8 mb-2" aria-hidden="true" />
                <p>Failed to load PDF</p>
              </div>
            }
          >
            {numPages &&
              Array.from(new Array(numPages), (_, index) => (
                <Page
                  key={`page_${index + 1}`}
                  pageNumber={index + 1}
                  width={pageWidth}
                  className="shadow-lg"
                  renderTextLayer
                  renderAnnotationLayer
                  aria-label={`Resume page ${index + 1}`}
                />
              ))}
          </Document>
        </div>
      )}
    </div>
  );
};
