import { ThemeProvider, createTheme } from '@mui/material';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import Controller from './Controller';
import type { TimerControllerApi, TimerUiState } from '../timer/types';

function renderController(uiState: TimerUiState, overrides?: Partial<TimerControllerApi>) {
  const controller: TimerControllerApi = {
    markEnd: vi.fn(),
    markStart: vi.fn(),
    playPause: vi.fn(),
    recordToggle: vi.fn(),
    replay: vi.fn(),
    reset: vi.fn(),
    updateConfig: vi.fn(),
    ...overrides,
  };

  render(
    <ThemeProvider theme={createTheme()}>
      <Controller controller={controller} uiState={uiState} />
    </ThemeProvider>,
  );

  return controller;
}

describe('Controller', () => {
  it('routes button clicks and hotkeys to the same actions', async () => {
    const user = userEvent.setup();
    const controller = renderController({
      canMark: false,
      canPlay: true,
      canRecord: true,
      canReplay: true,
      canReset: true,
      config: {
        fps: 24,
        frameThickness: 'normal',
        frameWidth: 'normal',
        prepareSeconds: 3,
        totalSeconds: 21,
      },
      countdownTarget: null,
      hasRecording: true,
      isMarking: false,
      mode: 'ready',
    });

    await user.click(screen.getByRole('button', { name: 'Replay' }));
    fireEvent.keyDown(window, { code: 'KeyR', key: 'r' });
    expect(controller.replay).toHaveBeenCalledTimes(2);

    await user.click(screen.getByRole('button', { name: 'Play' }));
    fireEvent.keyDown(window, { code: 'Space', key: ' ' });
    expect(controller.playPause).toHaveBeenCalledTimes(2);

    await user.click(screen.getByRole('button', { name: 'Reset' }));
    fireEvent.keyDown(window, { code: 'KeyE', key: 'e' });
    expect(controller.reset).toHaveBeenCalledTimes(2);

    await user.click(screen.getByRole('button', { name: 'Rec' }));
    fireEvent.keyDown(window, { code: 'KeyC', key: 'c' });
    expect(controller.recordToggle).toHaveBeenCalledTimes(2);
  });

  it('starts and ends marks from the button and Shift key while recording', async () => {
    const user = userEvent.setup();
    const controller = renderController({
      canMark: true,
      canPlay: false,
      canRecord: true,
      canReplay: false,
      canReset: false,
      config: {
        fps: 24,
        frameThickness: 'normal',
        frameWidth: 'normal',
        prepareSeconds: 3,
        totalSeconds: 21,
      },
      countdownTarget: null,
      hasRecording: false,
      isMarking: false,
      mode: 'record',
    });

    await user.pointer([
      {
        keys: '[MouseLeft>]',
        target: screen.getByRole('button', { name: 'Mark' }),
      },
      {
        keys: '[/MouseLeft]',
        target: screen.getByRole('button', { name: 'Mark' }),
      },
    ]);

    expect(controller.markStart).toHaveBeenCalledTimes(1);
    expect(controller.markEnd).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(window, { code: 'ShiftLeft', key: 'Shift' });
    expect(controller.markStart).toHaveBeenCalledTimes(2);
    fireEvent.keyUp(window, { code: 'ShiftLeft', key: 'Shift' });
    expect(controller.markEnd).toHaveBeenCalledTimes(2);
  });
});
