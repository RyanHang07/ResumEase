'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { X, Plus } from 'lucide-react';
import { StandardEntry as StandardEntryType } from '@/types/resume';
import { BulletPointInput } from './BulletPointInput';

interface StandardEntryProps {
  entry: StandardEntryType;
  onUpdate: (data: Partial<StandardEntryType>) => void;
  onRemove: () => void;
  entryIndex: number;
}

export const StandardEntry = ({
  entry,
  onUpdate,
  onRemove,
  entryIndex,
}: StandardEntryProps) => {
  const handleAddBulletPoint = () => {
    onUpdate({ bulletPoints: [...entry.bulletPoints, ''] });
  };

  const handleUpdateBulletPoint = (index: number, value: string) => {
    const updated = [...entry.bulletPoints];
    updated[index] = value;
    onUpdate({ bulletPoints: updated });
  };

  const handleRemoveBulletPoint = (index: number) => {
    if (entry.bulletPoints.length <= 1) return;
    onUpdate({
      bulletPoints: entry.bulletPoints.filter((_, i) => i !== index),
    });
  };

  return (
    <div className="p-4 border rounded-lg space-y-4 bg-muted/30">
      <div className="flex justify-between items-start gap-2">
        <span className="text-sm font-medium text-muted-foreground">
          Entry {entryIndex + 1}
        </span>
        <Button
          variant="ghost"
          size="icon"
          onClick={onRemove}
          className="h-8 w-8 text-muted-foreground hover:text-destructive"
          aria-label={`Remove entry ${entryIndex + 1}`}
          tabIndex={0}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-3">
        <div className="space-y-2">
          <Label htmlFor={`title-${entry.id}`}>Title</Label>
          <Input
            id={`title-${entry.id}`}
            value={entry.title}
            onChange={(e) => onUpdate({ title: e.target.value })}
            placeholder="e.g., Software Engineer, Project Name"
            aria-label="Entry title"
            tabIndex={0}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor={`org-${entry.id}`}>Organization / Location</Label>
          <Input
            id={`org-${entry.id}`}
            value={entry.organization || ''}
            onChange={(e) => onUpdate({ organization: e.target.value })}
            placeholder="e.g., Google Inc., Personal Project"
            aria-label="Organization or location"
            tabIndex={0}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor={`date-${entry.id}`}>Date Range</Label>
          <Input
            id={`date-${entry.id}`}
            value={entry.dateRange || ''}
            onChange={(e) => onUpdate({ dateRange: e.target.value })}
            placeholder="e.g., Jan 2023 - Present"
            aria-label="Date range"
            tabIndex={0}
          />
        </div>

        <div className="space-y-2">
          <Label>Bullet Points</Label>
          <div className="space-y-2">
            {entry.bulletPoints.map((bullet, index) => (
              <BulletPointInput
                key={index}
                value={bullet}
                onChange={(value) => handleUpdateBulletPoint(index, value)}
                onRemove={() => handleRemoveBulletPoint(index)}
                canRemove={entry.bulletPoints.length > 1}
                index={index}
              />
            ))}
          </div>
          <Button
            onClick={handleAddBulletPoint}
            variant="outline"
            size="sm"
            className="mt-2"
            aria-label="Add bullet point"
            tabIndex={0}
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Bullet Point
          </Button>
        </div>
      </div>
    </div>
  );
};
