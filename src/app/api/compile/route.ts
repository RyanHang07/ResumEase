import { NextRequest, NextResponse } from 'next/server';

// Using latex.ytotech.com API which is more reliable
// Documentation: https://github.com/YtoTech/latex-on-http
const LATEX_API_URL = 'https://latex.ytotech.com/builds/sync';

export async function POST(request: NextRequest) {
  try {
    const { latexCode } = await request.json();

    if (!latexCode) {
      return NextResponse.json(
        { error: 'No LaTeX code provided' },
        { status: 400 }
      );
    }

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
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('LaTeX API error:', errorText);
        throw new Error(`LaTeX compilation failed: ${response.status}`);
      }

      const pdfBuffer = await response.arrayBuffer();

      return new NextResponse(pdfBuffer, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': 'inline; filename="resume.pdf"',
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
