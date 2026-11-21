/**
 * The state every visualization shares: the algorithm's input, and which
 * recorded step of its trace is on screen. Both are plain values; the trace
 * itself is derived from `input`, never stored.
 */
export type VizState<I> = { readonly input: I; readonly step: number };

export function clampStep(step: number, frameCount: number): number {
  return Math.min(Math.max(0, Math.round(step)), Math.max(0, frameCount - 1));
}

/**
 * The state after the input changes. Someone looking at the final result
 * keeps looking at the final result, so editing the input shows its effect
 * directly; otherwise the step stays put, clamped to the new trace.
 */
export function withInput<I>(
  state: VizState<I>,
  oldFrameCount: number,
  input: I,
  newFrameCount: number,
): VizState<I> {
  const atEnd = state.step >= oldFrameCount - 1;
  return {
    input,
    step: atEnd ? newFrameCount - 1 : clampStep(state.step, newFrameCount),
  };
}

export function stepBy<I>(
  state: VizState<I>,
  delta: number,
  frameCount: number,
): VizState<I> {
  return { ...state, step: clampStep(state.step + delta, frameCount) };
}
