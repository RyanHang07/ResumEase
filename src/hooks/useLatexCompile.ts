'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Resume } from '@/types/resume';
import { extractPdfText } from '@/lib/pdfExtract';
import { analyzePdfRoundTrip } from '@/lib/pdfRoundTrip';
import type { PdfRoundTripResult } from '@/lib/pdfRoundTrip';

interface UseLatexCompileReturn {
  pdfUrl: string | null;
  isCompiling: boolean;
  error: string | null;
  pdfRoundTrip: PdfRoundTripResult | null;
  isExtracting: boolean;
  compile: () => Promise<void>;
  downloadPdf: () => void;
}

export const useLatexCompile = (
  resume: Resume,
  templateId: string = 'classic',
  debounceMs: number = 1000,
  enabled: boolean = true
): UseLatexCompileReturn => {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isCompiling, setIsCompiling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pdfRoundTrip, setPdfRoundTrip] = useState<PdfRoundTripResult | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previousUrlRef = useRef<string | null>(null);
  const compileRequestRef = useRef(0);
  const extractRequestRef = useRef(0);

  const compile = useCallback(async () => {
    if (!enabled) return;

    const requestId = compileRequestRef.current + 1;
    compileRequestRef.current = requestId;
    setIsCompiling(true);
    setError(null);
    setPdfRoundTrip(null);

    try {
      const response = await fetch('/api/compile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resume, templateId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Compilation failed');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      if (compileRequestRef.current !== requestId) {
        URL.revokeObjectURL(url);
        return;
      }

      if (previousUrlRef.current) {
        URL.revokeObjectURL(previousUrlRef.current);
      }
      previousUrlRef.current = url;

      setPdfUrl(url);

      const extractId = extractRequestRef.current + 1;
      extractRequestRef.current = extractId;
      setIsExtracting(true);
      try {
        const snapshot = await extractPdfText(url);
        if (extractRequestRef.current !== extractId) return;
        setPdfRoundTrip(analyzePdfRoundTrip(resume, snapshot));
      } catch (extractError) {
        console.error('PDF extract error:', extractError);
        if (extractRequestRef.current === extractId) {
          setPdfRoundTrip(null);
        }
      } finally {
        if (extractRequestRef.current === extractId) {
          setIsExtracting(false);
        }
      }
    } catch (err) {
      if (compileRequestRef.current !== requestId) return;
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('LaTeX compilation error:', err);
    } finally {
      if (compileRequestRef.current === requestId) {
        setIsCompiling(false);
      }
    }
  }, [enabled, resume, templateId]);

  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (!enabled) {
      return;
    }

    const hasContent =
      resume.header.name ||
      resume.header.email ||
      resume.sections.length > 0;

    if (!hasContent) {
      return;
    }

    debounceTimerRef.current = setTimeout(() => {
      compile();
    }, debounceMs);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [enabled, resume, templateId, debounceMs, compile]);

  useEffect(() => {
    return () => {
      if (previousUrlRef.current) {
        URL.revokeObjectURL(previousUrlRef.current);
      }
    };
  }, []);

  const downloadPdf = useCallback(() => {
    if (!pdfUrl) return;

    const link = document.createElement('a');
    link.href = pdfUrl;
    link.download = `resume-${new Date().toISOString().split('T')[0]}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [pdfUrl]);

  return {
    pdfUrl,
    isCompiling,
    error,
    pdfRoundTrip,
    isExtracting,
    compile,
    downloadPdf,
  };
};
