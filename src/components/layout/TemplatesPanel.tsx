'use client';

import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Template {
  id: string;
  name: string;
  description: string;
  previewColor: string;
}

interface TemplatesPanelProps {
  selectedTemplate: string;
  onSelectTemplate: (templateId: string) => void;
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
    id: 'academic',
    name: 'Academic CV',
    description: 'Traditional serif font for academia',
    previewColor: 'bg-gradient-to-b from-red-400 to-red-800 text-white',
  },
];

export const getTemplateName = (templateId: string): string => {
  const template = templates.find((t) => t.id === templateId);
  return template?.name || templateId;
};

export const TemplatesPanel = ({
  selectedTemplate,
  onSelectTemplate,
}: TemplatesPanelProps) => {
  return (
    <div className="h-full overflow-y-auto p-6 bg-background">
      <div className="mb-6">
        <h2 className="text-lg font-semibold">Templates</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Select a template — your content will update live
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {templates.map((template) => (
          <button
            key={template.id}
            type="button"
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
            tabIndex={0}
          >
            <div className={cn('w-20 h-24 shrink-0', template.previewColor)}>
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

            <div className="flex-1 p-3 flex items-center justify-between bg-card">
              <div className="text-left">
                <div className="font-medium text-sm">{template.name}</div>
                <div className="text-xs text-muted-foreground">{template.description}</div>
              </div>
              {selectedTemplate === template.id && (
                <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center shrink-0">
                  <Check className="h-3 w-3 text-primary-foreground" aria-hidden="true" />
                </div>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
