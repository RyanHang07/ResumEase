import { NextRequest, NextResponse } from 'next/server';

// Using latex.ytotech.com API which is more reliable
// Documentation: https://github.com/YtoTech/latex-on-http
const LATEX_API_URL = 'https://latex.ytotech.com/builds/sync';
const MAX_LATEX_LENGTH = 150_000;
const COMPILE_TIMEOUT_MS = 20_000;

export async function POST(request: NextRequest) {
  try {
    if (!request.headers.get('content-type')?.includes('application/json')) {
      return NextResponse.json(
        { error: 'Content-Type must be application/json' },
        { status: 415 }
      );
    }

    const body = await request.json();
    const latexCode = body?.latexCode;

    if (typeof latexCode !== 'string' || !latexCode.trim()) {
      return NextResponse.json(
        { error: 'No LaTeX code provided' },
        { status: 400 }
      );
    }

    if (latexCode.length > MAX_LATEX_LENGTH) {
      return NextResponse.json(
        { error: 'LaTeX code is too large to compile' },
        { status: 413 }
      );
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), COMPILE_TIMEOUT_MS);
      let pdfBuffer: ArrayBuffer;

      try {
        // Use latex.ytotech.com API
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
