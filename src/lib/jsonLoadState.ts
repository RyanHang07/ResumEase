export type StatusState = 'idle' | 'ok' | 'error';

export interface JsonLoadState {
  storeSerialized: string;
  draft: string;
  latestAttemptId: number;
  lastProcessedHashPayload: string | null;
  applyStatus: StatusState;
  applyMessage: string;
  hashStatus: StatusState;
  hashMessage: string;
  compileGeneration: number;
  pdfUrl: string | null;
  isCompiling: boolean;
}

export type JsonLoadEvent =
  | { type: 'hash-success'; attemptId: number; serialized: string; payload: string }
  | { type: 'hash-failure'; attemptId: number; message: string; payload: string }
  | { type: 'draft-input'; value: string }
  | { type: 'apply-success'; attemptId: number; serialized: string }
  | { type: 'apply-failure'; attemptId: number; message: string }
  | { type: 'form-edit'; serialized: string }
  | { type: 'reset' }
  | { type: 'mount-seed' }
  | { type: 'compile-started'; generation: number }
  | { type: 'compile-success'; generation: number; pdfUrl: string }
  | { type: 'compile-failure'; generation: number };

export const APPLY_OK_MESSAGE = 'Applied';
export const APPLY_IDLE_MESSAGE = 'Idle';

export const createJsonLoadState = (initialSerialized: string): JsonLoadState => ({
  storeSerialized: initialSerialized,
  draft: initialSerialized,
  latestAttemptId: 0,
  lastProcessedHashPayload: null,
  applyStatus: 'idle',
  applyMessage: APPLY_IDLE_MESSAGE,
  hashStatus: 'idle',
  hashMessage: '',
  compileGeneration: 0,
  pdfUrl: null,
  isCompiling: false,
});

export const beginAttempt = (
  state: JsonLoadState
): { state: JsonLoadState; attemptId: number } => {
  const attemptId = state.latestAttemptId + 1;
  return {
    state: { ...state, latestAttemptId: attemptId },
    attemptId,
  };
};

export const inspectHashPayload = (
  state: JsonLoadState,
  payload: string | null
): 'process' | 'ignore' => {
  if (!payload) return 'ignore';
  if (payload === state.lastProcessedHashPayload) return 'ignore';
  return 'process';
};

export const isDownloadPdfEnabled = (state: JsonLoadState): boolean =>
  Boolean(state.pdfUrl) && !state.isCompiling;

const isCurrentAttempt = (state: JsonLoadState, attemptId: number): boolean =>
  attemptId === state.latestAttemptId;

const startCompile = (state: JsonLoadState): JsonLoadState => {
  const compileGeneration = state.compileGeneration + 1;
  return {
    ...state,
    compileGeneration,
    isCompiling: true,
  };
};

export const reduceJsonLoad = (state: JsonLoadState, event: JsonLoadEvent): JsonLoadState => {
  switch (event.type) {
    case 'hash-success': {
      if (!isCurrentAttempt(state, event.attemptId)) return state;
      return startCompile({
        ...state,
        storeSerialized: event.serialized,
        draft: event.serialized,
        lastProcessedHashPayload: event.payload,
        hashStatus: 'idle',
        hashMessage: '',
        applyStatus: 'idle',
        applyMessage: APPLY_IDLE_MESSAGE,
      });
    }
    case 'hash-failure': {
      if (!isCurrentAttempt(state, event.attemptId)) return state;
      return {
        ...state,
        lastProcessedHashPayload: event.payload,
        hashStatus: 'error',
        hashMessage: event.message,
      };
    }
    case 'draft-input': {
      return {
        ...state,
        draft: event.value,
      };
    }
    case 'apply-success': {
      if (!isCurrentAttempt(state, event.attemptId)) return state;
      return startCompile({
        ...state,
        storeSerialized: event.serialized,
        draft: event.serialized,
        applyStatus: 'ok',
        applyMessage: APPLY_OK_MESSAGE,
      });
    }
    case 'apply-failure': {
      if (!isCurrentAttempt(state, event.attemptId)) return state;
      return {
        ...state,
        applyStatus: 'error',
        applyMessage: event.message,
      };
    }
    case 'form-edit': {
      const isDirty = state.draft !== state.storeSerialized;
      return {
        ...state,
        storeSerialized: event.serialized,
        draft: isDirty ? state.draft : event.serialized,
      };
    }
    case 'reset': {
      return {
        ...state,
        draft: state.storeSerialized,
        applyStatus: 'idle',
        applyMessage: APPLY_IDLE_MESSAGE,
        hashStatus: 'idle',
        hashMessage: '',
      };
    }
    case 'mount-seed': {
      return {
        ...state,
        draft: state.storeSerialized,
      };
    }
    case 'compile-started': {
      if (event.generation !== state.compileGeneration) return state;
      return {
        ...state,
        isCompiling: true,
      };
    }
    case 'compile-success': {
      if (event.generation !== state.compileGeneration) return state;
      return {
        ...state,
        pdfUrl: event.pdfUrl,
        isCompiling: false,
      };
    }
    case 'compile-failure': {
      if (event.generation !== state.compileGeneration) return state;
      return {
        ...state,
        pdfUrl: null,
        isCompiling: false,
      };
    }
    default: {
      return state;
    }
  }
};
