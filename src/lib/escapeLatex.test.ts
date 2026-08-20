import { describe, expect, it } from 'vitest';
import {
  escapeHrefUrl,
  escapeLatex,
  escapeLatexInline,
  normalizeHttpUrl,
  normalizeSectionName,
} from '@/lib/templates/shared';
import { consumeRateLimit, getClientIp } from '@/lib/rateLimit';
import { generateClassicLatex } from '@/lib/templates/classic';
import { generateCompactLatex } from '@/lib/templates/compact';
import { createSampleResume } from '@/lib/sampleData';
import type { Resume } from '@/types/resume';

describe('escapeLatex', () => {
  it('escapes every LaTeX special character', () => {
    expect(escapeLatex('\\')).toBe('\\textbackslash{}');
    expect(escapeLatex('&')).toBe('\\&');
    expect(escapeLatex('%')).toBe('\\%');
    expect(escapeLatex('$')).toBe('\\$');
    expect(escapeLatex('#')).toBe('\\#');
    expect(escapeLatex('_')).toBe('\\_');
    expect(escapeLatex('{')).toBe('\\{');
    expect(escapeLatex('}')).toBe('\\}');
    expect(escapeLatex('~')).toBe('\\textasciitilde{}');
    expect(escapeLatex('^')).toBe('\\textasciicircum{}');
  });

  it('escapes a mixed intern bullet without dropping text', () => {
    expect(escapeLatex('Cut cost 20% at Acme_Labs using C++ & Node')).toContain('\\%');
    expect(escapeLatex('Cut cost 20% at Acme_Labs using C++ & Node')).toContain('\\_');
    expect(escapeLatex('Cut cost 20% at Acme_Labs using C++ & Node')).toContain('\\&');
  });
});

describe('escapeLatexInline', () => {
  it('braces-safe item text and collapses newlines', () => {
    expect(escapeLatexInline('[Remote] built APIs')).toBe('[Remote] built APIs');
    expect(escapeLatexInline('line1\nline2')).toBe('line1 line2');
  });
});

describe('escapeHrefUrl', () => {
  it('escapes href specials and rejects unsafe schemes', () => {
    expect(escapeHrefUrl('https://example.com/path#frag')).toBe(
      'https://example.com/path\\#frag'
    );
    expect(escapeHrefUrl('https://ex.com?a=1&b=2')).toBe('https://ex.com/?a=1\\&b=2');
    expect(escapeHrefUrl('javascript:alert(1)')).toBeNull();
    expect(escapeHrefUrl('mailto:alex@example.com')).toBe('mailto:alex@example.com');
  });

  it('normalizes scheme-less hosts for linking', () => {
    expect(normalizeHttpUrl('github.com/x')).toBe('https://github.com/x');
    expect(escapeHrefUrl('github.com/x')).toBe('https://github.com/x');
  });
});

describe('consumeRateLimit', () => {
  it('allows requests under the limit and blocks after', () => {
    const key = `test:${Date.now()}:${Math.random()}`;
    expect(consumeRateLimit(key, 2, 60_000).ok).toBe(true);
    expect(consumeRateLimit(key, 2, 60_000).ok).toBe(true);
    expect(consumeRateLimit(key, 2, 60_000).ok).toBe(false);
  });
});

describe('getClientIp', () => {
  it('prefers platform headers over leftmost X-Forwarded-For', () => {
    const headers = new Headers({
      'x-forwarded-for': '1.2.3.4, 10.0.0.1',
      'x-vercel-forwarded-for': '9.9.9.9',
    });
    expect(getClientIp(headers)).toBe('9.9.9.9');
  });
});

describe('normalizeSectionName', () => {
  it('matches aliases exactly and rejects substring false positives', () => {
    expect(normalizeSectionName('Technical Skills')).toBe('skills');
    expect(normalizeSectionName('  work   experience ')).toBe('experience');
    expect(normalizeSectionName('leadership experience awards')).toBeNull();
    expect(normalizeSectionName('Project Management')).toBeNull();
    expect(normalizeSectionName('Projects')).toBe('projects');
  });
});

describe('classic education extras', () => {
  it('does not emit trailing \\\\ before next section when education has meta and no bullets', () => {
    const resume = createSampleResume();
    const latex = generateClassicLatex(resume);
    // Sample Education: meta + coursework, empty bullets — last extra must not trail \\\\
    expect(latex).not.toMatch(/Coursework:[\s\S]*\\\\\n\n\\section\*/);
    expect(latex).toMatch(/\\item \{/);
  });

  it('wraps leading-bracket bullets safely', () => {
    const resume = createSampleResume();
    const experience = resume.sections.find((s) => s.sectionName === 'Experience');
    if (experience?.type === 'standard') {
      experience.entries[0].bulletPoints = ['[Remote] shipped feature'];
    }
    const latex = generateClassicLatex(resume);
    expect(latex).toContain('\\item {[Remote] shipped feature}');
  });
});

describe('compact project section detection', () => {
  it('does not treat Project Management as projects heading', () => {
    const base = createSampleResume();
    const resume: Resume = {
      ...base,
      sections: [
        {
          id: 'pm-1',
          type: 'standard',
          sectionName: 'Project Management',
          order: 0,
          entries: [
            {
              id: 'e1',
              title: 'Scrum Lead',
              organization: 'Acme',
              location: '',
              dates: { start: '2024-01', end: '2024-06' },
              bulletPoints: ['Led sprints'],
            },
          ],
        },
      ],
    };
    const latex = generateCompactLatex(resume);
    expect(latex).toContain('\\resumeSubheading');
    // Preamble still defines \\resumeProjectHeading; assert it is not *invoked* for this section.
    expect(latex).not.toMatch(/^\s*\\resumeProjectHeading\b/m);
  });
});
