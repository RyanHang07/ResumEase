'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

interface SplitPaneProps {
  left: React.ReactNode;
  right: React.ReactNode;
  defaultLeftWidth?: number;
  minLeftWidth?: number;
  maxLeftWidth?: number;
}

export const SplitPane = ({
  left,
  right,
  defaultLeftWidth = 40,
  minLeftWidth = 25,
  maxLeftWidth = 60,
}: SplitPaneProps) => {
  const [leftWidth, setLeftWidth] = useState(defaultLeftWidth);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging || !containerRef.current) return;

      const containerRect = containerRef.current.getBoundingClientRect();
      const newWidth =
        ((e.clientX - containerRect.left) / containerRect.width) * 100;

      if (newWidth >= minLeftWidth && newWidth <= maxLeftWidth) {
        setLeftWidth(newWidth);
      }
    },
    [isDragging, minLeftWidth, maxLeftWidth]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  return (
    <div
      ref={containerRef}
      className="flex flex-1 overflow-hidden"
    >
      {/* Left Panel */}
      <div
        className="overflow-hidden border-r"
        style={{ width: `${leftWidth}%` }}
      >
        {left}
      </div>

      {/* Resizable Divider */}
      <div
        className={cn(
          'w-1 cursor-col-resize bg-border hover:bg-primary/50 transition-colors shrink-0',
          isDragging && 'bg-primary'
        )}
        onMouseDown={handleMouseDown}
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize panels"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'ArrowLeft') {
            setLeftWidth((prev) => Math.max(minLeftWidth, prev - 1));
          } else if (e.key === 'ArrowRight') {
            setLeftWidth((prev) => Math.min(maxLeftWidth, prev + 1));
          }
        }}
      />

      {/* Right Panel */}
      <div
        className="overflow-hidden flex-1"
        style={{ width: `${100 - leftWidth}%` }}
      >
        {right}
      </div>
    </div>
  );
};

// Mobile-responsive version that stacks vertically
export const ResponsiveSplitPane = ({
  left,
  right,
  defaultLeftWidth = 40,
  minLeftWidth = 25,
  maxLeftWidth = 60,
}: SplitPaneProps) => {
  return (
    <>
      {/* Desktop: Side by side */}
      <div className="hidden md:flex flex-1 overflow-hidden">
        <SplitPane
          left={left}
          right={right}
          defaultLeftWidth={defaultLeftWidth}
          minLeftWidth={minLeftWidth}
          maxLeftWidth={maxLeftWidth}
        />
      </div>

      {/* Mobile: Stacked vertically */}
      <div className="flex md:hidden flex-col flex-1 overflow-hidden">
        <div className="flex-1 overflow-y-auto border-b">{left}</div>
        <div className="flex-1 overflow-hidden">{right}</div>
      </div>
    </>
  );
};
