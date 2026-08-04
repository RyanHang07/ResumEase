import assert from 'node:assert/strict';

// Must match resumePath in src/app/api/resumes/route.ts
const resumePath = (userId, resumeId) => {
  if (
    !userId ||
    !resumeId ||
    resumeId.includes('/') ||
    resumeId.includes('\\') ||
    resumeId.includes('..')
  ) {
    throw new Error('Invalid resume path');
  }
  return `resumes/${userId}/${resumeId}.json`;
};

assert.equal(
  resumePath('user_abc', '11111111-1111-1111-1111-111111111111'),
  'resumes/user_abc/11111111-1111-1111-1111-111111111111.json'
);
assert.throws(() => resumePath('user_abc', '../other'), /Invalid resume path/);
assert.throws(() => resumePath('user_abc', 'a/b'), /Invalid resume path/);
assert.throws(() => resumePath('', 'id'), /Invalid resume path/);

console.log('resumePath ok');
