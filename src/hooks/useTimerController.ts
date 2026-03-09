import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';
import {
  createInitialTimerState,
  createTimerSnapshot,
  createTimerUiState,
  timerReducer,
} from '../timer/timerMachine';
import type { TimerControllerApi } from '../timer/types';

const ACTIVE_MODES = new Set(['countdown', 'play', 'record']);

export function useTimerController() {
  const [state, dispatch] = useReducer(timerReducer, undefined, createInitialTimerState);
  const frameRef = useRef<number | null>(null);
  const lastFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (!ACTIVE_MODES.has(state.mode)) {
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
      }
      frameRef.current = null;
      lastFrameRef.current = null;
      return;
    }

    const animate = (now: number) => {
      if (lastFrameRef.current === null) {
        lastFrameRef.current = now;
      } else {
        dispatch({ type: 'tick', deltaMs: now - lastFrameRef.current });
        lastFrameRef.current = now;
      }

      frameRef.current = window.requestAnimationFrame(animate);
    };

    frameRef.current = window.requestAnimationFrame(animate);

    return () => {
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
      }
      frameRef.current = null;
      lastFrameRef.current = null;
    };
  }, [state.mode]);

  const playPause = useCallback(() => {
    dispatch({ type: 'playPause' });
  }, []);

  const replay = useCallback(() => {
    dispatch({ type: 'replay' });
  }, []);

  const reset = useCallback(() => {
    dispatch({ type: 'reset' });
  }, []);

  const recordToggle = useCallback(() => {
    dispatch({ type: 'recordToggle' });
  }, []);

  const markStart = useCallback(() => {
    dispatch({ type: 'markStart' });
  }, []);

  const markEnd = useCallback(() => {
    dispatch({ type: 'markEnd' });
  }, []);

  const updateConfig = useCallback((patch: Parameters<TimerControllerApi['updateConfig']>[0]) => {
    dispatch({ type: 'updateConfig', patch });
  }, []);

  const controller = useMemo<TimerControllerApi>(
    () => ({
      markEnd,
      markStart,
      playPause,
      recordToggle,
      replay,
      reset,
      updateConfig,
    }),
    [markEnd, markStart, playPause, recordToggle, replay, reset, updateConfig],
  );

  const snapshot = createTimerSnapshot(state);
  const uiState = createTimerUiState(state);

  return {
    controller,
    snapshot,
    uiState,
  };
}
