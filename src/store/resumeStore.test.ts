import { describe, expect, it } from 'vitest';
import { useResumeStore } from '@/store/resumeStore';

describe('resumeStore setTemplate', () => {
  it('resolves legacy template ids to classic', () => {
    useResumeStore.getState().setTemplate('developer');
    expect(useResumeStore.getState().currentTemplate).toBe('classic');

    useResumeStore.getState().setTemplate('two-column');
    expect(useResumeStore.getState().currentTemplate).toBe('classic');

    useResumeStore.getState().setTemplate('compact');
    expect(useResumeStore.getState().currentTemplate).toBe('compact');
  });
});
