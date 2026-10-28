import { Resume } from '@/types/resume';
import { migrateResume } from '@/lib/migrations';
import { resumeFilename } from '@/lib/resumeFilename';

export const exportResumeAsJson = (resume: Resume): void => {
  const dataStr = JSON.stringify(resume, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = resumeFilename(resume, 'json');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const importResumeFromJson = (file: File): Promise<Resume> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const resume = migrateResume(JSON.parse(content));
        resolve(resume);
      } catch {
        reject(new Error('Failed to parse resume file'));
      }
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsText(file);
  });
};
