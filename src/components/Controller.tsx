import BorderColorIcon from '@mui/icons-material/BorderColor';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import KeyboardIcon from '@mui/icons-material/Keyboard';
import PauseIcon from '@mui/icons-material/Pause';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import ReplayIcon from '@mui/icons-material/Replay';
import SettingsBackupRestoreIcon from '@mui/icons-material/SettingsBackupRestore';
import SettingsApplicationsIcon from '@mui/icons-material/SettingsApplications';
import StopIcon from '@mui/icons-material/Stop';
import {
  Box,
  Button,
  ButtonGroup,
  Card,
  CardContent,
  CardHeader,
  Collapse,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { memo, useEffect, useState } from 'react';
import type { TimerControllerApi, TimerUiState } from '../timer/types';
import Hotkey from './Hotkey';
import './Controller.css';

interface ControllerProps {
  controller: TimerControllerApi;
  uiState: TimerUiState;
}

const STATUS_LABELS = {
  countdown: {
    play: 'Prepare to play',
    record: 'Prepare to record',
  },
  init: 'Record a reference take to enable playback.',
  pause: 'Playback paused.',
  play: 'Playing the saved take.',
  ready: 'Ready for playback or a new take.',
  record: 'Recording a new take.',
};

function isInteractiveTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return (
    target.isContentEditable || ['INPUT', 'OPTION', 'SELECT', 'TEXTAREA'].includes(target.tagName)
  );
}

const Controller = memo(function Controller({ controller, uiState }: ControllerProps) {
  const [isShowSetting, setShowSetting] = useState(false);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isInteractiveTarget(event.target)) {
        return;
      }

      if (event.repeat && !event.code.startsWith('Shift')) {
        return;
      }

      switch (event.code) {
        case 'KeyR':
          if (uiState.canReplay) {
            event.preventDefault();
            controller.replay();
          }
          break;
        case 'Space':
          if (uiState.canPlay) {
            event.preventDefault();
            controller.playPause();
          }
          break;
        case 'KeyE':
          if (uiState.canReset) {
            event.preventDefault();
            controller.reset();
          }
          break;
        case 'KeyC':
          if (uiState.canRecord) {
            event.preventDefault();
            controller.recordToggle();
          }
          break;
        case 'ShiftLeft':
        case 'ShiftRight':
          if (uiState.canMark) {
            event.preventDefault();
            controller.markStart();
          }
          break;
        default:
          break;
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.code === 'ShiftLeft' || event.code === 'ShiftRight') {
        controller.markEnd();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [
    controller,
    uiState.canMark,
    uiState.canPlay,
    uiState.canRecord,
    uiState.canReplay,
    uiState.canReset,
  ]);

  const statusLabel =
    uiState.mode === 'countdown' && uiState.countdownTarget
      ? STATUS_LABELS.countdown[uiState.countdownTarget]
      : STATUS_LABELS[uiState.mode];

  const playLabel =
    uiState.mode === 'play'
      ? 'Pause'
      : uiState.mode === 'pause'
        ? 'Resume'
        : uiState.mode === 'countdown' && uiState.countdownTarget === 'play'
          ? 'Cancel'
          : 'Play';

  const resetOrMarkLabel =
    uiState.mode === 'record' ? (uiState.isMarking ? 'Marking' : 'Mark') : 'Reset';

  const recordLabel =
    uiState.mode === 'record'
      ? 'Stop'
      : uiState.mode === 'countdown' && uiState.countdownTarget === 'record'
        ? 'Cancel'
        : 'Rec';

  return (
    <div className="controller-shell">
      <div className="controller-inner">
        <div className="controller-status">
          <Typography variant="overline">AniTimer</Typography>
          <Typography variant="body2">{statusLabel}</Typography>
        </div>

        <Collapse in={isShowSetting} timeout={160}>
          <Card className="settings-card" elevation={0}>
            <CardHeader
              avatar={<SettingsApplicationsIcon color="primary" />}
              subheader="Reference take options"
              title="Settings"
            />
            <CardContent>
              <div className="settings-grid">
                <div className="settings-field">
                  <TextField
                    fullWidth
                    label="Seconds"
                    size="small"
                    type="number"
                    value={uiState.config.totalSeconds}
                    onChange={(event) => {
                      controller.updateConfig({
                        totalSeconds: Number(event.target.value) || 0,
                      });
                    }}
                  />
                </div>

                <div className="settings-field">
                  <TextField
                    fullWidth
                    label="Frames Per Second"
                    size="small"
                    type="number"
                    value={uiState.config.fps}
                    onChange={(event) => {
                      controller.updateConfig({
                        fps: Number(event.target.value) || 0,
                      });
                    }}
                  />
                </div>

                <div className="settings-field">
                  <TextField
                    fullWidth
                    label="Time to Prepare"
                    size="small"
                    type="number"
                    value={uiState.config.prepareSeconds}
                    onChange={(event) => {
                      controller.updateConfig({
                        prepareSeconds: Number(event.target.value) || 0,
                      });
                    }}
                  />
                </div>

                <div className="settings-field settings-field-wide">
                  <FormControl fullWidth size="small">
                    <InputLabel id="frame-width-label">1 Frame Size</InputLabel>
                    <Select
                      label="1 Frame Size"
                      labelId="frame-width-label"
                      value={uiState.config.frameWidth}
                      onChange={(event) => {
                        controller.updateConfig({
                          frameWidth: event.target.value as TimerUiState['config']['frameWidth'],
                        });
                      }}
                    >
                      <MenuItem value="small">Small</MenuItem>
                      <MenuItem value="normal">Normal</MenuItem>
                      <MenuItem value="large">Large</MenuItem>
                    </Select>
                  </FormControl>
                </div>

                <div className="settings-field settings-field-wide">
                  <FormControl fullWidth size="small">
                    <InputLabel id="frame-thickness-label">Thickness</InputLabel>
                    <Select
                      label="Thickness"
                      labelId="frame-thickness-label"
                      value={uiState.config.frameThickness}
                      onChange={(event) => {
                        controller.updateConfig({
                          frameThickness: event.target
                            .value as TimerUiState['config']['frameThickness'],
                        });
                      }}
                    >
                      <MenuItem value="small">Small</MenuItem>
                      <MenuItem value="normal">Normal</MenuItem>
                      <MenuItem value="large">Large</MenuItem>
                    </Select>
                  </FormControl>
                </div>
              </div>
            </CardContent>

            <CardHeader
              avatar={<KeyboardIcon color="primary" />}
              subheader="Global keyboard shortcuts"
              title="Hotkeys"
            />
            <CardContent>
              <Stack direction="row" flexWrap="wrap" gap={1.5}>
                <Box className="hotkey-entry">
                  Replay <Hotkey hotkey="R" />
                </Box>
                <Box className="hotkey-entry">
                  Play / Pause <Hotkey hotkey="Space" />
                </Box>
                <Box className="hotkey-entry">
                  Reset <Hotkey hotkey="E" />
                </Box>
                <Box className="hotkey-entry">
                  Mark (hold) <Hotkey hotkey="Shift" />
                </Box>
                <Box className="hotkey-entry">
                  Rec / Stop <Hotkey hotkey="C" />
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Collapse>

        <ButtonGroup className="controller-actions" color="primary" variant="outlined">
          <Button
            disabled={!uiState.canReplay}
            onClick={controller.replay}
            startIcon={<ReplayIcon />}
          >
            Replay
          </Button>

          <Button
            color={uiState.mode === 'play' ? 'warning' : 'success'}
            disabled={!uiState.canPlay}
            onClick={controller.playPause}
            startIcon={uiState.mode === 'play' ? <PauseIcon /> : <PlayArrowIcon />}
          >
            {playLabel}
          </Button>

          <Button
            color={uiState.mode === 'record' ? 'secondary' : 'inherit'}
            disabled={uiState.mode === 'record' ? false : !uiState.canReset}
            onClick={uiState.mode === 'record' ? undefined : controller.reset}
            onMouseDown={uiState.mode === 'record' ? controller.markStart : undefined}
            onMouseUp={uiState.mode === 'record' ? controller.markEnd : undefined}
            onTouchEnd={uiState.mode === 'record' ? controller.markEnd : undefined}
            onTouchStart={uiState.mode === 'record' ? controller.markStart : undefined}
            startIcon={
              uiState.mode === 'record' ? <BorderColorIcon /> : <SettingsBackupRestoreIcon />
            }
          >
            {resetOrMarkLabel}
          </Button>

          <Button
            color="error"
            disabled={!uiState.canRecord}
            onClick={controller.recordToggle}
            startIcon={uiState.mode === 'record' ? <StopIcon /> : <FiberManualRecordIcon />}
          >
            {recordLabel}
          </Button>

          <Button
            aria-label="toggle-settings"
            onClick={() => {
              setShowSetting((previous) => !previous);
            }}
          >
            {isShowSetting ? <ExpandMoreIcon /> : <ExpandLessIcon />}
          </Button>
        </ButtonGroup>
      </div>
    </div>
  );
});

export default Controller;
