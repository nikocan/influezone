import { toNormalized, toRendered, isValidTag } from './tagging';

describe('product tag coordinates', () => {
  const intrinsic = { width: 1000, height: 1250 }; // 4:5

  it('round-trips a click through normalized coordinates (contain)', () => {
    const box = { width: 400, height: 500 };
    const n = toNormalized(120, 300, box, intrinsic, 'contain')!;
    const r = toRendered(n.x, n.y, box, intrinsic, 'contain');
    expect(r.left).toBeCloseTo(120, 0);
    expect(r.top).toBeCloseTo(300, 0);
  });

  it('ignores clicks in the letterbox area', () => {
    // 4:5 media inside a square box leaves bars left/right
    expect(toNormalized(5, 200, { width: 500, height: 500 }, intrinsic, 'contain')).toBeNull();
  });

  it('keeps the tag on the same product across aspect ratios (cover)', () => {
    const n = { x: 0.5, y: 0.25 };
    const square = toRendered(n.x, n.y, { width: 500, height: 500 }, intrinsic, 'cover');
    const tall = toRendered(n.x, n.y, { width: 400, height: 500 }, intrinsic, 'cover');
    expect(square.left).toBeCloseTo(250);
    expect(tall.left).toBeCloseTo(200);
    // in the square crop the top/bottom are cut: y=0.25 of 625px rendered height minus 62.5 offset
    expect(square.top).toBeCloseTo(0.25 * 625 - 62.5);
    expect(tall.top).toBeCloseTo(125);
  });

  it('reports tags cropped out by object-fit: cover as not visible', () => {
    const r = toRendered(0.5, 0.02, { width: 500, height: 300 }, intrinsic, 'cover');
    expect(r.visible).toBe(false);
  });

  it('validates range', () => {
    expect(isValidTag(0, 1)).toBe(true);
    expect(isValidTag(-0.1, 0.5)).toBe(false);
    expect(isValidTag(Number.NaN, 0.5)).toBe(false);
  });
});
