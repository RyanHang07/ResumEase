import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { migrateResume } from '@/lib/migrations';
import { generateLatex } from '@/lib/latex-generator';
import fixture from './__fixtures__/resume-franklin-hong-data-analyst.json';

const resume = () => migrateResume(structuredClone(fixture));
const dense = () => generateLatex(resume(), 'dense');

const hasPdflatex = (() => {
  try {
    execFileSync('pdflatex', ['--version'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
})();

describe('dense template', () => {
  it('is wired into generateLatex and uses Times at 10pt with 0.5in margins', () => {
    const latex = dense();
    expect(latex).toContain('Template: Dense');
    expect(latex).toContain('\\usepackage{mathptmx}');
    expect(latex).toContain('\\usepackage[T1]{fontenc}');
    expect(latex).toContain('\\documentclass[10pt,letterpaper]{article}');
    expect(latex).toContain('margin=0.5in');
  });

  it('prints one contact line with LinkedIn and no icons, even with iconMode set', () => {
    const latex = dense();
    expect(resume().header.iconMode).toBe('icon-and-text');
    expect(latex).not.toContain('fontawesome');
    expect(latex).not.toContain('\\seticon');
    expect(latex).toContain('linkedin.com/in/franklin-hong');
    expect(latex).toMatch(/714-417-2468 \$\|\$ .*franklinhong03@gmail\.com.* \$\|\$ .*linkedin/);
  });

  it('renders the Summary as a plain paragraph with no heading rows or bullet', () => {
    const latex = dense();
    const summary = latex.slice(latex.indexOf('\\section{Summary}'), latex.indexOf('\\section{Work Experience}'));
    expect(summary).toContain('Double major graduate');
    expect(summary).not.toContain('\\item');
    expect(summary).not.toContain('\\hfill');
  });

  it('builds two rows from raw fields, not the merged role and location string', () => {
    const latex = dense();
    expect(latex).toContain('\\textbf{Bazz Houston International (Temporary)}\\hfill \\textbf{Garden Grove, CA}\\par');
    expect(latex).toContain('\\textit{Executive Operations Coordinator}\\hfill \\textit{Jun 2026 -- Aug 2026}\\par');
    expect(latex).not.toContain('Executive Operations Coordinator, Garden Grove');
  });

  it('shows the organization row once for consecutive roles at the same place', () => {
    const latex = dense();
    expect(latex.match(/\\textbf\{Economic and Business Student Association \(EBSA\)\}/g)).toHaveLength(1);
    expect(latex).toContain('\\textit{Committee Board Member}');
  });

  it('renders projects as one row, skills with bold-italic labels, and coursework', () => {
    const latex = dense();
    expect(latex).toContain('\\textbf{Microsoft Excel Job Application Dashboard} $|$ \\textit{Excel, VBA}\\hfill \\textit{Apr 2026}\\par');
    expect(latex).toContain('\\item \\textbf{\\textit{Programming:}} SQL, Python, R, Stata, VBA');
    expect(latex).toContain('\\textbf{Relevant Coursework:} Corporate Finance');
  });

  it.skipIf(!hasPdflatex)(
    'compiles the Franklin Hong fixture to exactly one page',
    () => {
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dense-'));
      fs.writeFileSync(path.join(dir, 'resume.tex'), dense());
      execFileSync('pdflatex', ['-interaction=nonstopmode', '-halt-on-error', 'resume.tex'], {
        cwd: dir,
        stdio: 'ignore',
      });
      // pdflatex always logs "Output written on resume.pdf (N page..." on success
      const log = fs.readFileSync(path.join(dir, 'resume.log'), 'latin1');
      const pages = Number(log.match(/Output written on resume\.pdf \((\d+) pages?/)?.[1]);
      expect(pages).toBe(1);
      fs.rmSync(dir, { recursive: true, force: true });
    },
    60_000
  );
});
