'use client';

import { useState, useEffect, useCallback } from 'react';
import { Save, Trash2, Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SavedResume, Resume } from '@/types/resume';
import { useResumeStore } from '@/store/resumeStore';
import { getTemplateName } from '@/components/layout/TemplatesPanel';

interface SavedResumesPanelProps {
  onLoadResume: (resume: Resume, templateId: string) => void;
}

export const SavedResumesPanel = ({ onLoadResume }: SavedResumesPanelProps) => {
  const { resume, currentTemplate } = useResumeStore();
  const [savedResumes, setSavedResumes] = useState<SavedResume[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [deleteResumeId, setDeleteResumeId] = useState<string | null>(null);

  const fetchResumes = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/resumes');
      if (response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const data = await response.json();
          setSavedResumes(data.resumes || []);
        } else {
          // Clerk not configured - API returned HTML (redirect page)
          console.warn('Clerk not configured. Skipping resume fetch.');
          setSavedResumes([]);
        }
      } else {
        // Handle non-OK responses gracefully
        setSavedResumes([]);
      }
    } catch (error) {
      // Handle JSON parsing errors (e.g., when Clerk redirects to HTML page)
      if (error instanceof SyntaxError) {
        console.warn('Clerk not configured. Skipping resume fetch.');
        setSavedResumes([]);
      } else {
        console.error('Error fetching resumes:', error);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchResumes();
  }, [fetchResumes]);

  const handleSaveResume = useCallback(async () => {
    if (!saveName.trim()) {
      alert('Please enter a name for your resume');
      return;
    }

    try {
      setIsSaving(true);
      const response = await fetch('/api/resumes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: saveName.trim(),
          templateId: currentTemplate,
          data: resume,
        }),
      });

      if (response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          setSaveName('');
          setIsSaveDialogOpen(false);
          await fetchResumes();
        } else {
          alert('Clerk authentication not configured. Please configure Clerk to save resumes.');
        }
      } else {
        try {
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const error = await response.json();
            alert(error.error || 'Failed to save resume');
          } else {
            alert('Clerk authentication not configured. Please configure Clerk to save resumes.');
          }
        } catch (err) {
          alert('Failed to save resume. Please check your Clerk configuration.');
        }
      }
    } catch (error) {
      console.error('Error saving resume:', error);
      alert('Failed to save resume');
    } finally {
      setIsSaving(false);
    }
  }, [saveName, currentTemplate, resume, fetchResumes]);

  const handleLoadResume = useCallback(
    (savedResume: SavedResume) => {
      onLoadResume(savedResume.data, savedResume.templateId);
    },
    [onLoadResume]
  );

  const handleDeleteResume = useCallback(
    async (resumeId: string) => {
      try {
        const response = await fetch(`/api/resumes?id=${resumeId}`, {
          method: 'DELETE',
        });

        if (response.ok) {
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            setDeleteResumeId(null);
            await fetchResumes();
          } else {
            alert('Clerk authentication not configured. Please configure Clerk to delete resumes.');
          }
        } else {
          try {
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
              const error = await response.json();
              alert(error.error || 'Failed to delete resume');
            } else {
              alert('Clerk authentication not configured. Please configure Clerk to delete resumes.');
            }
          } catch (err) {
            alert('Failed to delete resume. Please check your Clerk configuration.');
          }
        }
      } catch (error) {
        console.error('Error deleting resume:', error);
        alert('Failed to delete resume');
      }
    },
    [fetchResumes]
  );

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="p-4 border-b bg-card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Saved Resumes</h2>
          <span className="text-sm text-muted-foreground">
            {savedResumes.length}/5 saved
          </span>
        </div>

        <Dialog open={isSaveDialogOpen} onOpenChange={setIsSaveDialogOpen}>
          <DialogTrigger asChild>
            <Button
              variant="default"
              size="sm"
              className="w-full"
              disabled={savedResumes.length >= 5}
              aria-label="Save current resume"
            >
              <Save className="h-4 w-4 mr-2" />
              Save Current Resume
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Save Resume</DialogTitle>
              <DialogDescription>
                Give your resume a name to save it for later.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="resume-name">Resume Name</Label>
                <Input
                  id="resume-name"
                  value={saveName}
                  onChange={(e) => setSaveName(e.target.value)}
                  placeholder="e.g., Software Engineer Resume"
                  aria-label="Resume name"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSaveResume();
                    }
                  }}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsSaveDialogOpen(false)}
                type="button"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveResume}
                disabled={isSaving || !saveName.trim()}
                type="button"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : savedResumes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Save className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              No saved resumes yet. Save your current resume to get started.
            </p>
          </div>
        ) : (
          savedResumes.map((savedResume) => (
            <Card key={savedResume.id}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{savedResume.name}</CardTitle>
                <p className="text-xs text-muted-foreground">
                  Saved {formatDate(savedResume.savedAt)} • Template:{' '}
                  {getTemplateName(savedResume.templateId)}
                </p>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex gap-2">
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => handleLoadResume(savedResume)}
                    className="flex-1"
                    aria-label={`Load ${savedResume.name}`}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Load
                  </Button>
                  <Dialog
                    open={deleteResumeId === savedResume.id}
                    onOpenChange={(open) => setDeleteResumeId(open ? savedResume.id : null)}
                  >
                    <DialogTrigger asChild>
                      <Button
                        variant="destructive"
                        size="sm"
                        aria-label={`Delete ${savedResume.name}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Delete Resume?</DialogTitle>
                        <DialogDescription>
                          Are you sure you want to delete "{savedResume.name}"?
                          This action cannot be undone.
                        </DialogDescription>
                      </DialogHeader>
                      <DialogFooter>
                        <Button
                          variant="outline"
                          onClick={() => setDeleteResumeId(null)}
                          type="button"
                        >
                          Cancel
                        </Button>
                        <Button
                          variant="destructive"
                          onClick={() => handleDeleteResume(savedResume.id)}
                          type="button"
                        >
                          Delete
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};
