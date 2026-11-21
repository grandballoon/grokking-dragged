/**
 * Pure edits on an operation script made by dragging in the diagram rather
 * than in the script itself: dropping a new value onto the list adds an
 * insert, pulling a node out adds a delete. The new op goes right after the
 * op the reader is looking at, so it acts on the structure on screen, and
 * the view jumps to the end of that new op so its effect shows at once.
 */
import type { Frame } from "../../../../core/trace";
import type { VizState } from "../../../../core/stepping";
import type { Call, Op } from "../../opScript";

/** Scripts stop growing at this many ops, so the script column fits. */
export const MAX_OPS = 12;

/** Arguments stay within this range, as the script's nudge buttons do. */
export const ARG_RANGE = [-99, 99] as const;

export type ScriptInput = { readonly ops: readonly Op[] };

export function canAddOp(ops: readonly Op[]): boolean {
  return ops.length < MAX_OPS;
}

/** An op id no op in the script has yet. */
export function nextOpId(ops: readonly Op[]): string {
  const used = new Set(ops.map((o) => o.id));
  let k = ops.length;
  while (used.has(`op${k}`)) k++;
  return `op${k}`;
}

/** A value to offer for the next insert: one more than any argument so far. */
export function nextValue(ops: readonly Op[]): number {
  return clampArg(Math.max(0, ...ops.flatMap((o) => o.args)) + 1);
}

function clampArg(value: number): number {
  return Math.min(ARG_RANGE[1], Math.max(ARG_RANGE[0], value));
}

/** The script with `op` inserted after the op at `current` (or first). */
export function insertAfter(
  ops: readonly Op[],
  current: number | null,
  op: Op,
): { readonly ops: Op[]; readonly at: number } {
  const at = current === null ? 0 : current + 1;
  return { ops: [...ops.slice(0, at), op, ...ops.slice(at)], at };
}

/**
 * The state after adding `call` after op `current`, showing the last frame
 * of the new op. `run` is the visualization's port.
 */
export function addOpState<I extends ScriptInput, V extends { op: number | null }>(
  input: I,
  current: number | null,
  [name, ...args]: Call,
  run: (input: I) => readonly Frame<V>[],
): VizState<I> {
  const op: Op = { id: nextOpId(input.ops), name, args };
  const { ops, at } = insertAfter(input.ops, current, op);
  const next = { ...input, ops };
  const frames = run(next);
  let step = frames.length - 1;
  while (step > 0 && frames[step]!.vars.op !== at) step--;
  return { input: next, step };
}
