import { createInitialTimerState, timerReducer } from './timerMachine';

describe('timerMachine', () => {
  it('records with a prepare countdown and stores marks', () => {
    let state = createInitialTimerState();

    state = timerReducer(state, { type: 'recordToggle' });
    expect(state.mode).toBe('countdown');
    expect(state.countdownTarget).toBe('record');

    state = timerReducer(state, { type: 'tick', deltaMs: 3000 });
    expect(state.mode).toBe('record');
    expect(state.elapsedMs).toBe(0);

    state = timerReducer(state, { type: 'markStart' });
    state = timerReducer(state, { type: 'tick', deltaMs: 400 });
    state = timerReducer(state, { type: 'markEnd' });
    state = timerReducer(state, { type: 'tick', deltaMs: 600 });
    state = timerReducer(state, { type: 'recordToggle' });

    expect(state.mode).toBe('ready');
    expect(state.recordedDurationMs).toBe(1000);
    expect(state.marks).toEqual([
      {
        endMs: 400,
        startMs: 0,
      },
    ]);
  });

  it('plays, pauses, resumes, and stops at the recorded duration', () => {
    let state = createInitialTimerState();

    state = timerReducer(state, { type: 'recordToggle' });
    state = timerReducer(state, { type: 'tick', deltaMs: 3000 });
    state = timerReducer(state, { type: 'tick', deltaMs: 1200 });
    state = timerReducer(state, { type: 'recordToggle' });

    state = timerReducer(state, { type: 'playPause' });
    expect(state.mode).toBe('countdown');

    state = timerReducer(state, { type: 'tick', deltaMs: 3000 });
    expect(state.mode).toBe('play');

    state = timerReducer(state, { type: 'tick', deltaMs: 500 });
    expect(state.elapsedMs).toBe(500);

    state = timerReducer(state, { type: 'playPause' });
    expect(state.mode).toBe('pause');

    state = timerReducer(state, { type: 'playPause' });
    expect(state.mode).toBe('play');

    state = timerReducer(state, { type: 'tick', deltaMs: 700 });
    expect(state.mode).toBe('ready');
    expect(state.elapsedMs).toBe(1200);
  });

  it('trims marks and the recorded duration when total duration shrinks', () => {
    let state = createInitialTimerState({
      fps: 24,
      frameThickness: 'normal',
      frameWidth: 'normal',
      prepareSeconds: 0,
      totalSeconds: 5,
    });

    state = timerReducer(state, { type: 'recordToggle' });
    state = timerReducer(state, { type: 'tick', deltaMs: 4500 });
    state = timerReducer(state, { type: 'markStart' });
    state = timerReducer(state, { type: 'tick', deltaMs: 500 });

    state = timerReducer(state, {
      patch: { totalSeconds: 3 },
      type: 'updateConfig',
    });

    expect(state.recordedDurationMs).toBe(3000);
    expect(state.marks).toEqual([]);
  });
});
