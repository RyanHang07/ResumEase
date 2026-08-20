import type { DateSpan } from '@/types/resume';

const MONTH_INDEX: Record<string, string> = {
  jan: '01',
  january: '01',
  feb: '02',
  february: '02',
  mar: '03',
  march: '03',
  apr: '04',
  april: '04',
  may: '05',
  jun: '06',
  june: '06',
  jul: '07',
  july: '07',
  aug: '08',
  august: '08',
  sep: '09',
  sept: '09',
  september: '09',
  oct: '10',
  october: '10',
  nov: '11',
  november: '11',
  dec: '12',
  december: '12',
};

const MONTH_LABELS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

export const formatYearMonth = (value: string): string => {
  const match = value.match(/^(\d{4})-(\d{2})$/);
  if (!match) return value;
  const month = Number(match[2]);
  if (month < 1 || month > 12) return value;
  return `${MONTH_LABELS[month - 1]} ${match[1]}`;
};

const parseDatePart = (part: string): string | 'present' | undefined => {
  const trimmed = part.trim();
  if (!trimmed) return undefined;
  if (/^present$/i.test(trimmed)) return 'present';
  if (/^\d{4}-\d{2}$/.test(trimmed)) return trimmed;

  const monthYear = trimmed.match(/^([A-Za-z]+)\.?\s+(\d{4})$/);
  if (monthYear) {
    const month = MONTH_INDEX[monthYear[1].toLowerCase()];
    if (month) return `${monthYear[2]}-${month}`;
  }

  if (/^\d{4}$/.test(trimmed)) return `${trimmed}-01`;
  return undefined;
};

export const parseDateRange = (raw?: string): DateSpan | undefined => {
  if (!raw?.trim()) return undefined;

  const text = raw.trim().replace(/\s+/g, ' ');
  const rangeMatch = text.match(
    /^(.+?)\s*(?:--|–|—|-|to)\s+(.+)$/i
  );

  if (!rangeMatch) {
    const single = parseDatePart(text);
    if (!single || single === 'present') {
      return { display: text };
    }
    return { start: single, end: single };
  }

  const start = parseDatePart(rangeMatch[1]);
  const end = parseDatePart(rangeMatch[2]);
  if (!start && !end) return { display: text };

  const dates: DateSpan = {};
  if (start && start !== 'present') dates.start = start;
  if (end) dates.end = end;
  return dates;
};

export const formatDateSpan = (
  dates?: DateSpan,
  dateRange?: string,
  separator = ' – '
): string => {
  if (dates?.display?.trim()) return dates.display.trim();
  if (!dates?.start && !dates?.end) return dateRange?.trim() ?? '';

  const start = dates.start ? formatYearMonth(dates.start) : '';
  const end =
    dates.end === 'present'
      ? 'Present'
      : dates.end
        ? formatYearMonth(dates.end)
        : '';

  if (start && end && start === end) return start;
  if (start && end) return `${start}${separator}${end}`;
  return start || end;
};
