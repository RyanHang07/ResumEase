'use client';

import { useMemo } from 'react';
import { AlertTriangle, Check, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { analyzeResumeForAts, getTemplateAtsProfile } from '@/lib/ats';
import type { AtsTemplateRisk } from '@/lib/ats';
import type { Resume } from '@/types/resume';

interface Template {
  id: string;
  name: string;
  description: string;
  previewColor: string;
}

interface TemplatesPanelProps {
  selectedTemplate: string;
  onSelectTemplate: (templateId: string) => void;
  resume: Resume;
}

export const templates: Template[] = [
  {
    id: 'classic',
    name: 'Classic',
    description: 'Clean and simple traditional layout',
    previewColor: 'bg-gradient-to-b from-blue-600 to-blue-800 text-white',
  },
  {
    id: 'compact',
    name: 'Compact',
    description: 'Space-efficient layout with Lato font',
    previewColor: 'bg-gradient-to-b from-slate-400 to-slate-500 text-white',
  },
  {
    id: 'two-column',
    name: 'Two-Column',
    description: 'Sidebar for skills, main area for experience',
    previewColor: 'bg-gradient-to-r from-indigo-700 to-teal-600 text-white',
  },
  {
    id: 'academic',
    name: 'Academic CV',
    description: 'Traditional serif font for academia',
    previewColor: 'bg-gradient-to-b from-red-400 to-red-800 text-white',
  },
  {
    id: 'developer',
    name: 'Developer',
    description: 'Monospace accents, tech-focused',
    previewColor: 'bg-gradient-to-b from-slate-800 to-slate-900 text-emerald-400',
  },
];

// Helper function to get template name from ID
export const getTemplateName = (templateId: string): string => {
  const template = templates.find((t) => t.id === templateId);
  return template?.name || templateId;
};

const getRiskBadgeClass = (risk: AtsTemplateRisk): string => {
  if (risk === 'low') return 'bg-emerald-100 text-emerald-800 border-emerald-200';
  if (risk === 'medium') return 'bg-amber-100 text-amber-800 border-amber-200';
  return 'bg-red-100 text-red-800 border-red-200';
};

export const TemplatesPanel = ({
  selectedTemplate,
  onSelectTemplate,
  resume,
}: TemplatesPanelProps) => {
  const analysis = useMemo(
    () => analyzeResumeForAts(resume, selectedTemplate),
    [resume, selectedTemplate]
  );
  const topFindings = analysis.findings.slice(0, 3);
  const mappedSections = analysis.autofillMap.filter(
    (mapping) => mapping.canonicalType !== 'custom'
  );

  return (
    <div className="h-full overflow-y-auto p-6 bg-background">
      <div className="mb-6">
        <h2 className="text-lg font-semibold">Templates</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Select a template - your content will update live
        </p>
      </div>

      <section
        className="mb-6 rounded-lg border bg-card p-4 text-card-foreground shadow-sm"
        aria-label="ATS readiness analysis"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold">
              <ShieldCheck className="h-4 w-4 text-primary" aria-hidden="true" />
              ATS Readiness
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {analysis.templateProfile.summary}
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold">{analysis.score}</div>
            <div className="text-xs text-muted-foreground">{analysis.grade}</div>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <span
            className={cn(
              'rounded-full border px-2 py-1 text-xs font-medium capitalize',
              getRiskBadgeClass(analysis.templateProfile.risk)
            )}
          >
            {analysis.templateProfile.risk} template risk
          </span>
          {mappedSections.slice(0, 3).map((mapping) => (
            <span
              key={mapping.sectionId}
              className="rounded-full border bg-muted px-2 py-1 text-xs text-muted-foreground"
            >
              {mapping.sectionName} to {mapping.canonicalType}
            </span>
          ))}
        </div>

        {topFindings.length > 0 && (
          <div className="mt-4 space-y-2">
            {topFindings.map((finding) => (
              <div key={finding.id} className="flex gap-2 text-xs">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" aria-hidden="true" />
                <div>
                  <div className="font-medium">{finding.title}</div>
                  <div className="text-muted-foreground">{finding.description}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="grid grid-cols-1 gap-3">
        {templates.map((template) => {
          const templateProfile = getTemplateAtsProfile(template.id);

          return (
            <button
              key={template.id}
              onClick={() => onSelectTemplate(template.id)}
              className={cn(
                'group relative flex rounded-lg border-2 overflow-hidden transition-all',
                'hover:border-primary hover:shadow-md',
                selectedTemplate === template.id
                  ? 'border-primary ring-2 ring-primary ring-offset-2 ring-offset-background'
                  : 'border-border'
              )}
              aria-label={`Select ${template.name} template`}
              aria-pressed={selectedTemplate === template.id}
            >
              {/* Template Preview Thumbnail */}
              <div
                className={cn(
                  'w-20 h-24 shrink-0',
                  template.previewColor
                )}
              >
                {/* Placeholder preview */}
                <div className="h-full w-full p-1.5 flex flex-col gap-0.5">
                  <div className="h-1.5 w-3/4 mx-auto bg-current opacity-60 rounded" />
                  <div className="h-1 w-1/2 mx-auto bg-current opacity-40 rounded" />
                  <div className="mt-1 space-y-0.5">
                    <div className="h-0.5 w-1/3 bg-current opacity-50 rounded" />
                    <div className="h-0.5 w-full bg-current opacity-30 rounded" />
                    <div className="h-0.5 w-5/6 bg-current opacity-30 rounded" />
                  </div>
                  <div className="mt-0.5 space-y-0.5">
                    <div className="h-0.5 w-1/3 bg-current opacity-50 rounded" />
                    <div className="h-0.5 w-full bg-current opacity-30 rounded" />
                    <div className="h-0.5 w-3/4 bg-current opacity-30 rounded" />
                  </div>
                </div>
              </div>

              {/* Template Info */}
              <div className="flex-1 p-3 flex items-center justify-between bg-card">
                <div className="text-left">
                  <div className="font-medium text-sm">{template.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {template.description}
                  </div>
                  <div
                    className={cn(
                      'mt-2 inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium capitalize',
                      getRiskBadgeClass(templateProfile.risk)
                    )}
                  >
                    {templateProfile.risk} ATS risk
                  </div>
                </div>
                {selectedTemplate === template.id && (
                  <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center shrink-0">
                    <Check className="h-3 w-3 text-primary-foreground" aria-hidden="true" />
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
