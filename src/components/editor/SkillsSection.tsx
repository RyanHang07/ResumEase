'use client';

import { useState, useRef, useEffect } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, ChevronDown, ChevronUp, Trash2, X, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import {
  SkillsSection as SkillsSectionType,
  SkillCategory,
  createDefaultSkillCategory,
} from '@/types/resume';

interface SkillsSectionProps {
  section: SkillsSectionType;
  onUpdate: (data: Partial<SkillsSectionType>) => void;
  onRemove: () => void;
}

export const SkillsSection = ({
  section,
  onUpdate,
  onRemove,
}: SkillsSectionProps) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [focusedSkillsCategoryId, setFocusedSkillsCategoryId] = useState<string | null>(null);
  const [focusedSkillsValue, setFocusedSkillsValue] = useState('');
  const [pendingFocusCategoryId, setPendingFocusCategoryId] = useState<string | null>(null);
  const categoryInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

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

  const handleAddCategory = () => {
    const newCategory = createDefaultSkillCategory();
    onUpdate({ categories: [...section.categories, newCategory] });
  };

  const handleUpdateCategory = (
    categoryId: string,
    data: Partial<SkillCategory>
  ) => {
    onUpdate({
      categories: section.categories.map((cat) =>
        cat.id === categoryId ? { ...cat, ...data } : cat
      ),
    });
  };

  const handleRemoveCategory = (categoryId: string) => {
    const categories = section.categories ?? [];
    const index = categories.findIndex((cat) => cat.id === categoryId);
    const focusTargetId =
      index > 0
        ? categories[index - 1].id
        : categories[index + 1]?.id ?? null;

    onUpdate({
      categories: categories.filter((cat) => cat.id !== categoryId),
    });

    if (focusTargetId) setPendingFocusCategoryId(focusTargetId);
  };

  const handleSkillsFocus = (categoryId: string, currentSkills: string[]) => {
    setFocusedSkillsCategoryId(categoryId);
    setFocusedSkillsValue((currentSkills ?? []).join(', '));
  };

  const handleSkillsBlur = (categoryId: string) => {
    if (focusedSkillsCategoryId !== categoryId) return;
    const skills = focusedSkillsValue
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    handleUpdateCategory(categoryId, { skills });
    setFocusedSkillsCategoryId(null);
  };

  const getSkillsInputValue = (categoryId: string, skills: string[]) => {
    if (focusedSkillsCategoryId === categoryId) return focusedSkillsValue;
    return (skills ?? []).join(', ');
  };

  const handleNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      setIsEditingName(false);
    }
  };

  useEffect(() => {
    if (!pendingFocusCategoryId) return;
    const el = categoryInputRefs.current[pendingFocusCategoryId];
    if (el) {
      el.focus();
    }
    setPendingFocusCategoryId(null);
  }, [pendingFocusCategoryId]);

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
            aria-label={`Edit section name: ${section.sectionName || 'Skills'}`}
          >
            {section.sectionName || 'Skills'}
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
          {section.categories.map((category) => (
            <div
              key={category.id}
              className="p-4 border rounded-lg bg-muted/30 space-y-3"
            >
              <div className="flex gap-2 items-center">
                <Input
                  ref={(el) => {
                    categoryInputRefs.current[category.id] = el;
                  }}
                  value={category.categoryName ?? ''}
                  onChange={(e) =>
                    handleUpdateCategory(category.id, {
                      categoryName: e.target.value,
                    })
                  }
                  placeholder="e.g., Languages, Frameworks, Tools"
                  className="flex-1"
                  aria-label="Category name"
                  tabIndex={0}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemoveCategory(category.id)}
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  aria-label="Remove category"
                  tabIndex={0}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-2">
                <Label htmlFor={`skills-${category.id}`}>
                  Skills (comma-separated)
                </Label>
                <Input
                  id={`skills-${category.id}`}
                  value={getSkillsInputValue(category.id, category.skills)}
                  onChange={(e) => setFocusedSkillsValue(e.target.value)}
                  onFocus={() => handleSkillsFocus(category.id, category.skills)}
                  onBlur={() => handleSkillsBlur(category.id)}
                  placeholder="e.g., Python, JavaScript, React"
                  aria-label="Skills list"
                  tabIndex={0}
                />
              </div>
            </div>
          ))}

          <Button
            onClick={handleAddCategory}
            variant="outline"
            className="w-full"
            aria-label="Add new category"
            tabIndex={0}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Category
          </Button>
        </CardContent>
      )}
    </Card>
  );
};
