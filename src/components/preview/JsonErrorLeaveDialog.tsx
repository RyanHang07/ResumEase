'use client';

import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface JsonErrorLeaveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export const JsonErrorLeaveDialog = ({
  open,
  onOpenChange,
  onConfirm,
}: JsonErrorLeaveDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" aria-hidden="true" />
            <DialogTitle>Are you sure you want to leave?</DialogTitle>
          </div>
          <DialogDescription>
            Are you sure you want to leave with existing errors? Changes
            including errors will not be saved.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Stay on JSON
          </Button>
          <Button type="button" variant="destructive" onClick={onConfirm}>
            Leave anyway
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
