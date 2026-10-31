import { clamp } from './utils';

/**
 * Product tag coordinates are stored normalized (0..1) relative to the media's
 * intrinsic width/height. Rendering converts them to the displayed box, accounting
 * for object-fit: cover cropping so tags stay on the same product across aspect ratios.
 */

export interface Box { width: number; height: number }

/** Convert a click inside the rendered element to normalized media coordinates. */
export function toNormalized(
  clickX: number,
  clickY: number,
  rendered: Box,
  intrinsic: Box,
  fit: 'cover' | 'contain' = 'contain',
): { x: number; y: number } | null {
  const { scale, offsetX, offsetY } = fitTransform(rendered, intrinsic, fit);
  const mx = (clickX - offsetX) / scale;
  const my = (clickY - offsetY) / scale;
  if (mx < 0 || my < 0 || mx > intrinsic.width || my > intrinsic.height) return null;
  return { x: round4(mx / intrinsic.width), y: round4(my / intrinsic.height) };
}

/** Convert normalized coordinates to a position (in px) in the rendered element. Returns visible=false if cropped out. */
export function toRendered(
  x: number,
  y: number,
  rendered: Box,
  intrinsic: Box,
  fit: 'cover' | 'contain' = 'cover',
): { left: number; top: number; visible: boolean } {
  const { scale, offsetX, offsetY } = fitTransform(rendered, intrinsic, fit);
  const left = offsetX + x * intrinsic.width * scale;
  const top = offsetY + y * intrinsic.height * scale;
  const visible = left >= 0 && top >= 0 && left <= rendered.width && top <= rendered.height;
  return { left: clamp(left, 0, rendered.width), top: clamp(top, 0, rendered.height), visible };
}

export function fitTransform(rendered: Box, intrinsic: Box, fit: 'cover' | 'contain') {
  const sx = rendered.width / intrinsic.width;
  const sy = rendered.height / intrinsic.height;
  const scale = fit === 'cover' ? Math.max(sx, sy) : Math.min(sx, sy);
  const offsetX = (rendered.width - intrinsic.width * scale) / 2;
  const offsetY = (rendered.height - intrinsic.height * scale) / 2;
  return { scale, offsetX, offsetY };
}

export function isValidTag(x: number, y: number) {
  return Number.isFinite(x) && Number.isFinite(y) && x >= 0 && x <= 1 && y >= 0 && y <= 1;
}

function round4(n: number) {
  return Math.round(n * 10000) / 10000;
}
