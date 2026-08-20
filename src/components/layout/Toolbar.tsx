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
  FileText,
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
  DialogClose,
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
  onExportDocx: () => void;
  onDownloadPdf: () => void;
  onImport: (file: File) => void;
  onClearAll: () => void;
  isPdfReady: boolean;
  isDocxExporting?: boolean;
}

export const Toolbar = ({
  onExportJson,
  onExportLatex,
  onExportDocx,
  onDownloadPdf,
  onImport,
  onClearAll,
  isPdfReady,
  isDocxExporting = false,
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
    <header className="flex flex-wrap items-center justify-between gap-3 border-b bg-background px-3 py-3 sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <Image
          src="/branding.svg"
          alt="ResumEase Logo"
          width={40}
          height={28}
          className="shrink-0"
          priority
        />
        <div className="flex min-w-0 flex-col">
          <h1 className="truncate text-lg font-bold sm:text-xl">ResumEase</h1>
          <span className="hidden text-xs text-muted-foreground sm:inline">
            Latex-based resume with ease.
          </span>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2">
        {/* Export Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" aria-label="Export options" data-testid="export-menu">
              <Download className="h-4 w-4 sm:mr-2" aria-hidden="true" />
              <span className="hidden sm:inline">Export</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuItem
              onClick={onDownloadPdf}
              disabled={!isPdfReady}
              className="cursor-pointer flex flex-col items-start gap-1"
              aria-label="Download PDF"
              data-testid="download-pdf"
            >
              <div className="flex items-center">
                <FileDown className="h-4 w-4 mr-2" aria-hidden="true" />
                <span>Download PDF</span>
              </div>
              <span className="text-xs text-muted-foreground ml-6">
                Download your compiled resume
              </span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={onExportDocx}
              disabled={isDocxExporting}
              className="cursor-pointer flex flex-col items-start gap-1"
              aria-label="Export as DOCX"
            >
              <div className="flex items-center">
                <FileText className="h-4 w-4 mr-2" aria-hidden="true" />
                <span>{isDocxExporting ? 'Exporting…' : 'Export DOCX'}</span>
              </div>
              <span className="text-xs text-muted-foreground ml-6">
                Download as Word document
              </span>
              <span className="text-xs text-destructive ml-6 mt-1 block">
                The .docx uses a Compact-style layout only; template selection affects the PDF only.
              </span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={onExportJson}
              className="cursor-pointer flex flex-col items-start gap-1"
              aria-label="Export as JSON"
            >
              <div className="flex items-center">
                <FileJson className="h-4 w-4 mr-2" aria-hidden="true" />
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
                <FileCode className="h-4 w-4 mr-2" aria-hidden="true" />
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
          <Upload className="h-4 w-4 sm:mr-2" aria-hidden="true" />
          <span className="hidden sm:inline">Import JSON</span>
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
              <Trash2 className="h-4 w-4 sm:mr-2" aria-hidden="true" />
              <span className="hidden sm:inline">Clear All</span>
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
              <DialogClose asChild>
                <Button variant="outline" type="button">
                  Cancel
                </Button>
              </DialogClose>
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
              <span className="hidden sm:inline">Sign In</span>
              <span className="sm:hidden">Sign In</span>
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
