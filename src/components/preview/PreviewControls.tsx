'use client';

import { ZoomIn, ZoomOut, Maximize2, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PreviewControlsProps {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitWidth: () => void;
  onRecompile: () => void;
  isCompiling: boolean;
  lastSaved?: Date | null;
  isSaving?: boolean;
}

const formatLastSaved = (date: Date): string => {
  const now = new Date();
  const diff = now.getTime() - new Date(date).getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (seconds < 60) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return new Date(date).toLocaleDateString();
};

export const PreviewControls = ({
  zoom,
  onZoomIn,
  onZoomOut,
  onFitWidth,
  onRecompile,
  isCompiling,
  lastSaved,
  isSaving,
}: PreviewControlsProps) => {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-muted/30 px-3 py-2 sm:px-4">
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={onZoomOut}
          disabled={zoom <= 50}
          className="h-8 w-8"
          aria-label="Zoom out"
          tabIndex={0}
        >
          <ZoomOut className="h-4 w-4" aria-hidden="true" />
        </Button>

        <span className="text-sm font-medium w-14 text-center">
          {Math.round(zoom)}%
        </span>

        <Button
          variant="ghost"
          size="icon"
          onClick={onZoomIn}
          disabled={zoom >= 200}
          className="h-8 w-8"
          aria-label="Zoom in"
          tabIndex={0}
        >
          <ZoomIn className="h-4 w-4" aria-hidden="true" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={onFitWidth}
          className="h-8 w-8"
          aria-label="Fit to width"
          tabIndex={0}
        >
          <Maximize2 className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
        {isCompiling && (
          <div
            className="flex items-center gap-2 text-sm text-muted-foreground"
            role="status"
            aria-live="polite"
          >
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            <span className="hidden sm:inline">Compiling...</span>
            <span className="sr-only sm:hidden">Compiling resume preview</span>
          </div>
        )}

        {lastSaved && !isCompiling && (
          <span
            className="hidden text-sm text-muted-foreground sm:inline"
            role="status"
            aria-live="polite"
          >
            {isSaving ? 'Saving...' : `Saved ${formatLastSaved(lastSaved)}`}
          </span>
        )}

        <Button
          variant="default"
          size="sm"
          onClick={onRecompile}
          disabled={isCompiling}
          className="h-8 px-3 bg-primary hover:bg-primary/90 text-primary-foreground"
          aria-label="Recompile"
          tabIndex={0}
        >
          <RefreshCw
            className={`h-4 w-4 sm:mr-2 ${isCompiling ? 'animate-spin' : ''}`}
            aria-hidden="true"
          />
          <span className="hidden sm:inline">
            {isCompiling ? 'Compiling...' : 'Recompile'}
          </span>
        </Button>
      </div>
    </div>
  );
};
