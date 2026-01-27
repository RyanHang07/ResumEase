import { Resume } from '@/types/resume';

const STORAGE_KEY = 'resume-storage';

export const saveResumeToStorage = (resume: Resume): void => {
  try {
    const data = JSON.stringify({ resume, savedAt: new Date().toISOString() });
    localStorage.setItem(STORAGE_KEY, data);
  } catch (error) {
    console.error('Failed to save resume to localStorage:', error);
  }
};

export const loadResumeFromStorage = (): Resume | null => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return null;
    
    const parsed = JSON.parse(data);
    return parsed.resume || null;
  } catch (error) {
    console.error('Failed to load resume from localStorage:', error);
    return null;
  }
};

export const clearResumeStorage = (): void => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear resume from localStorage:', error);
  }
};

export const exportResumeAsJson = (resume: Resume): void => {
  const dataStr = JSON.stringify(resume, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = `resume-${new Date().toISOString().split('T')[0]}.json`;
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
        const resume = JSON.parse(content) as Resume;
        
        // Basic validation
        if (!resume.header || !resume.sections) {
          throw new Error('Invalid resume format');
        }
        
        resolve(resume);
      } catch (error) {
        reject(new Error('Failed to parse resume file'));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    
    reader.readAsText(file);
  });
};
