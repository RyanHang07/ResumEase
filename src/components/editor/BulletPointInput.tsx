'use client';

import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

interface BulletPointInputProps {
  value: string;
  onChange: (value: string) => void;
  onRemove: () => void;
  canRemove: boolean;
  index: number;
}

export const BulletPointInput = ({
  value,
  onChange,
  onRemove,
  canRemove,
  index,
}: BulletPointInputProps) => {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Backspace' && value === '' && canRemove) {
      e.preventDefault();
      onRemove();
    }
  };

  return (
    <div className="flex gap-2 items-start">
      <div className="flex items-center pt-2 text-muted-foreground">
        <span className="text-sm">•</span>
      </div>
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Describe your achievement or responsibility..."
        className="flex-1 min-h-[60px] resize-none"
        rows={2}
        aria-label={`Bullet point ${index + 1}`}
        tabIndex={0}
      />
      <Button
        variant="ghost"
        size="icon"
        onClick={onRemove}
        disabled={!canRemove}
        className="h-8 w-8 text-muted-foreground hover:text-destructive"
        aria-label={`Remove bullet point ${index + 1}`}
        tabIndex={0}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
};
