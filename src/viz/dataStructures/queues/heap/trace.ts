/**
 * A demo of grokking_data_structures-main/python/queues/heap.py: build a
 * Heap from a list of elements (so `_heapify` runs), then run an operation
 * script of `insert`, `top` and `peek` calls on it.
 *
 * The elements are numbers, ordered by the default priority (the number
 * itself). Each is boxed as an `Item` with a `uid`, the one addition to the
 * Python, so a value keeps its identity as it moves between slots, even
 * when the heap holds two equal numbers.
 */
import { recorder, type Frame } from "../../../../core/trace";
import { raised, returned, type Outcome } from "../../kit/outcome";
import { scriptRunner } from "../../kit/script";
import { script, opText, type Op } from "../../opScript";
import { HEAP } from "../../sources";
import { Heap, type HeapCall } from "./heap";

export const SRC = HEAP;

export type Item = {
  /** Not in the Python: names the element across frames. */
  readonly uid: string;
  readonly value: number;
};

export type Input = {
  /** The list passed to `Heap(elements)`. */
  readonly elements: readonly Item[];
  readonly ops: readonly Op[];
};

export type Vars = {
  /** Index of the script op running, or null while the heap is built. */
  op: number | null;
  _elements: Item[];
  /** Active Heap calls, outermost first. */
  stack: HeapCall<Item>[];
  /** Each op's result so far, as the demo would see it. */
  outcomes: (Outcome | null)[];
};

export const INITIAL_INPUT: Input = {
  elements: [3, 1, 4, 1, 5, 9, 2, 6].map((value, i) => ({ uid: `e${i}`, value })),
  ops: script(["insert", 7], ["top"], ["top"], ["insert", 8], ["peek"], ["top"]),
};

export function run({ elements, ops }: Input): Frame<Vars>[] {
  const rec = recorder<Vars>();
  const step = rec.in(SRC);
  const stack: HeapCall<Item>[] = [];
  const runner = scriptRunner(ops);
  const outcomes: (Outcome | null)[] = ops.map(() => null);

  const heap = new Heap<Item>(
    {
      stack,
      step: (where, h, note) =>
        step(
          where,
          { op: runner.op, _elements: h._elements ?? [], stack, outcomes },
          note,
        ),
      show: (item) => String(item.value),
    },
    elements,
    (item) => item.value,
  );

  /**
   * Set the running op's outcome in the live list, and in the frame just
   * recorded (the op's `return` or `raise` line), so it shows from there on.
   */
  const settle = (outcome: Outcome) => {
    outcomes[runner.op!] = outcome;
    rec.frames.at(-1)!.vars.outcomes[runner.op!] = outcome;
  };

  runner.run(
    (call) => {
      if (call.name === "insert") heap.insert({ uid: call.id, value: call.args[0] ?? 0 });
      else if (call.name === "top") settle(returned("top", heap.top().value));
      else if (call.name === "peek") settle(returned("peek", heap.peek().value));
      else throw new Error(`Unknown op ${opText(call)}`);
    },
    (error) => settle(raised(ops[runner.op!]!.name, error)),
  );
  return rec.frames;
}
