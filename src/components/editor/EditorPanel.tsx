'use client';

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { HeaderForm } from './HeaderForm';
import { StandardSection } from './StandardSection';
import { SkillsSection } from './SkillsSection';
import { AddSectionButton } from './AddSectionButton';
import { Resume, Header, Section } from '@/types/resume';
import { arrayMove } from '@/lib/utils';

interface EditorPanelProps {
  resume: Resume;
  onUpdateHeader: (header: Header) => void;
  onAddSection: (type: 'standard' | 'skills') => void;
  onUpdateSection: (sectionId: string, data: Partial<Section>) => void;
  onRemoveSection: (sectionId: string) => void;
  onReorderSections: (sections: Section[]) => void;
}

export const EditorPanel = ({
  resume,
  onUpdateHeader,
  onAddSection,
  onUpdateSection,
  onRemoveSection,
  onReorderSections,
}: EditorPanelProps) => {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = resume.sections.findIndex((s) => s.id === active.id);
      const newIndex = resume.sections.findIndex((s) => s.id === over.id);

      const reordered = arrayMove(resume.sections, oldIndex, newIndex).map(
        (section, idx) => ({ ...section, order: idx })
      );

      onReorderSections(reordered as Section[]);
    }
  };

  const sortedSections = [...resume.sections].sort((a, b) => a.order - b.order);

  return (
    <div className="h-full overflow-y-auto p-6 space-y-6 bg-background">
      {/* Header Section - Always First */}
      <HeaderForm header={resume.header} onChange={onUpdateHeader} />

      {/* Dynamic Sections with Drag & Drop */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={sortedSections.map((s) => s.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-4">
            {sortedSections.map((section) =>
              section.type === 'standard' ? (
                <StandardSection
                  key={section.id}
                  section={section}
                  onUpdate={(data) => onUpdateSection(section.id, data)}
                  onRemove={() => onRemoveSection(section.id)}
                />
              ) : (
                <SkillsSection
                  key={section.id}
                  section={section}
                  onUpdate={(data) => onUpdateSection(section.id, data)}
                  onRemove={() => onRemoveSection(section.id)}
                />
              )
            )}
          </div>
        </SortableContext>
      </DndContext>

      {/* Add Section Button */}
      <AddSectionButton onAdd={onAddSection} />
    </div>
  );
};
