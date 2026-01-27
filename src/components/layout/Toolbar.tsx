'use client';

import { useRef } from 'react';
import Image from 'next/image';
import {
  Download,
  Upload,
  FileJson,
  Trash2,
  FileCode,
  FileDown,
} from 'lucide-react';
import { SignedIn, SignedOut, SignInButton } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import { UserProfileButton } from './UserProfileButton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface ToolbarProps {
  onExportJson: () => void;
  onExportLatex: () => void;
  onDownloadPdf: () => void;
  onImport: (file: File) => void;
  onClearAll: () => void;
  isPdfReady: boolean;
}

export const Toolbar = ({
  onExportJson,
  onExportLatex,
  onDownloadPdf,
  onImport,
  onClearAll,
  isPdfReady,
}: ToolbarProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImport(file);
      // Reset the input so the same file can be selected again
      e.target.value = '';
    }
  };

  return (
    <header className="flex items-center justify-between px-6 py-3 border-b bg-background">
      <div className="flex items-center gap-3">
        <Image
          src="/branding.svg"
          alt="ResumEase Logo"
          width={40}
          height={28}
          className="shrink-0"
          priority
        />
        <div className="flex flex-col">
          <h1 className="text-xl font-bold">ResumEase</h1>
          <span className="text-xs text-muted-foreground">Latex-based resume with ease.</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Export Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" aria-label="Export options">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuItem
              onClick={onDownloadPdf}
              disabled={!isPdfReady}
              className="cursor-pointer flex flex-col items-start gap-1"
              aria-label="Download PDF"
            >
              <div className="flex items-center">
                <FileDown className="h-4 w-4 mr-2" />
                <span>Download PDF</span>
              </div>
              <span className="text-xs text-muted-foreground ml-6">
                Download your compiled resume
              </span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={onExportJson}
              className="cursor-pointer flex flex-col items-start gap-1"
              aria-label="Export as JSON"
            >
              <div className="flex items-center">
                <FileJson className="h-4 w-4 mr-2" />
                <span>Export JSON</span>
              </div>
              <span className="text-xs text-muted-foreground ml-6">
                Save your resume data for backup or transfer
              </span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={onExportLatex}
              className="cursor-pointer flex flex-col items-start gap-1"
              aria-label="Export as LaTeX"
            >
              <div className="flex items-center">
                <FileCode className="h-4 w-4 mr-2" />
                <span>Export LaTeX Source</span>
              </div>
              <span className="text-xs text-muted-foreground ml-6">
                Download .tex file for manual compilation
              </span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Import Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={handleImportClick}
          aria-label="Import JSON"
        >
          <Upload className="h-4 w-4 mr-2" />
          Import JSON
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleFileChange}
          className="hidden"
          aria-hidden="true"
        />

        {/* Clear All with Confirmation Dialog */}
        <Dialog>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="text-destructive hover:text-destructive"
              aria-label="Clear all data"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Clear All
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Clear All Data?</DialogTitle>
              <DialogDescription>
                This will permanently delete your resume data. This action cannot
                be undone. Consider exporting a backup first.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" type="button">
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={onClearAll}
                type="button"
              >
                Clear All
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Auth Section */}
        <SignedOut>
          <SignInButton mode="modal">
            <Button variant="default" size="sm" aria-label="Sign in">
              Sign In
            </Button>
          </SignInButton>
        </SignedOut>
        <SignedIn>
          <UserProfileButton />
        </SignedIn>
      </div>
    </header>
  );
};
