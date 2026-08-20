export interface JsonApplyError {
  message: string;
  line: number | null;
  column: number | null;
}

interface ZodLikeIssue {
  path?: unknown;
  message?: unknown;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const formatZodPath = (path: unknown): string => {
  if (!Array.isArray(path) || path.length === 0) return '(root)';
  return path
    .map((segment) => (typeof segment === 'number' ? String(segment) : String(segment)))
    .join('.');
};

const getLineAndColumnFromPosition = (
  draft: string,
  position: number
): { line: number; column: number } => {
  const safePosition = Math.max(0, Math.min(position, draft.length));
  const before = draft.slice(0, safePosition);
  const lines = before.split('\n');
  const line = lines.length;
  const column = (lines[lines.length - 1]?.length ?? 0) + 1;
  return { line, column };
};

const parseSyntaxLocation = (
  message: string,
  draft: string
): { line: number | null; column: number | null } => {
  const lineColumnMatch = message.match(/line\s+(\d+)\s+column\s+(\d+)/i);
  if (lineColumnMatch?.[1] && lineColumnMatch[2]) {
    return { line: Number(lineColumnMatch[1]), column: Number(lineColumnMatch[2]) };
  }

  const lineOnlyMatch = message.match(/line\s+(\d+)/i);
  const positionMatch = message.match(/position\s+(\d+)/i);

  if (positionMatch?.[1]) {
    const position = Number(positionMatch[1]);
    if (Number.isFinite(position)) {
      const derived = getLineAndColumnFromPosition(draft, position);
      return {
        line: lineOnlyMatch?.[1] ? Number(lineOnlyMatch[1]) : derived.line,
        column: derived.column,
      };
    }
  }

  if (lineOnlyMatch?.[1]) {
    return { line: Number(lineOnlyMatch[1]), column: null };
  }

  return { line: null, column: null };
};

export const formatJsonApplyError = (err: unknown, draft: string): JsonApplyError => {
  if (isRecord(err) && Array.isArray(err.issues) && err.issues.length > 0) {
    const messages = (err.issues as ZodLikeIssue[]).map((issue) => {
      const path = formatZodPath(issue.path);
      const issueMessage =
        typeof issue.message === 'string' && issue.message.trim()
          ? issue.message
          : 'Invalid value';
      return `${path}: ${issueMessage}`;
    });
    return {
      message: messages.join('; '),
      line: null,
      column: null,
    };
  }

  const rawMessage = err instanceof Error ? err.message : 'Invalid resume JSON.';
  const { line, column } = parseSyntaxLocation(rawMessage, draft);
  const locationPrefix =
    line !== null && column !== null
      ? `line ${line}, column ${column}`
      : line !== null
        ? `line ${line}`
        : null;

  return {
    message: locationPrefix ? `${locationPrefix}: ${rawMessage}` : rawMessage,
    line,
    column,
  };
};

export const getLineStartIndex = (text: string, lineNumber: number): number => {
  if (lineNumber <= 1) return 0;

  const linesBeforeTarget = text.split('\n').slice(0, lineNumber - 1);
  return linesBeforeTarget.join('\n').length + 1;
};
