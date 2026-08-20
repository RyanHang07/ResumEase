'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Trash2, Plus } from 'lucide-react';
import { StandardEntry as StandardEntryType } from '@/types/resume';
import { BulletPointInput } from './BulletPointInput';
import { normalizeSectionName } from '@/lib/templates/shared';
import { getEntryLinkUrl } from '@/lib/resumeDisplay';

interface StandardEntryProps {
  entry: StandardEntryType;
  sectionName: string;
  onUpdate: (data: Partial<StandardEntryType>) => void;
  onRemove: () => void;
  entryIndex: number;
}

const splitList = (value: string): string[] =>
  value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

export const StandardEntry = ({
  entry,
  sectionName,
  onUpdate,
  onRemove,
  entryIndex,
}: StandardEntryProps) => {
  const canonicalType = normalizeSectionName(sectionName);
  const isProject = canonicalType === 'projects';
  const isEducation = canonicalType === 'education';
  const isExperience = canonicalType === 'experience';
  const primaryId = `primary-${entry.id}`;
  const endIsPresent = entry.dates?.end === 'present';
  const linkUrl = getEntryLinkUrl(entry);
  // ponytail: draft avoids comma-split wiping the trailing token while typing
  const [courseworkDraft, setCourseworkDraft] = useState<string | null>(null);
  const courseworkValue =
    courseworkDraft ?? (entry.coursework ?? []).join(', ');

  const handleAddBulletPoint = () => {
    onUpdate({ bulletPoints: [...entry.bulletPoints, ''] });
  };

  const handleUpdateBulletPoint = (index: number, value: string) => {
    const updated = [...entry.bulletPoints];
    updated[index] = value;
    onUpdate({ bulletPoints: updated });
  };

  const handleRemoveBulletPoint = (index: number) => {
    onUpdate({
      bulletPoints: entry.bulletPoints.filter((_, i) => i !== index),
    });
  };

  const handlePrimaryChange = (value: string) => {
    if (isProject) {
      onUpdate({ title: value, organization: '' });
      return;
    }
    onUpdate({ organization: value, title: '' });
  };

  const primaryValue = isProject
    ? entry.title
    : entry.organization || entry.title;

  const primaryLabel = isEducation
    ? 'School'
    : isExperience
      ? 'Organization'
      : isProject
        ? 'Project name'
        : 'Title';

  const secondaryLabel = isEducation
    ? 'Degree'
    : isExperience
      ? 'Role'
      : 'Subtitle';

  return (
    <fieldset className="space-y-2 rounded-lg border bg-muted/30 px-3 pb-3 pt-1">
      <legend className="text-base font-semibold text-foreground">
        Entry {entryIndex + 1}
      </legend>

      <div className="space-y-2">
        <div className="space-y-1">
          <Label htmlFor={primaryId}>{primaryLabel}</Label>
          <Input
            id={primaryId}
            value={primaryValue}
            onChange={(e) => handlePrimaryChange(e.target.value)}
            placeholder={isProject ? 'Campus Course Planner' : 'Acme Corp'}
            className="h-8"
            tabIndex={0}
          />
        </div>

        {!isProject && (
          <div className="space-y-1">
            <Label htmlFor={`role-${entry.id}`}>{secondaryLabel}</Label>
            <Input
              id={`role-${entry.id}`}
              value={entry.role || ''}
              onChange={(e) => onUpdate({ role: e.target.value })}
              placeholder={isEducation ? 'B.S. Computer Science' : 'Software Engineering Intern'}
              className="h-8"
              tabIndex={0}
            />
          </div>
        )}

        {isExperience && (
          <div className="space-y-1">
            <Label htmlFor={`location-${entry.id}`}>Location</Label>
            <Input
              id={`location-${entry.id}`}
              value={entry.location || ''}
              onChange={(e) => onUpdate({ location: e.target.value })}
              placeholder="San Jose, CA"
              className="h-8"
              tabIndex={0}
            />
          </div>
        )}

        {isProject && (
          <div className="space-y-1">
            <Label htmlFor={`stack-${entry.id}`}>Tech stack</Label>
            <Input
              id={`stack-${entry.id}`}
              value={(entry.techStack ?? []).join(', ')}
              onChange={(e) => onUpdate({ techStack: splitList(e.target.value) })}
              placeholder="Next.js, PostgreSQL, Tailwind CSS"
              className="h-8"
              tabIndex={0}
            />
          </div>
        )}

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor={`start-${entry.id}`}>Start</Label>
            <Input
              id={`start-${entry.id}`}
              type="month"
              value={entry.dates?.start || ''}
              onChange={(e) =>
                onUpdate({
                  dates: { ...entry.dates, start: e.target.value || undefined },
                })
              }
              className="h-8"
              tabIndex={0}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor={`end-${entry.id}`}>End</Label>
            <Input
              id={`end-${entry.id}`}
              type="month"
              value={endIsPresent ? '' : entry.dates?.end || ''}
              onChange={(e) =>
                onUpdate({
                  dates: { ...entry.dates, end: e.target.value || undefined },
                })
              }
              disabled={endIsPresent}
              className="h-8"
              tabIndex={0}
            />
            <div className="flex items-center space-x-2">
              <Checkbox
                id={`present-${entry.id}`}
                checked={endIsPresent}
                onCheckedChange={(checked) =>
                  onUpdate({
                    dates: {
                      ...entry.dates,
                      end: checked ? 'present' : undefined,
                    },
                  })
                }
                aria-label="Currently ongoing"
                tabIndex={0}
              />
              <Label htmlFor={`present-${entry.id}`} className="cursor-pointer text-sm">
                Present
              </Label>
            </div>
          </div>
        </div>

        {!isEducation && (
          <div className="space-y-1">
            <Label htmlFor={`link-${entry.id}`}>Link</Label>
            <Input
              id={`link-${entry.id}`}
              type="url"
              value={linkUrl}
              onChange={(e) => {
                const url = e.target.value.trim();
                onUpdate({
                  links: url ? [{ label: isProject ? 'repo' : 'other', url }] : [],
                });
              }}
              placeholder="https://github.com/you/project"
              className="h-8"
              tabIndex={0}
            />
          </div>
        )}

        {isEducation && (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor={`grad-${entry.id}`}>Expected graduation</Label>
              <Input
                id={`grad-${entry.id}`}
                type="month"
                value={entry.expectedGraduation || ''}
                onChange={(e) =>
                  onUpdate({ expectedGraduation: e.target.value || undefined })
                }
                className="h-8"
                tabIndex={0}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor={`gpa-${entry.id}`}>GPA (optional)</Label>
              <Input
                id={`gpa-${entry.id}`}
                type="number"
                inputMode="decimal"
                min={0}
                max={4}
                step={0.01}
                value={entry.gpa ?? ''}
                onChange={(e) => {
                  const next = e.target.value;
                  onUpdate({
                    gpa:
                      next === ''
                        ? undefined
                        : Math.min(4, Math.max(0, Number(next))),
                  });
                }}
                placeholder="3.8"
                className="h-8"
                tabIndex={0}
              />
            </div>
          </div>
        )}

        {isEducation && (
          <div className="space-y-1">
            <Label htmlFor={`coursework-${entry.id}`}>Coursework</Label>
            <Textarea
              id={`coursework-${entry.id}`}
              value={courseworkValue}
              onChange={(e) => setCourseworkDraft(e.target.value)}
              onBlur={() => {
                onUpdate({ coursework: splitList(courseworkValue) });
                setCourseworkDraft(null);
              }}
              placeholder="Data Structures, Algorithms, Databases"
              rows={2}
              className="min-h-12 resize-y"
              aria-label="Coursework list"
              tabIndex={0}
            />
            <p className="text-xs text-muted-foreground">
              Comma-separated. Shown on the PDF under this school.
            </p>
          </div>
        )}

        <div className="space-y-1">
          <Label>Bullet Points</Label>
          <div className="space-y-1.5">
            {entry.bulletPoints.length === 0 ? (
              <p className="text-xs text-muted-foreground">No bullet points yet.</p>
            ) : (
              entry.bulletPoints.map((bullet, index) => (
                <BulletPointInput
                  key={index}
                  value={bullet}
                  onChange={(value) => handleUpdateBulletPoint(index, value)}
                  onRemove={() => handleRemoveBulletPoint(index)}
                  canRemove
                  index={index}
                />
              ))
            )}
          </div>
          <div className="flex flex-row items-center justify-between">
            <Button
              onClick={handleAddBulletPoint}
              variant="outline"
              size="sm"
              aria-label="Add bullet point"
              tabIndex={0}
            >
              <Plus className="h-4 w-4 mr-1" aria-hidden="true" />
              Add Bullet Point
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onRemove}
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
              aria-label={`Remove entry ${entryIndex + 1}`}
              tabIndex={0}
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        </div>
      </div>
    </fieldset>
  );
};
