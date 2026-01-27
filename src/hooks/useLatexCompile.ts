'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Resume } from '@/types/resume';
import { generateLatex } from '@/lib/latex-generator';

interface UseLatexCompileReturn {
  pdfUrl: string | null;
  isCompiling: boolean;
  error: string | null;
  compile: () => Promise<void>;
  downloadPdf: () => void;
}

export const useLatexCompile = (
  resume: Resume,
  templateId: string = 'classic',
  debounceMs: number = 1000
): UseLatexCompileReturn => {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isCompiling, setIsCompiling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previousUrlRef = useRef<string | null>(null);

  const compile = useCallback(async () => {
    setIsCompiling(true);
    setError(null);

    try {
      const latexCode = generateLatex(resume, templateId);

      const response = await fetch('/api/compile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ latexCode }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Compilation failed');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      // Revoke old URL to prevent memory leaks
      if (previousUrlRef.current) {
        URL.revokeObjectURL(previousUrlRef.current);
      }
      previousUrlRef.current = url;

      setPdfUrl(url);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('LaTeX compilation error:', err);
    } finally {
      setIsCompiling(false);
    }
  }, [resume, templateId]);

  // Debounced compilation on resume changes
  useEffect(() => {
    // Clear any existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Only compile if we have some content
    const hasContent =
      resume.header.name ||
      resume.header.email ||
      resume.sections.length > 0;

    if (!hasContent) {
      return;
    }

    // Set up debounced compilation
    debounceTimerRef.current = setTimeout(() => {
      compile();
    }, debounceMs);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [resume, templateId, debounceMs, compile]);

  // Cleanup on unmount
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
    compile,
    downloadPdf,
  };
};
