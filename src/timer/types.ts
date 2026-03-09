export const FRAME_WIDTH_OPTIONS = {
  small: 40,
  normal: 60,
  large: 80,
} as const;

export const FRAME_THICKNESS_OPTIONS = {
  small: 5,
  normal: 10,
  large: 15,
} as const;

export type FrameWidth = keyof typeof FRAME_WIDTH_OPTIONS;
export type FrameThickness = keyof typeof FRAME_THICKNESS_OPTIONS;
export type ActiveTimerMode = 'play' | 'record';
export type TimerMode = 'init' | 'ready' | 'countdown' | 'play' | 'pause' | 'record';

export interface TimerConfig {
  totalSeconds: number;
  fps: number;
  prepareSeconds: number;
  frameWidth: FrameWidth;
  frameThickness: FrameThickness;
}

export interface MarkRange {
  startMs: number;
  endMs: number;
}

export interface TimerState {
  mode: TimerMode;
  config: TimerConfig;
  elapsedMs: number;
  recordedDurationMs: number | null;
  marks: MarkRange[];
  pendingMarkStartMs: number | null;
  countdownRemainingMs: number;
  countdownTarget: ActiveTimerMode | null;
  countdownReturnMode: 'init' | 'ready';
}

export interface TimerAction {
  type:
    | 'playPause'
    | 'replay'
    | 'reset'
    | 'recordToggle'
    | 'markStart'
    | 'markEnd'
    | 'tick'
    | 'updateConfig';
  deltaMs?: number;
  patch?: Partial<TimerConfig>;
}

export interface TimerSnapshot {
  mode: TimerMode;
  countdownTarget: ActiveTimerMode | null;
  config: TimerConfig;
  elapsedMs: number;
  displayElapsedMs: number;
  prepareRemainingMs: number;
  totalDurationMs: number;
  playbackLimitMs: number | null;
  recordedDurationMs: number | null;
  marks: MarkRange[];
  pendingMarkStartMs: number | null;
  isActive: boolean;
  hasRecording: boolean;
}

export interface TimerUiState {
  mode: TimerMode;
  countdownTarget: ActiveTimerMode | null;
  config: TimerConfig;
  hasRecording: boolean;
  isMarking: boolean;
  canPlay: boolean;
  canReplay: boolean;
  canReset: boolean;
  canRecord: boolean;
  canMark: boolean;
}

export interface TimerControllerApi {
  playPause: () => void;
  replay: () => void;
  reset: () => void;
  recordToggle: () => void;
  markStart: () => void;
  markEnd: () => void;
  updateConfig: (patch: Partial<TimerConfig>) => void;
}

export const DEFAULT_TIMER_CONFIG: TimerConfig = {
  totalSeconds: 21,
  fps: 24,
  prepareSeconds: 3,
  frameWidth: 'normal',
  frameThickness: 'normal',
};

export const CONFIG_LIMITS = {
  fps: {
    max: 240,
    min: 1,
  },
  prepareSeconds: {
    max: 5,
    min: 0,
  },
  totalSeconds: {
    max: 300,
    min: 1,
  },
} as const;
