import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { generateLatex, resolveCompileTemplateId } from '@/lib/latex-generator';
import { migrateResume } from '@/lib/migrations';
import {
  COMPILE_LIMIT_PER_IP,
  COMPILE_LIMIT_PER_USER,
  consumeRateLimit,
  getClientIp,
} from '@/lib/rateLimit';

const LATEX_API_URL = 'https://latex.ytotech.com/builds/sync';
const MAX_RESUME_PAYLOAD_LENGTH = 100_000;
const MAX_GENERATED_LATEX_LENGTH = 150_000;
const COMPILE_TIMEOUT_MS = 20_000;

const jsonError = (error: string, status: number, extra?: Record<string, string>) => {
  const headers = extra
    ? Object.fromEntries(
        Object.entries(extra).map(([key, value]) => [key, value])
      )
    : undefined;
  return NextResponse.json({ error }, { status, headers });
};

export async function POST(request: NextRequest) {
  try {
    if (!request.headers.get('content-type')?.includes('application/json')) {
      return jsonError('Content-Type must be application/json', 415);
    }

    const ip = getClientIp(request.headers);
    const ipLimit = consumeRateLimit(`compile:ip:${ip}`, COMPILE_LIMIT_PER_IP);
    if (!ipLimit.ok) {
      return jsonError('Too many compile requests. Try again shortly.', 429, {
        'Retry-After': String(ipLimit.retryAfterSec),
      });
    }

    const { userId } = await auth();
    if (userId) {
      const userLimit = consumeRateLimit(`compile:user:${userId}`, COMPILE_LIMIT_PER_USER);
      if (!userLimit.ok) {
        return jsonError('Too many compile requests. Try again shortly.', 429, {
          'Retry-After': String(userLimit.retryAfterSec),
        });
      }
    }

    const rawBody = await request.text();
    if (rawBody.length > MAX_RESUME_PAYLOAD_LENGTH) {
      return jsonError('Resume payload is too large to compile', 413);
    }

    let body: unknown;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return jsonError('Request body must be valid JSON', 400);
    }

    if (typeof body !== 'object' || body === null || Array.isArray(body)) {
      return jsonError('Request body must be a JSON object', 400);
    }

    const payload = body as Record<string, unknown>;
    if ('latexCode' in payload) {
      return jsonError('Client LaTeX is not accepted. Send resume JSON and templateId.', 400);
    }

    const templateIdRaw = payload.templateId;
    if (typeof templateIdRaw !== 'string' || !templateIdRaw.trim()) {
      return jsonError('A valid templateId is required', 400);
    }
    const templateId = resolveCompileTemplateId(templateIdRaw);

    let resume;
    try {
      resume = migrateResume(payload.resume);
    } catch {
      return jsonError('Invalid resume payload', 400);
    }

    const latexCode = generateLatex(resume, templateId);
    if (latexCode.length > MAX_GENERATED_LATEX_LENGTH) {
      return jsonError('Generated LaTeX is too large to compile', 413);
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), COMPILE_TIMEOUT_MS);
      let pdfBuffer: ArrayBuffer;

      try {
        const response = await fetch(LATEX_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            compiler: 'pdflatex',
            resources: [
              {
                main: true,
                content: latexCode,
              },
            ],
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('LaTeX API error:', errorText);
          throw new Error(`LaTeX compilation failed: ${response.status}`);
        }

        pdfBuffer = await response.arrayBuffer();
      } finally {
        clearTimeout(timeoutId);
      }

      return new NextResponse(pdfBuffer, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': 'inline; filename="resume.pdf"',
          'Cache-Control': 'no-store',
          'X-Content-Type-Options': 'nosniff',
        },
      });
    } catch (compileError) {
      console.error('LaTeX compilation error:', compileError);

      return NextResponse.json(
        {
          error:
            'LaTeX compilation failed. Please check your resume data for special characters.',
          details:
            compileError instanceof Error
              ? compileError.message
              : 'Unknown error',
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
