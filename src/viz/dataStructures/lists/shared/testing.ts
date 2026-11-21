/** Helpers for the trace tests in this folder. */
import type { Frame } from "../../../../core/trace";
import type { Op } from "../../opScript";
import type { Vars } from "./tracer";

/**
 * One entry per op, as the Python reference prints it: the repr of what the
 * op returned, the exception line, or "-" for an op that returned nothing.
 */
export function echoesByOp<O>(
  ops: readonly Op[],
  frames: readonly Frame<Vars<O>>[],
): string[] {
  const echoes = frames.at(-1)!.vars.echoes;
  return ops.map((op) => echoes.find((e) => e.op === op.id)?.text ?? "-");
}
