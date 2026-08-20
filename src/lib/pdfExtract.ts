import type { PdfExtractSnapshot } from '@/lib/pdfRoundTrip';

let workerConfigured = false;

const ensurePdfWorker = async () => {
  if (workerConfigured || typeof window === 'undefined') return;
  const pdfjs = await import('pdfjs-dist');
  pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
  workerConfigured = true;
};

export const extractPdfText = async (pdfUrl: string): Promise<PdfExtractSnapshot> => {
  await ensurePdfWorker();
  const pdfjs = await import('pdfjs-dist');
  const loadingTask = pdfjs.getDocument(pdfUrl);
  const pdf = await loadingTask.promise;
  const pageTexts: string[] = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item) => ('str' in item ? item.str : ''))
      .filter(Boolean)
      .join(' ');
    pageTexts.push(pageText);
  }

  return {
    text: pageTexts.join('\n'),
    pageCount: pdf.numPages,
  };
};
