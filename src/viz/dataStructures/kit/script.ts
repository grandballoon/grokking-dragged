/**
 * Running an operation script against a ported data structure, the way a
 * Python demo would: one method call per op, in order. A call that raises
 * has already recorded a frame at its `raise` line; the demo reports it and
 * carries on with the next call.
 */
import type { Op } from "../opScript";
import { attempt, type PyError } from "./pyError";

export type ScriptRunner = {
  /** Index of the op running, or null before the first (while the structure is built). */
  readonly op: number | null;
  /**
   * A fresh node uid, named after the op that makes the node (`init` before
   * the first op): `op3`, then `op3_2`, ... A node keeps its uid when the
   * script is reordered, so the drawing can follow it.
   */
  newUid(): string;
  /** Run `call` for each op; a `PyError` goes to `onRaise` and the script goes on. */
  run(call: (op: Op) => void, onRaise?: (error: PyError) => void): void;
};

export function scriptRunner(ops: readonly Op[]): ScriptRunner {
  let op: number | null = null;
  const made = new Map<string, number>();
  return {
    get op() {
      return op;
    },
    newUid() {
      const id = op === null ? "init" : ops[op]!.id;
      const count = (made.get(id) ?? 0) + 1;
      made.set(id, count);
      return count === 1 ? id : `${id}_${count}`;
    },
    run(call, onRaise) {
      ops.forEach((each, i) => {
        op = i;
        const error = attempt(() => call(each));
        if (error !== null) onRaise?.(error);
      });
    },
  };
}
