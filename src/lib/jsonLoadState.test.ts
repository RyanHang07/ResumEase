import { describe, expect, it } from 'vitest';
import {
  APPLY_IDLE_MESSAGE,
  APPLY_OK_MESSAGE,
  beginAttempt,
  createJsonLoadState,
  inspectHashPayload,
  isDownloadPdfEnabled,
  reduceJsonLoad,
  type JsonLoadState,
} from '@/lib/jsonLoadState';

const SAMPLE = '{"doc":"sample","name":"Alex"}';
const DOCA = '{"doc":"A","name":"Ada","bullets":["alpha","beta"]}';
const DOCB = '{"doc":"B","name":"Bea","bullets":["first","second"]}';
const BIG_PASTE = `{"doc":"big","pad":"${'x'.repeat(8 * 1024)}"}`;

const expectNotBlank = (state: JsonLoadState) => {
  expect(state.draft).not.toBe('');
  expect(state.storeSerialized).not.toBe('');
};

const hashSuccess = (
  state: JsonLoadState,
  serialized: string,
  payload: string
): JsonLoadState => {
  expect(inspectHashPayload(state, payload)).toBe('process');
  const started = beginAttempt(state);
  return reduceJsonLoad(started.state, {
    type: 'hash-success',
    attemptId: started.attemptId,
    serialized,
    payload,
  });
};

const hashFailure = (
  state: JsonLoadState,
  message: string,
  payload: string
): JsonLoadState => {
  expect(inspectHashPayload(state, payload)).toBe('process');
  const started = beginAttempt(state);
  return reduceJsonLoad(started.state, {
    type: 'hash-failure',
    attemptId: started.attemptId,
    message,
    payload,
  });
};

const applySuccess = (state: JsonLoadState, serialized: string): JsonLoadState => {
  const started = beginAttempt(state);
  return reduceJsonLoad(started.state, {
    type: 'apply-success',
    attemptId: started.attemptId,
    serialized,
  });
};

const applyFailure = (state: JsonLoadState, message: string): JsonLoadState => {
  const started = beginAttempt(state);
  return reduceJsonLoad(started.state, {
    type: 'apply-failure',
    attemptId: started.attemptId,
    message,
  });
};

describe('jsonLoadState A single-method', () => {
  it('A1 hydrates a valid hash document and consumes the payload', () => {
    const state = hashSuccess(createJsonLoadState(SAMPLE), DOCA, 'payload-a');
    expect(state.storeSerialized).toBe(DOCA);
    expect(state.draft).toBe(DOCA);
    expect(state.lastProcessedHashPayload).toBe('payload-a');
    expect(inspectHashPayload(state, 'payload-a')).toBe('ignore');
    expectNotBlank(state);
  });

  it('A2 keeps sample on hash failure', () => {
    const state = hashFailure(
      createJsonLoadState(SAMPLE),
      'Invalid #data= payload: not valid base64url.',
      '!!!'
    );
    expect(state.storeSerialized).toBe(SAMPLE);
    expect(state.draft).toBe(SAMPLE);
    expect(state.hashStatus).toBe('error');
    expect(state.hashMessage).toContain('base64url');
    expectNotBlank(state);
  });

  it('A3 hash trailing-comma failure keeps sample and records the message', () => {
    const state = hashFailure(
      createJsonLoadState(SAMPLE),
      'line 1, column 12: Expected double-quoted property name',
      'comma-payload'
    );
    expect(state.storeSerialized).toBe(SAMPLE);
    expect(state.draft).toBe(SAMPLE);
    expect(state.hashMessage).toMatch(/line 1, column 12/);
  });

  it('A4 hash schema failure keeps sample and records the field path', () => {
    const state = hashFailure(
      createJsonLoadState(SAMPLE),
      'sections.0.entries.0.bulletPoints: Invalid input',
      'schema-payload'
    );
    expect(state.storeSerialized).toBe(SAMPLE);
    expect(state.hashMessage).toContain('sections.0.entries.0.bulletPoints');
  });

  it('A5 paste of an 8KB document is byte-identical and does not touch the store', () => {
    const state = reduceJsonLoad(createJsonLoadState(SAMPLE), {
      type: 'draft-input',
      value: BIG_PASTE,
    });
    expect(state.draft).toBe(BIG_PASTE);
    expect(state.draft.length).toBeGreaterThan(8 * 1024);
    expect(state.storeSerialized).toBe(SAMPLE);
    expect(state.applyStatus).toBe('idle');
  });

  it('A6 apply success commits DocB and sets Applied', () => {
    const state = applySuccess(createJsonLoadState(SAMPLE), DOCB);
    expect(state.storeSerialized).toBe(DOCB);
    expect(state.draft).toBe(DOCB);
    expect(state.applyStatus).toBe('ok');
    expect(state.applyMessage).toBe(APPLY_OK_MESSAGE);
  });

  it('A7 apply trailing comma keeps draft and sets apply error', () => {
    const withComma = reduceJsonLoad(createJsonLoadState(SAMPLE), {
      type: 'draft-input',
      value: '{"doc":"A",}',
    });
    const state = applyFailure(withComma, 'line 1, column 12: Unexpected token');
    expect(state.storeSerialized).toBe(SAMPLE);
    expect(state.draft).toBe('{"doc":"A",}');
    expect(state.applyStatus).toBe('error');
    expect(state.applyMessage).toMatch(/line 1, column 12/);
  });

  it('A8 apply schema error keeps draft and includes the path', () => {
    const draft = '{"doc":"bad"}';
    const withDraft = reduceJsonLoad(createJsonLoadState(SAMPLE), {
      type: 'draft-input',
      value: draft,
    });
    const state = applyFailure(withDraft, 'header.name: Invalid input');
    expect(state.storeSerialized).toBe(SAMPLE);
    expect(state.draft).toBe(draft);
    expect(state.applyMessage).toContain('header.name');
  });

  it('A9 reset restores the last applied snapshot and idles statuses', () => {
    let state = applySuccess(createJsonLoadState(SAMPLE), DOCB);
    state = reduceJsonLoad(state, { type: 'draft-input', value: BIG_PASTE });
    state = reduceJsonLoad(state, { type: 'reset' });
    expect(state.draft).toBe(DOCB);
    expect(state.applyStatus).toBe('idle');
    expect(state.applyMessage).toBe(APPLY_IDLE_MESSAGE);
    expect(state.hashStatus).toBe('idle');
  });
});

describe('jsonLoadState B hash vs apply order', () => {
  it('B1 Hash A then Apply B ends on DocB', () => {
    let state = hashSuccess(createJsonLoadState(SAMPLE), DOCA, 'a');
    state = applySuccess(state, DOCB);
    expect(state.storeSerialized).toBe(DOCB);
    expect(state.draft).toBe(DOCB);
    expect(state.applyStatus).toBe('ok');
    expect(state.hashStatus).toBe('idle');
  });

  it('B2 Apply B then Hash A ends on DocA and force-aligns draft', () => {
    let state = applySuccess(createJsonLoadState(SAMPLE), DOCB);
    state = hashSuccess(state, DOCA, 'a');
    expect(state.storeSerialized).toBe(DOCA);
    expect(state.draft).toBe(DOCA);
    expect(state.applyStatus).toBe('idle');
  });

  it('B3 unapplied paste B is discarded by a current Hash A', () => {
    let state = reduceJsonLoad(createJsonLoadState(SAMPLE), {
      type: 'draft-input',
      value: DOCB,
    });
    state = hashSuccess(state, DOCA, 'a');
    expect(state.storeSerialized).toBe(DOCA);
    expect(state.draft).toBe(DOCA);
  });

  it('B4 unapplied paste B survives a hash failure', () => {
    let state = reduceJsonLoad(createJsonLoadState(SAMPLE), {
      type: 'draft-input',
      value: DOCB,
    });
    state = hashFailure(state, 'Invalid #data= payload: not valid base64url.', '!!!');
    expect(state.storeSerialized).toBe(SAMPLE);
    expect(state.draft).toBe(DOCB);
    expect(state.hashStatus).toBe('error');
    expectNotBlank(state);
  });

  it('B5 stale Hash A commit after Apply B started is dropped', () => {
    const hashStart = beginAttempt(createJsonLoadState(SAMPLE));
    const applyStart = beginAttempt(hashStart.state);
    let state = reduceJsonLoad(applyStart.state, {
      type: 'hash-success',
      attemptId: hashStart.attemptId,
      serialized: DOCA,
      payload: 'a',
    });
    state = reduceJsonLoad(state, {
      type: 'apply-success',
      attemptId: applyStart.attemptId,
      serialized: DOCB,
    });
    expect(state.storeSerialized).toBe(DOCB);
    expect(state.draft).toBe(DOCB);
  });

  it('B6 stale Apply B commit after Hash A started is dropped', () => {
    const applyStart = beginAttempt(createJsonLoadState(SAMPLE));
    const hashStart = beginAttempt(applyStart.state);
    let state = reduceJsonLoad(hashStart.state, {
      type: 'apply-success',
      attemptId: applyStart.attemptId,
      serialized: DOCB,
    });
    state = reduceJsonLoad(state, {
      type: 'hash-success',
      attemptId: hashStart.attemptId,
      serialized: DOCA,
      payload: 'a',
    });
    expect(state.storeSerialized).toBe(DOCA);
    expect(state.draft).toBe(DOCA);
  });

  it('B7 hash failure does not block a later Apply B', () => {
    let state = hashFailure(createJsonLoadState(SAMPLE), 'bad hash', 'bad');
    state = applySuccess(state, DOCB);
    expect(state.storeSerialized).toBe(DOCB);
    expect(state.draft).toBe(DOCB);
    expect(state.applyStatus).toBe('ok');
    expect(state.hashStatus).toBe('error');
  });

  it('B8 hash success after apply failure resets apply-status to idle', () => {
    let state = applyFailure(createJsonLoadState(SAMPLE), 'line 1, column 2: bad');
    state = hashSuccess(state, DOCA, 'a');
    expect(state.storeSerialized).toBe(DOCA);
    expect(state.draft).toBe(DOCA);
    expect(state.applyStatus).toBe('idle');
    expect(state.hashStatus).toBe('idle');
  });

  it('B9 rapid Hash A then Hash B keeps only DocB', () => {
    const first = beginAttempt(createJsonLoadState(SAMPLE));
    const second = beginAttempt(first.state);
    let state = reduceJsonLoad(second.state, {
      type: 'hash-success',
      attemptId: first.attemptId,
      serialized: DOCA,
      payload: 'a',
    });
    state = reduceJsonLoad(state, {
      type: 'hash-success',
      attemptId: second.attemptId,
      serialized: DOCB,
      payload: 'b',
    });
    expect(state.storeSerialized).toBe(DOCB);
    expect(state.draft).toBe(DOCB);
    expect(state.lastProcessedHashPayload).toBe('b');
  });

  it('B10 rapid Apply A then Apply B keeps only DocB', () => {
    const first = beginAttempt(createJsonLoadState(SAMPLE));
    const second = beginAttempt(first.state);
    let state = reduceJsonLoad(second.state, {
      type: 'apply-success',
      attemptId: first.attemptId,
      serialized: DOCA,
    });
    state = reduceJsonLoad(state, {
      type: 'apply-success',
      attemptId: second.attemptId,
      serialized: DOCB,
    });
    expect(state.storeSerialized).toBe(DOCB);
    expect(state.applyMessage).toBe(APPLY_OK_MESSAGE);
  });

  it('B11 Hash A then Apply A is idempotent', () => {
    let state = hashSuccess(createJsonLoadState(SAMPLE), DOCA, 'a');
    state = applySuccess(state, DOCA);
    expect(state.storeSerialized).toBe(DOCA);
    expect(state.draft).toBe(DOCA);
    expect(state.applyStatus).toBe('ok');
    expect(state.hashStatus).toBe('idle');
  });
});

describe('jsonLoadState C fragment lifecycle', () => {
  it('C1 empty hash after replaceState is a no-op', () => {
    const hydrated = hashSuccess(createJsonLoadState(SAMPLE), DOCA, 'a');
    expect(inspectHashPayload(hydrated, null)).toBe('ignore');
    expect(inspectHashPayload(hydrated, '')).toBe('ignore');
    expect(hydrated.storeSerialized).toBe(DOCA);
  });

  it('C2 duplicate #data=A payload is ignored after the first commit', () => {
    const state = hashSuccess(createJsonLoadState(SAMPLE), DOCA, 'payload-a');
    expect(inspectHashPayload(state, 'payload-a')).toBe('ignore');
    expect(state.storeSerialized).toBe(DOCA);
    expectNotBlank(state);
  });

  it('C3 missing payload after fragment clear does not import sample', () => {
    const state = hashSuccess(createJsonLoadState(SAMPLE), DOCA, 'a');
    expect(inspectHashPayload(state, null)).toBe('ignore');
    expect(state.storeSerialized).toBe(DOCA);
    expect(state.draft).not.toBe(SAMPLE);
  });

  it('C4 a new #data=B payload after A wins', () => {
    let state = hashSuccess(createJsonLoadState(SAMPLE), DOCA, 'a');
    state = hashSuccess(state, DOCB, 'b');
    expect(state.storeSerialized).toBe(DOCB);
    expect(state.draft).toBe(DOCB);
  });

  it('C5 malformed hash then valid Hash A never blanks the editor', () => {
    let state = hashFailure(createJsonLoadState(SAMPLE), 'not valid base64url', 'bad');
    expectNotBlank(state);
    state = hashSuccess(state, DOCA, 'a');
    expect(state.storeSerialized).toBe(DOCA);
    expect(state.draft).toBe(DOCA);
    expectNotBlank(state);
  });
});

describe('jsonLoadState D draft vs store', () => {
  it('D1 successful hash or apply force-aligns draft to store', () => {
    const hashed = hashSuccess(createJsonLoadState(SAMPLE), DOCA, 'a');
    expect(hashed.draft).toBe(hashed.storeSerialized);
    const applied = applySuccess(createJsonLoadState(SAMPLE), DOCB);
    expect(applied.draft).toBe(applied.storeSerialized);
  });

  it('D2 failure keeps the pre-failure draft', () => {
    const pasted = reduceJsonLoad(createJsonLoadState(SAMPLE), {
      type: 'draft-input',
      value: DOCB,
    });
    const failedApply = applyFailure(pasted, 'bad json');
    expect(failedApply.draft).toBe(DOCB);
    const failedHash = hashFailure(pasted, 'bad hash', 'bad');
    expect(failedHash.draft).toBe(DOCB);
  });

  it('D3 form edit while dirty keeps the paste', () => {
    let state = reduceJsonLoad(createJsonLoadState(SAMPLE), {
      type: 'draft-input',
      value: DOCB,
    });
    state = reduceJsonLoad(state, { type: 'form-edit', serialized: DOCA });
    expect(state.storeSerialized).toBe(DOCA);
    expect(state.draft).toBe(DOCB);
  });

  it('D4 form edit while clean syncs draft', () => {
    const state = reduceJsonLoad(createJsonLoadState(SAMPLE), {
      type: 'form-edit',
      serialized: DOCA,
    });
    expect(state.storeSerialized).toBe(DOCA);
    expect(state.draft).toBe(DOCA);
  });

  it('D5 mount-seed after Hash A shows DocA not sample', () => {
    let state = hashSuccess(createJsonLoadState(SAMPLE), DOCA, 'a');
    state = reduceJsonLoad(state, { type: 'draft-input', value: SAMPLE });
    state = reduceJsonLoad(state, { type: 'mount-seed' });
    expect(state.draft).toBe(DOCA);
  });

  it('D6 Hash A while the editor is mounted updates draft without remount', () => {
    const state = hashSuccess(createJsonLoadState(SAMPLE), DOCA, 'a');
    expect(state.draft).toBe(DOCA);
    expect(state.storeSerialized).toBe(DOCA);
  });
});

describe('jsonLoadState E compile generation', () => {
  it('E1 Hash A then Apply B: only B compile success may set pdfUrl', () => {
    let state = hashSuccess(createJsonLoadState(SAMPLE), DOCA, 'a');
    const genA = state.compileGeneration;
    expect(isDownloadPdfEnabled(state)).toBe(false);
    state = applySuccess(state, DOCB);
    const genB = state.compileGeneration;
    expect(genB).toBeGreaterThan(genA);
    state = reduceJsonLoad(state, {
      type: 'compile-success',
      generation: genA,
      pdfUrl: 'blob:a',
    });
    expect(state.pdfUrl).toBeNull();
    expect(isDownloadPdfEnabled(state)).toBe(false);
    state = reduceJsonLoad(state, {
      type: 'compile-success',
      generation: genB,
      pdfUrl: 'blob:b',
    });
    expect(state.pdfUrl).toBe('blob:b');
    expect(isDownloadPdfEnabled(state)).toBe(true);
  });

  it('E2 Apply B then Hash A: only A compile success may set pdfUrl', () => {
    let state = applySuccess(createJsonLoadState(SAMPLE), DOCB);
    const genB = state.compileGeneration;
    state = hashSuccess(state, DOCA, 'a');
    const genA = state.compileGeneration;
    state = reduceJsonLoad(state, {
      type: 'compile-success',
      generation: genB,
      pdfUrl: 'blob:b',
    });
    expect(state.pdfUrl).toBeNull();
    state = reduceJsonLoad(state, {
      type: 'compile-success',
      generation: genA,
      pdfUrl: 'blob:a',
    });
    expect(state.pdfUrl).toBe('blob:a');
  });

  it('E3 compile failure for A then Apply B success uses B blob', () => {
    let state = hashSuccess(createJsonLoadState(SAMPLE), DOCA, 'a');
    const genA = state.compileGeneration;
    state = reduceJsonLoad(state, { type: 'compile-failure', generation: genA });
    expect(state.pdfUrl).toBeNull();
    state = applySuccess(state, DOCB);
    const genB = state.compileGeneration;
    state = reduceJsonLoad(state, {
      type: 'compile-success',
      generation: genB,
      pdfUrl: 'blob:b',
    });
    expect(state.pdfUrl).toBe('blob:b');
    expect(isDownloadPdfEnabled(state)).toBe(true);
  });

  it('E4 download stays disabled while compiling even if an old blob exists', () => {
    let state = hashSuccess(createJsonLoadState(SAMPLE), DOCA, 'a');
    state = reduceJsonLoad(state, {
      type: 'compile-success',
      generation: state.compileGeneration,
      pdfUrl: 'blob:a',
    });
    expect(isDownloadPdfEnabled(state)).toBe(true);
    state = applySuccess(state, DOCB);
    expect(state.isCompiling).toBe(true);
    expect(isDownloadPdfEnabled(state)).toBe(false);
  });
});

describe('jsonLoadState F agent invariants', () => {
  it('F1 8KB paste then apply keeps order and sets Applied', () => {
    const ordered = '{"sections":[{"bullets":["keep-first","keep-second"]}]}';
    let state = reduceJsonLoad(createJsonLoadState(SAMPLE), {
      type: 'draft-input',
      value: ordered,
    });
    expect(state.draft).toBe(ordered);
    state = applySuccess(state, ordered);
    expect(state.applyStatus).toBe('ok');
    expect(state.applyMessage).toBe(APPLY_OK_MESSAGE);
    expect(state.storeSerialized).toContain('keep-first');
    expect(state.storeSerialized.indexOf('keep-first')).toBeLessThan(
      state.storeSerialized.indexOf('keep-second')
    );
  });

  it('F2 hash load draft is the hydrated document not sample', () => {
    const state = hashSuccess(createJsonLoadState(SAMPLE), DOCA, 'a');
    expect(state.draft).toBe(DOCA);
    expect(state.draft).not.toBe(SAMPLE);
  });

  it('F4 failed loads never yield an empty textarea', () => {
    const failedHash = hashFailure(createJsonLoadState(SAMPLE), 'bad', 'bad');
    expect(failedHash.draft).not.toBe('');
    const failedApply = applyFailure(
      reduceJsonLoad(createJsonLoadState(SAMPLE), { type: 'draft-input', value: DOCB }),
      'bad'
    );
    expect(failedApply.draft).toBe(DOCB);
    expect(failedApply.draft).not.toBe('');
  });
});
