import type { Resume } from '@/types/resume';

export interface PdfExtractSnapshot {
  text: string;
  pageCount: number;
}

export interface PdfFieldCheck {
  id: string;
  label: string;
  expected: string;
  found: boolean;
}

export interface PdfRoundTripResult {
  pageCount: number;
  isOnePage: boolean;
  normalizedText: string;
  fields: PdfFieldCheck[];
  missingFieldIds: string[];
  sectionOrderOk: boolean | null;
}

export const normalizePdfText = (text: string): string =>
  text
    .toLowerCase()
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const stripUrlNoise = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/$/, '');

export const pdfTextIncludes = (haystack: string, needle: string): boolean => {
  const target = needle.trim();
  if (!target) return true;

  const normalizedHaystack = normalizePdfText(haystack);
  const normalizedNeedle = normalizePdfText(target);
  if (normalizedHaystack.includes(normalizedNeedle)) return true;

  const strippedNeedle = stripUrlNoise(target);
  if (strippedNeedle !== normalizedNeedle && normalizedHaystack.includes(strippedNeedle)) {
    return true;
  }

  // Emails and phones often lose punctuation in extractors.
  const compactHaystack = normalizedHaystack.replace(/[^a-z0-9@.+]/g, '');
  const compactNeedle = normalizedNeedle.replace(/[^a-z0-9@.+]/g, '');
  return compactNeedle.length > 0 && compactHaystack.includes(compactNeedle);
};

export const analyzePdfRoundTrip = (
  resume: Resume,
  snapshot: PdfExtractSnapshot
): PdfRoundTripResult => {
  const fields: PdfFieldCheck[] = [];
  const { header } = resume;

  if (header.name.trim()) {
    fields.push({
      id: 'name',
      label: 'Name',
      expected: header.name.trim(),
      found: pdfTextIncludes(snapshot.text, header.name),
    });
  }
  if (header.email.trim()) {
    fields.push({
      id: 'email',
      label: 'Email',
      expected: header.email.trim(),
      found: pdfTextIncludes(snapshot.text, header.email),
    });
  }
  if (header.phone?.trim()) {
    fields.push({
      id: 'phone',
      label: 'Phone',
      expected: header.phone.trim(),
      found: pdfTextIncludes(snapshot.text, header.phone),
    });
  }
  if (header.linkedIn?.trim()) {
    fields.push({
      id: 'linkedin',
      label: 'LinkedIn',
      expected: header.linkedIn.trim(),
      found: pdfTextIncludes(snapshot.text, header.linkedIn),
    });
  }
  if (header.github?.trim()) {
    fields.push({
      id: 'github',
      label: 'GitHub',
      expected: header.github.trim(),
      found: pdfTextIncludes(snapshot.text, header.github),
    });
  }
  if (header.website?.trim()) {
    fields.push({
      id: 'website',
      label: 'Website',
      expected: header.website.trim(),
      found: pdfTextIncludes(snapshot.text, header.website),
    });
  }

  const sortedSections = [...resume.sections].sort((a, b) => a.order - b.order);
  const sectionLabels = sortedSections
    .map((section) => section.sectionName.trim())
    .filter(Boolean);

  let sectionOrderOk: boolean | null = null;
  if (sectionLabels.length >= 2) {
    const positions = sectionLabels.map((label) =>
      normalizePdfText(snapshot.text).indexOf(normalizePdfText(label))
    );
    const foundPositions = positions.filter((position) => position >= 0);
    if (foundPositions.length >= 2) {
      sectionOrderOk = foundPositions.every(
        (position, index) => index === 0 || position >= foundPositions[index - 1]
      );
    }
  }

  // ponytail: project URLs are href-on-title today — schema "has a link" checklist covers that; don't PDF-extract them

  return {
    pageCount: snapshot.pageCount,
    isOnePage: snapshot.pageCount === 1,
    normalizedText: normalizePdfText(snapshot.text),
    fields,
    missingFieldIds: fields.filter((field) => !field.found).map((field) => field.id),
    sectionOrderOk,
  };
};
