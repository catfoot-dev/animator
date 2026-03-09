import {
  CONFIG_LIMITS,
  DEFAULT_TIMER_CONFIG,
  type ActiveTimerMode,
  type MarkRange,
  type TimerAction,
  type TimerConfig,
  type TimerSnapshot,
  type TimerState,
  type TimerUiState,
} from './types';

const READY_MODES = new Set(['ready', 'play', 'pause']);
const RECORD_TOGGLE_MODES = new Set(['init', 'ready', 'pause', 'record']);

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function clampNullable(value: number | null, max: number) {
  if (value === null) {
    return null;
  }

  return clamp(value, 0, max);
}

function trimMarks(marks: MarkRange[], maxDurationMs: number) {
  return marks
    .map((mark) => ({
      endMs: clamp(mark.endMs, 0, maxDurationMs),
      startMs: clamp(mark.startMs, 0, maxDurationMs),
    }))
    .filter((mark) => mark.endMs > mark.startMs);
}

function getTotalDurationMs(config: TimerConfig) {
  return config.totalSeconds * 1000;
}

function getPlaybackLimitMs(state: TimerState) {
  const totalDurationMs = getTotalDurationMs(state.config);

  if (state.recordedDurationMs === null) {
    return totalDurationMs;
  }

  return clamp(state.recordedDurationMs, 0, totalDurationMs);
}

function enterTargetMode(state: TimerState, target: ActiveTimerMode): TimerState {
  if (target === 'record') {
    return {
      ...state,
      countdownRemainingMs: 0,
      countdownTarget: null,
      elapsedMs: 0,
      marks: [],
      mode: 'record',
      pendingMarkStartMs: null,
      recordedDurationMs: null,
    };
  }

  return {
    ...state,
    countdownRemainingMs: 0,
    countdownTarget: null,
    elapsedMs: 0,
    mode: 'play',
    pendingMarkStartMs: null,
  };
}

function startCountdown(state: TimerState, target: ActiveTimerMode): TimerState {
  if (state.config.prepareSeconds === 0) {
    return enterTargetMode(state, target);
  }

  return {
    ...state,
    countdownRemainingMs: state.config.prepareSeconds * 1000,
    countdownReturnMode: state.recordedDurationMs === null ? 'init' : 'ready',
    countdownTarget: target,
    mode: 'countdown',
    pendingMarkStartMs: null,
  };
}

function finalizeRecording(state: TimerState, elapsedMs: number): TimerState {
  const totalDurationMs = getTotalDurationMs(state.config);
  const clampedElapsedMs = clamp(elapsedMs, 0, totalDurationMs);
  const marks =
    state.pendingMarkStartMs !== null && clampedElapsedMs > state.pendingMarkStartMs
      ? [
          ...state.marks,
          {
            endMs: clampedElapsedMs,
            startMs: state.pendingMarkStartMs,
          },
        ]
      : state.marks;

  return {
    ...state,
    countdownRemainingMs: 0,
    countdownTarget: null,
    elapsedMs: clampedElapsedMs,
    marks: trimMarks(marks, totalDurationMs),
    mode: 'ready',
    pendingMarkStartMs: null,
    recordedDurationMs: clampedElapsedMs,
  };
}

function cancelCountdown(state: TimerState): TimerState {
  return {
    ...state,
    countdownRemainingMs: 0,
    countdownTarget: null,
    mode: state.countdownReturnMode,
    pendingMarkStartMs: null,
  };
}

export function clampTimerConfig(
  patch: Partial<TimerConfig>,
  current: TimerConfig = DEFAULT_TIMER_CONFIG,
): TimerConfig {
  const nextTotalSeconds = patch.totalSeconds ?? current.totalSeconds;
  const nextFps = patch.fps ?? current.fps;
  const nextPrepareSeconds = patch.prepareSeconds ?? current.prepareSeconds;

  return {
    fps: clamp(Math.round(nextFps), CONFIG_LIMITS.fps.min, CONFIG_LIMITS.fps.max),
    frameThickness: patch.frameThickness ?? current.frameThickness,
    frameWidth: patch.frameWidth ?? current.frameWidth,
    prepareSeconds: clamp(
      Math.round(nextPrepareSeconds),
      CONFIG_LIMITS.prepareSeconds.min,
      CONFIG_LIMITS.prepareSeconds.max,
    ),
    totalSeconds: clamp(
      Math.round(nextTotalSeconds),
      CONFIG_LIMITS.totalSeconds.min,
      CONFIG_LIMITS.totalSeconds.max,
    ),
  };
}

export function createInitialTimerState(config: TimerConfig = DEFAULT_TIMER_CONFIG): TimerState {
  return {
    config,
    countdownRemainingMs: 0,
    countdownReturnMode: 'init',
    countdownTarget: null,
    elapsedMs: 0,
    marks: [],
    mode: 'init',
    pendingMarkStartMs: null,
    recordedDurationMs: null,
  };
}

export function timerReducer(state: TimerState, action: TimerAction): TimerState {
  switch (action.type) {
    case 'playPause': {
      if (state.mode === 'play') {
        return {
          ...state,
          mode: 'pause',
        };
      }

      if (state.mode === 'pause') {
        return {
          ...state,
          mode: 'play',
        };
      }

      if (state.mode === 'countdown' && state.countdownTarget === 'play') {
        return cancelCountdown(state);
      }

      if (state.mode === 'ready' && state.recordedDurationMs !== null) {
        return startCountdown(state, 'play');
      }

      return state;
    }
    case 'replay': {
      if (READY_MODES.has(state.mode) && state.recordedDurationMs !== null) {
        return startCountdown(state, 'play');
      }

      return state;
    }
    case 'reset': {
      return createInitialTimerState(state.config);
    }
    case 'recordToggle': {
      if (state.mode === 'countdown' && state.countdownTarget === 'record') {
        return cancelCountdown(state);
      }

      if (state.mode === 'record') {
        return finalizeRecording(state, state.elapsedMs);
      }

      if (RECORD_TOGGLE_MODES.has(state.mode)) {
        return startCountdown(state, 'record');
      }

      return state;
    }
    case 'markStart': {
      if (state.mode !== 'record' || state.pendingMarkStartMs !== null) {
        return state;
      }

      return {
        ...state,
        pendingMarkStartMs: state.elapsedMs,
      };
    }
    case 'markEnd': {
      if (
        state.mode !== 'record' ||
        state.pendingMarkStartMs === null ||
        state.elapsedMs <= state.pendingMarkStartMs
      ) {
        return {
          ...state,
          pendingMarkStartMs: null,
        };
      }

      return {
        ...state,
        marks: [
          ...state.marks,
          {
            endMs: state.elapsedMs,
            startMs: state.pendingMarkStartMs,
          },
        ],
        pendingMarkStartMs: null,
      };
    }
    case 'tick': {
      if (!action.deltaMs || action.deltaMs <= 0) {
        return state;
      }

      if (state.mode === 'countdown') {
        const remainingMs = Math.max(0, state.countdownRemainingMs - action.deltaMs);

        if (remainingMs === 0 && state.countdownTarget !== null) {
          return enterTargetMode(
            {
              ...state,
              countdownRemainingMs: 0,
            },
            state.countdownTarget,
          );
        }

        return {
          ...state,
          countdownRemainingMs: remainingMs,
        };
      }

      if (state.mode === 'play') {
        const playbackLimitMs = getPlaybackLimitMs(state);
        const elapsedMs = Math.min(state.elapsedMs + action.deltaMs, playbackLimitMs);

        if (elapsedMs >= playbackLimitMs) {
          return {
            ...state,
            elapsedMs: playbackLimitMs,
            mode: 'ready',
            pendingMarkStartMs: null,
          };
        }

        return {
          ...state,
          elapsedMs,
        };
      }

      if (state.mode === 'record') {
        const totalDurationMs = getTotalDurationMs(state.config);
        const elapsedMs = Math.min(state.elapsedMs + action.deltaMs, totalDurationMs);

        if (elapsedMs >= totalDurationMs) {
          return finalizeRecording(
            {
              ...state,
              elapsedMs,
            },
            totalDurationMs,
          );
        }

        return {
          ...state,
          elapsedMs,
        };
      }

      return state;
    }
    case 'updateConfig': {
      const nextConfig = clampTimerConfig(action.patch ?? {}, state.config);
      const totalDurationMs = getTotalDurationMs(nextConfig);
      const marks = trimMarks(state.marks, totalDurationMs);
      const countdownLimitMs = nextConfig.prepareSeconds * 1000;
      let nextState: TimerState = {
        ...state,
        config: nextConfig,
        countdownRemainingMs:
          state.mode === 'countdown'
            ? clamp(state.countdownRemainingMs, 0, countdownLimitMs)
            : state.countdownRemainingMs,
        elapsedMs: Math.min(state.elapsedMs, totalDurationMs),
        marks,
        pendingMarkStartMs: clampNullable(state.pendingMarkStartMs, totalDurationMs),
        recordedDurationMs: clampNullable(state.recordedDurationMs, totalDurationMs),
      };

      if (
        nextState.pendingMarkStartMs !== null &&
        nextState.pendingMarkStartMs >= nextState.elapsedMs
      ) {
        nextState = {
          ...nextState,
          pendingMarkStartMs: null,
        };
      }

      if (nextState.mode === 'record' && nextState.elapsedMs >= totalDurationMs) {
        return finalizeRecording(nextState, totalDurationMs);
      }

      if (nextState.mode === 'play') {
        const playbackLimitMs = getPlaybackLimitMs(nextState);

        if (nextState.elapsedMs >= playbackLimitMs) {
          return {
            ...nextState,
            elapsedMs: playbackLimitMs,
            mode: 'ready',
            pendingMarkStartMs: null,
          };
        }
      }

      return nextState;
    }
    default: {
      return state;
    }
  }
}

export function createTimerSnapshot(state: TimerState): TimerSnapshot {
  const totalDurationMs = getTotalDurationMs(state.config);
  const hasRecording = state.recordedDurationMs !== null;

  return {
    config: state.config,
    countdownTarget: state.countdownTarget,
    displayElapsedMs: state.mode === 'countdown' ? state.countdownRemainingMs : state.elapsedMs,
    elapsedMs: state.elapsedMs,
    hasRecording,
    isActive: state.mode === 'countdown' || state.mode === 'play' || state.mode === 'record',
    marks: state.marks,
    mode: state.mode,
    pendingMarkStartMs: state.pendingMarkStartMs,
    playbackLimitMs: hasRecording ? getPlaybackLimitMs(state) : null,
    prepareRemainingMs: state.mode === 'countdown' ? state.countdownRemainingMs : 0,
    recordedDurationMs: state.recordedDurationMs,
    totalDurationMs,
  };
}

export function createTimerUiState(state: TimerState): TimerUiState {
  const hasRecording = state.recordedDurationMs !== null;
  const canPlay =
    (state.mode === 'countdown' && state.countdownTarget === 'play') ||
    (hasRecording && (state.mode === 'ready' || state.mode === 'play' || state.mode === 'pause'));
  const canReplay =
    hasRecording && (state.mode === 'ready' || state.mode === 'play' || state.mode === 'pause');
  const canReset =
    state.mode !== 'countdown' &&
    state.mode !== 'record' &&
    (hasRecording || state.marks.length > 0 || state.elapsedMs > 0);
  const canRecord =
    (state.mode === 'countdown' && state.countdownTarget === 'record') ||
    state.mode === 'init' ||
    state.mode === 'ready' ||
    state.mode === 'pause' ||
    state.mode === 'record';

  return {
    canMark: state.mode === 'record',
    canPlay,
    canRecord,
    canReplay,
    canReset,
    config: state.config,
    countdownTarget: state.countdownTarget,
    hasRecording,
    isMarking: state.pendingMarkStartMs !== null,
    mode: state.mode,
  };
}
