'use client';

import { useState, useEffect } from 'react';
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
  const [pendingFocusEntryId, setPendingFocusEntryId] = useState<string | null>(null);

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

    if (focusTargetId) setPendingFocusEntryId(focusTargetId);
  };

  const handleNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      setIsEditingName(false);
    }
  };

  useEffect(() => {
    if (!pendingFocusEntryId) return;
    const el = document.getElementById(`title-${pendingFocusEntryId}`);
    if (el && el instanceof HTMLInputElement) {
      el.focus();
    }
    setPendingFocusEntryId(null);
  }, [pendingFocusEntryId]);

  return (
    <Card ref={setNodeRef} style={style} className="overflow-hidden">
      <CardHeader className="flex flex-row items-center gap-2 p-4 bg-muted/50">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing touch-none"
          aria-label="Drag to reorder section"
          tabIndex={0}
          suppressHydrationWarning
        >
          <GripVertical className="h-5 w-5 text-muted-foreground" />
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
            className="flex-1 font-semibold text-lg cursor-pointer hover:text-primary transition-colors"
            onClick={() => setIsEditingName(true)}
            onKeyDown={(e) => e.key === 'Enter' && setIsEditingName(true)}
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
          tabIndex={0}
        >
          {isCollapsed ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronUp className="h-4 w-4" />
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
          <Trash2 className="h-4 w-4" />
        </Button>
      </CardHeader>

      {!isCollapsed && (
        <CardContent className="p-4 space-y-4">
          {(section.entries ?? []).map((entry, index) => (
            <StandardEntry
              key={entry.id}
              entry={entry}
              onUpdate={(data) => handleUpdateEntry(entry.id, data)}
              onRemove={() => handleRemoveEntry(entry.id)}
              entryIndex={index}
            />
          ))}

          <Button
            onClick={handleAddEntry}
            variant="outline"
            className="w-full"
            aria-label="Add new entry"
            tabIndex={0}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Entry
          </Button>
        </CardContent>
      )}
    </Card>
  );
};
