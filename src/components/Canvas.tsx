import { useEffect, useRef, useState } from 'react';
import {
  FRAME_THICKNESS_OPTIONS,
  FRAME_WIDTH_OPTIONS,
  type MarkRange,
  type TimerConfig,
  type TimerSnapshot,
} from '../timer/types';
import './Canvas.css';

const FOOTER_HEIGHT = 86;
const HORIZONTAL_PADDING = 18;
const ROW_GUTTER = 30;

interface CanvasProps {
  snapshot: TimerSnapshot;
}

interface CanvasSize {
  width: number;
  height: number;
}

interface CanvasLayout {
  beginX: number;
  beginY: number;
  blockHeight: number;
  blockWidth: number;
  centerX: number;
  checkInterval: number;
  columns: number;
  cssHeight: number;
  cssWidth: number;
  oneSecondBlockHeight: number;
  rowHeight: number;
  rowWidth: number;
  rows: number;
  totalSeconds: number;
}

function getCanvasContext(canvas: HTMLCanvasElement, width: number, height: number) {
  const devicePixelRatio = window.devicePixelRatio || 1;
  const nextWidth = Math.floor(width * devicePixelRatio);
  const nextHeight = Math.floor(height * devicePixelRatio);

  if (canvas.width !== nextWidth || canvas.height !== nextHeight) {
    canvas.width = nextWidth;
    canvas.height = nextHeight;
  }

  const context = canvas.getContext('2d');

  if (!context) {
    return null;
  }

  context.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
  return context;
}

function getCheckInterval(fps: number) {
  const computed = fps % 5 === 0 ? Math.floor(fps / 5) : Math.floor(fps / 4);
  return Math.max(1, computed);
}

function createLayout(size: CanvasSize, config: TimerConfig) {
  if (size.width === 0 || size.height === 0) {
    return null;
  }

  const blockWidth = FRAME_WIDTH_OPTIONS[config.frameWidth];
  const blockHeight = FRAME_THICKNESS_OPTIONS[config.frameThickness];
  const oneSecondBlockHeight = config.fps * blockHeight;
  const workingHeight = Math.max(oneSecondBlockHeight, size.height - FOOTER_HEIGHT);
  const columns = Math.max(1, Math.floor(workingHeight / oneSecondBlockHeight));
  const rows = Math.ceil(config.totalSeconds / columns);
  const rowHeight = oneSecondBlockHeight * columns;
  const rowWidth = blockWidth + ROW_GUTTER;
  const beginX = HORIZONTAL_PADDING + Math.max(0, Math.round((size.width - rowWidth * rows) / 2));
  const beginY = Math.max(12, Math.round((workingHeight - rowHeight) / 2));

  return {
    beginX,
    beginY,
    blockHeight,
    blockWidth,
    centerX: Math.floor(size.width / 2),
    checkInterval: getCheckInterval(config.fps),
    columns,
    cssHeight: size.height,
    cssWidth: size.width,
    oneSecondBlockHeight,
    rowHeight,
    rowWidth,
    rows,
    totalSeconds: config.totalSeconds,
  } satisfies CanvasLayout;
}

function formatDuration(ms: number) {
  const safeMs = Math.max(ms, 0);
  const minutes = Math.floor(safeMs / 60000);
  const seconds = Math.floor((safeMs % 60000) / 1000);
  const milliseconds = Math.floor(safeMs % 1000);

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(
    milliseconds,
  ).padStart(3, '0')}`;
}

function getVisibleMarks(snapshot: TimerSnapshot) {
  if (snapshot.pendingMarkStartMs === null || snapshot.mode !== 'record') {
    return snapshot.marks;
  }

  if (snapshot.elapsedMs <= snapshot.pendingMarkStartMs) {
    return snapshot.marks;
  }

  return [
    ...snapshot.marks,
    {
      endMs: snapshot.elapsedMs,
      startMs: snapshot.pendingMarkStartMs,
    },
  ];
}

function drawStaticLayer(
  context: CanvasRenderingContext2D,
  layout: CanvasLayout,
  config: TimerConfig,
) {
  context.clearRect(0, 0, layout.cssWidth, layout.cssHeight);
  context.fillStyle = '#20262b';
  context.fillRect(0, 0, layout.cssWidth, layout.cssHeight);

  for (let second = 0; second < config.totalSeconds; second += 1) {
    const column = second % layout.columns;
    const row = Math.floor(second / layout.columns);
    const blockBeginX = layout.beginX + row * layout.rowWidth;
    const blockBeginY = layout.beginY + column * layout.oneSecondBlockHeight;

    if (column === 0) {
      const remainingRows = config.totalSeconds % layout.columns;
      const rectHeight =
        row + 1 === layout.rows && remainingRows !== 0
          ? layout.oneSecondBlockHeight * remainingRows
          : layout.rowHeight;

      context.fillStyle = '#d3d6da';
      context.fillRect(blockBeginX, blockBeginY, layout.blockWidth, rectHeight);
      context.strokeStyle = '#666d73';
      context.strokeRect(blockBeginX + 1, blockBeginY + 1, layout.blockWidth - 2, rectHeight - 2);
      context.strokeStyle = '#2d3439';
      context.strokeRect(blockBeginX, blockBeginY, layout.blockWidth, rectHeight);
    }

    context.fillStyle = '#95a0a8';
    context.font = '11px Roboto';
    context.textAlign = 'right';
    context.fillText(`${second}`, blockBeginX - 4, blockBeginY + 4);

    if (column + 1 === layout.columns || second + 1 === config.totalSeconds) {
      context.fillText(
        `${second + 1}`,
        blockBeginX - 4,
        blockBeginY + layout.oneSecondBlockHeight + 4,
      );
    }

    for (let frame = 0; frame < config.fps; frame += 1) {
      if (frame > 0 && frame % 2 === 1) {
        context.fillStyle = '#8a959d';
        context.font = '7px Roboto';
        context.textAlign = 'left';
        context.fillText(
          `${frame + 1}`,
          blockBeginX + layout.blockWidth + 4,
          blockBeginY + frame * layout.blockHeight + layout.blockHeight / 2 + 3,
        );
      }

      context.strokeStyle = frame % layout.checkInterval === 0 ? '#000000' : '#34393d';
      context.beginPath();
      context.moveTo(blockBeginX, blockBeginY + frame * layout.blockHeight);
      context.lineTo(blockBeginX + layout.blockWidth, blockBeginY + frame * layout.blockHeight);
      context.stroke();
    }
  }
}

function drawMarks(context: CanvasRenderingContext2D, layout: CanvasLayout, marks: MarkRange[]) {
  if (marks.length === 0) {
    return;
  }

  context.fillStyle = 'rgba(255, 105, 180, 0.72)';

  for (let second = 0; second < layout.totalSeconds; second += 1) {
    const column = second % layout.columns;
    const row = Math.floor(second / layout.columns);
    const blockBeginX = layout.beginX + row * layout.rowWidth;
    const blockBeginY = layout.beginY + column * layout.oneSecondBlockHeight;

    for (const mark of marks) {
      const startSecond = mark.startMs / 1000;
      const endSecond = mark.endMs / 1000;

      if (startSecond >= second + 1) {
        continue;
      }

      if (endSecond <= second) {
        continue;
      }

      const startOffset = Math.max(0, startSecond - second);
      const endOffset = Math.min(1, endSecond - second);

      if (endOffset <= startOffset) {
        continue;
      }

      context.fillRect(
        blockBeginX + 1,
        blockBeginY + startOffset * layout.oneSecondBlockHeight,
        layout.blockWidth - 2,
        (endOffset - startOffset) * layout.oneSecondBlockHeight,
      );
    }
  }
}

function drawProgressLine(
  context: CanvasRenderingContext2D,
  layout: CanvasLayout,
  elapsedMs: number,
  color: string,
) {
  const totalOffset = (elapsedMs / 1000) * layout.oneSecondBlockHeight;
  const maxOffset = layout.oneSecondBlockHeight * layout.totalSeconds;
  const clampedOffset = clampNumber(totalOffset, 0, maxOffset);
  let row = Math.floor(clampedOffset / layout.rowHeight);
  let position = clampedOffset % layout.rowHeight;

  if (position === 0 && clampedOffset > 0) {
    row = Math.max(0, row - 1);
    position = layout.rowHeight;
  }

  context.strokeStyle = color;
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(layout.beginX + row * layout.rowWidth - 10, layout.beginY + position);
  context.lineTo(
    layout.beginX + row * layout.rowWidth + layout.blockWidth + 10,
    layout.beginY + position,
  );
  context.stroke();
}

function drawFooter(
  context: CanvasRenderingContext2D,
  layout: CanvasLayout,
  snapshot: TimerSnapshot,
) {
  context.fillStyle = '#eff3f7';
  context.font = '600 28px Roboto';
  context.textAlign = 'center';
  context.fillText(
    formatDuration(snapshot.displayElapsedMs),
    layout.centerX,
    layout.cssHeight - 40,
  );

  context.fillStyle = '#8ca0b3';
  context.font = '12px Roboto';

  if (snapshot.mode === 'countdown' && snapshot.countdownTarget !== null) {
    context.fillText(
      `Prepare to ${snapshot.countdownTarget === 'record' ? 'record' : 'play'}`,
      layout.centerX,
      layout.cssHeight - 16,
    );
    return;
  }

  const footerLabel =
    snapshot.recordedDurationMs !== null
      ? `Recorded take ${formatDuration(snapshot.recordedDurationMs)}`
      : `Target duration ${formatDuration(snapshot.totalDurationMs)}`;

  context.fillText(footerLabel, layout.centerX, layout.cssHeight - 16);
}

function drawCountdownOverlay(
  context: CanvasRenderingContext2D,
  layout: CanvasLayout,
  snapshot: TimerSnapshot,
) {
  if (snapshot.mode !== 'countdown' || snapshot.countdownTarget === null) {
    return;
  }

  const panelWidth = 220;
  const panelHeight = 96;
  const panelX = layout.centerX - panelWidth / 2;
  const panelY = Math.max(20, layout.beginY + layout.rowHeight / 2 - panelHeight / 2);

  context.fillStyle = 'rgba(11, 15, 18, 0.8)';
  context.strokeStyle = 'rgba(113, 212, 254, 0.45)';
  context.lineWidth = 1;
  context.beginPath();
  context.roundRect(panelX, panelY, panelWidth, panelHeight, 18);
  context.fill();
  context.stroke();

  context.fillStyle = '#71d4fe';
  context.font = '600 15px Roboto';
  context.textAlign = 'center';
  context.fillText(
    snapshot.countdownTarget === 'record' ? 'Ready to record' : 'Ready to play',
    layout.centerX,
    panelY + 30,
  );

  context.fillStyle = '#f6f9fb';
  context.font = '700 30px Roboto';
  context.fillText(formatDuration(snapshot.prepareRemainingMs), layout.centerX, panelY + 67);
}

function clampNumber(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function drawFrame(
  context: CanvasRenderingContext2D,
  layout: CanvasLayout,
  snapshot: TimerSnapshot,
  staticLayer: HTMLCanvasElement | null,
) {
  context.clearRect(0, 0, layout.cssWidth, layout.cssHeight);

  if (staticLayer !== null) {
    context.drawImage(staticLayer, 0, 0, layout.cssWidth, layout.cssHeight);
  }

  drawMarks(context, layout, getVisibleMarks(snapshot));

  if (snapshot.mode !== 'countdown' && (snapshot.hasRecording || snapshot.mode === 'record')) {
    const progressColor =
      snapshot.mode === 'record' ? '#ff6978' : snapshot.mode === 'pause' ? '#ffb84d' : '#71d4fe';
    drawProgressLine(context, layout, snapshot.elapsedMs, progressColor);
  }

  drawFooter(context, layout, snapshot);
  drawCountdownOverlay(context, layout, snapshot);
}

function Canvas({ snapshot }: CanvasProps) {
  const shellRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const staticLayerRef = useRef<HTMLCanvasElement | null>(null);
  const [size, setSize] = useState<CanvasSize>({
    height: 0,
    width: 0,
  });

  useEffect(() => {
    const element = shellRef.current;

    if (!element) {
      return;
    }

    const observer = new ResizeObserver((entries) => {
      const [entry] = entries;

      if (!entry) {
        return;
      }

      setSize({
        height: Math.floor(entry.contentRect.height),
        width: Math.floor(entry.contentRect.width),
      });
    });

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    const layout = createLayout(size, snapshot.config);

    if (!layout) {
      return;
    }

    const staticLayer = staticLayerRef.current ?? document.createElement('canvas');
    const context = getCanvasContext(staticLayer, size.width, size.height);

    if (!context) {
      return;
    }

    staticLayerRef.current = staticLayer;
    drawStaticLayer(context, layout, snapshot.config);
  }, [size, snapshot.config]);

  useEffect(() => {
    const layout = createLayout(size, snapshot.config);
    const canvas = canvasRef.current;

    if (!canvas || !layout) {
      return;
    }

    const context = getCanvasContext(canvas, size.width, size.height);

    if (!context) {
      return;
    }

    drawFrame(context, layout, snapshot, staticLayerRef.current);
  }, [size, snapshot]);

  return (
    <div className="canvas-shell" ref={shellRef}>
      <canvas className="canvas" ref={canvasRef} />
    </div>
  );
}

export default Canvas;
