/**
 * A demo of core.py's `Array` on its own: build one, then run a script of
 * `a[index] = val` and `a[index]` calls against it, stepping through
 * `__init__`, `__setitem__` and `__getitem__`. A `__setitem__` op's args are
 * `[index, val]`; a `__getitem__` op's are `[index]`.
 */
import { recorder, type Frame } from "../../../../core/trace";
import { script, withLabels, type Op } from "../../opScript";
import { ARRAY_CORE } from "../../sources";
import { Array, item, type ArrayData, type CoreTrace } from "../coreArray";
import type { Outcome } from "../../kit/outcome";
import { PyError } from "../../kit/pyError";
import { scriptRunner } from "../../kit/script";

export const SRC = ARRAY_CORE;

export type Input = {
  /** `Array(size)`. */
  readonly size: number;
  /** `__setitem__(index, val)` and `__getitem__(index)` calls. */
  readonly ops: readonly Op[];
};

export type Vars = {
  self: ArrayData;
  fill: number | null;
  index: number | null;
  val: number | null;
  /** What `__getitem__` returned, once it has. */
  returned: Outcome | null;
  /** The exception the current call raised, as `IndexError: ...`. */
  error: string | null;
  /** Index of the op being run, or null while the array is being built. */
  op: number | null;
};

/** The calls read as Python writes them: `a[3] = 2`, `a[3]`. */
const CORE_LABELS = { __setitem__: "a[{0}] = {1}", __getitem__: "a[{0}]" };

export const INITIAL_INPUT: Input = {
  size: 5,
  ops: withLabels(
    script(
      ["__setitem__", 0, 7],
      ["__setitem__", 3, 2],
      ["__getitem__", 3],
      ["__getitem__", 1],
      ["__setitem__", 5, 1],
      ["__getitem__", -1],
      ["__setitem__", 4, 9],
    ),
    CORE_LABELS,
  ),
};

export function run(input: Input): Frame<Vars>[] {
  const rec = recorder<Vars>();
  const step = rec.in(SRC);
  const runner = scriptRunner(input.ops);
  const trace: CoreTrace = (where, self, note, locals = {}) =>
    step(
      where,
      {
        self,
        fill: locals.fill ?? null,
        index: locals.index ?? null,
        val: locals.val ?? null,
        returned: locals.returned ?? null,
        error: locals.error ?? null,
        op: runner.op,
      },
      note,
    );

  let a: Array;
  try {
    // core.py's Array, not the built-in one.
    // eslint-disable-next-line @typescript-eslint/no-array-constructor
    a = new Array(input.size, "l", { t: 0 }, { trace, detail: "all" });
  } catch (e) {
    if (e instanceof PyError) return rec.frames;
    throw e;
  }
  runner.run((op) => {
    const [index = 0, val = 0] = op.args;
    if (op.name === "__setitem__") {
      a.__setitem__(index, item(val, op.id), trace);
    } else {
      a.__getitem__(index, trace);
    }
  });
  return rec.frames;
}
