/** Pure wheel-gesture helpers for the cyclic Layout/Theme pickers and the bounded size sliders. */
export interface WheelCycleState {
  pending: number;
  lastTime: number;
}
export const INITIAL_WHEEL_STATE: WheelCycleState = { pending: 0, lastTime: 0 };
export function wheelPixels(deltaX: number, deltaY: number, deltaMode: number, pageWidth: number): number {
  const dominant = Math.abs(deltaY) >= Math.abs(deltaX) ? deltaY : deltaX;
  const multiplier = deltaMode === 1 ? 16 : deltaMode === 2 ? Math.max(1, pageWidth) : 1;
  return Number.isFinite(dominant) ? dominant * multiplier : 0;
}
export function stepSelection<T extends string>(
  options: readonly T[], selected: T, delta: number, now: number, state: WheelCycleState,
): { value: T; state: WheelCycleState; changed: boolean } {
  if (!options.length || !Number.isFinite(delta) || delta === 0) return { value: selected, state, changed: false };
  // A fresh gesture or change of direction must not inherit stale residual movement.
  const expired = now - state.lastTime > 240 || now < state.lastTime;
  const reversed = state.pending !== 0 && Math.sign(state.pending) !== Math.sign(delta);
  const pending = (expired || reversed ? 0 : state.pending) + delta;
  // Mouse wheel notches are normally >= 72px; touchpads add small deltas over time.
  const changed = Math.abs(delta) >= 72 || Math.abs(pending) >= 48;
  const nextState = { pending: changed ? 0 : pending, lastTime: now };
  if (!changed) return { value: selected, state: nextState, changed: false };
  const index = Math.max(0, options.indexOf(selected));
  const direction = Math.sign(delta);
  const next = options[(index + direction + options.length) % options.length]!;
  return { value: next, state: nextState, changed: next !== selected };
}


/** Bounded range control, unlike cyclic Layout/Theme pickers. Scroll up = larger.
 * Trackpad increments are accumulated; a physical mouse-wheel notch is one step.
 */
export function stepRange(
  current: number, min: number, max: number, step: number,
  delta: number, now: number, state: WheelCycleState,
): { value: number; state: WheelCycleState; changed: boolean } {
  if (!Number.isFinite(delta) || delta === 0 ||
      !Number.isFinite(current) || !Number.isFinite(min) ||
      !Number.isFinite(max) || !Number.isFinite(step) ||
      min >= max || step <= 0) {
    return { value: current, state, changed: false };
  }
  const expired = now - state.lastTime > 240 || now < state.lastTime;
  const reversed = state.pending !== 0 && Math.sign(state.pending) !== Math.sign(delta);
  const pending = (expired || reversed ? 0 : state.pending) + delta;
  const ready = Math.abs(delta) >= 72 || Math.abs(pending) >= 48;
  const nextState = { pending: ready ? 0 : pending, lastTime: now };
  if (!ready) return { value: current, state: nextState, changed: false };
  const currentStep = Math.round((current-min)/step);
  const next = Math.min(max, Math.max(min, min + (currentStep + (delta < 0 ? 1 : -1)) * step));
  return { value: next, state: nextState, changed: next !== current };
}
