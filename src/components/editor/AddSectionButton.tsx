'use client';

import { Plus, Briefcase, Code } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface AddSectionButtonProps {
  onAdd: (type: 'standard' | 'skills') => void;
}

export const AddSectionButton = ({ onAdd }: AddSectionButtonProps) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="w-full border-dashed border-2 h-12"
          aria-label="Add new section"
          tabIndex={0}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Section
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center" className="w-56">
        <DropdownMenuItem
          onClick={() => onAdd('standard')}
          className="cursor-pointer"
          aria-label="Add experience or project section"
          tabIndex={0}
        >
          <Briefcase className="h-4 w-4 mr-2" />
          Experience / Project Section
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => onAdd('skills')}
          className="cursor-pointer"
          aria-label="Add skills section"
          tabIndex={0}
        >
          <Code className="h-4 w-4 mr-2" />
          Skills Section
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
