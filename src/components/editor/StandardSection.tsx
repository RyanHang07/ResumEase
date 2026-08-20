'use client';

import { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, ChevronDown, ChevronUp, Trash2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import {
  StandardSection as StandardSectionType,
  StandardEntry as StandardEntryType,
  createDefaultStandardEntry,
} from '@/types/resume';
import { StandardEntry } from './StandardEntry';

interface StandardSectionProps {
  section: StandardSectionType;
  onUpdate: (data: Partial<StandardSectionType>) => void;
  onRemove: () => void;
}

export const StandardSection = ({
  section,
  onUpdate,
  onRemove,
}: StandardSectionProps) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const contentId = `standard-section-content-${section.id}`;

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: section.id });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleAddEntry = () => {
    const newEntry = createDefaultStandardEntry();
    onUpdate({ entries: [...section.entries, newEntry] });
  };

  const handleUpdateEntry = (
    entryId: string,
    data: Partial<StandardEntryType>
  ) => {
    onUpdate({
      entries: section.entries.map((entry) =>
        entry.id === entryId ? { ...entry, ...data } : entry
      ),
    });
  };

  const handleRemoveEntry = (entryId: string) => {
    const entries = section.entries ?? [];
    const index = entries.findIndex((entry) => entry.id === entryId);
    const focusTargetId =
      index > 0 ? entries[index - 1].id : entries[index + 1]?.id ?? null;

    onUpdate({
      entries: entries.filter((entry) => entry.id !== entryId),
    });

    if (!focusTargetId) return;
    const el = document.getElementById(`primary-${focusTargetId}`);
    if (el instanceof HTMLInputElement) {
      el.focus();
    }
  };

  const handleNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      setIsEditingName(false);
    }
  };

  return (
    <Card ref={setNodeRef} style={style} className="gap-0 overflow-hidden py-0">
      <CardHeader className="flex flex-row items-center gap-2 px-3 py-2 bg-muted/50">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing touch-none rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          aria-label={`Drag to reorder ${section.sectionName || 'section'}`}
          tabIndex={0}
          suppressHydrationWarning
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        </button>

        {isEditingName ? (
          <Input
            value={section.sectionName}
            onChange={(e) => onUpdate({ sectionName: e.target.value })}
            onBlur={() => setIsEditingName(false)}
            onKeyDown={handleNameKeyDown}
            className="flex-1 h-8"
            autoFocus
            aria-label="Section name"
            tabIndex={0}
          />
        ) : (
          <h3
            className="flex-1 font-semibold text-base cursor-pointer hover:text-primary transition-colors"
            onClick={() => setIsEditingName(true)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setIsEditingName(true);
              }
            }}
            role="button"
            tabIndex={0}
            aria-label={`Edit section name: ${section.sectionName || 'Untitled Section'}`}
          >
            {section.sectionName || 'Untitled Section'}
          </h3>
        )}

        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="h-8 w-8"
          aria-label={isCollapsed ? 'Expand section' : 'Collapse section'}
          aria-expanded={!isCollapsed}
          aria-controls={contentId}
          tabIndex={0}
        >
          {isCollapsed ? (
            <ChevronDown className="h-4 w-4" aria-hidden="true" />
          ) : (
            <ChevronUp className="h-4 w-4" aria-hidden="true" />
          )}
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={onRemove}
          className="h-8 w-8 text-muted-foreground hover:text-destructive"
          aria-label="Delete section"
          tabIndex={0}
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" />
        </Button>
      </CardHeader>

      {!isCollapsed && (
        <CardContent id={contentId} className="p-3 space-y-3">
          {(section.entries ?? []).map((entry, index) => (
            <StandardEntry
              key={entry.id}
              entry={entry}
              sectionName={section.sectionName}
              onUpdate={(data) => handleUpdateEntry(entry.id, data)}
              onRemove={() => handleRemoveEntry(entry.id)}
              entryIndex={index}
            />
          ))}

          <Button
            onClick={handleAddEntry}
            variant="outline"
            size="sm"
            className="w-full"
            aria-label="Add new entry"
            tabIndex={0}
          >
            <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
            Add Entry
          </Button>
        </CardContent>
      )}
    </Card>
  );
};
