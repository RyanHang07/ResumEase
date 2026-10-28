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

describe('resumeStore updateName', () => {
  it('sets, caps, and clears the resume name', () => {
    useResumeStore.getState().updateName('Ryan-Hang_Acme_SWE');
    expect(useResumeStore.getState().resume.name).toBe('Ryan-Hang_Acme_SWE');

    useResumeStore.getState().updateName('x'.repeat(120));
    expect(useResumeStore.getState().resume.name).toHaveLength(80);

    useResumeStore.getState().updateName('');
    expect(useResumeStore.getState().resume.name).toBeUndefined();
  });
});
