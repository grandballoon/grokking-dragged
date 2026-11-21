/**
 * The circular queue page: the port of queues/queue.py (ports/queue.ts)
 * run over an operation script.
 */
import { recorder, type Frame } from "../../../../core/trace";
import { outcomeOf, type Outcome } from "../../kit/outcome";
import { attempt } from "../../kit/pyError";
import { scriptRunner } from "../../kit/script";
import { tracer } from "../../kit/tracer";
import { script, opText, type Op } from "../../opScript";
import { Queue, SRC } from "../../ports/queue";

export { SRC };

export type Input = { readonly max_size: number; readonly ops: readonly Op[] };

/** The Queue's fields, as a frame snapshots them. */
export type QueueFields = {
  readonly _data: readonly (number | null)[];
  readonly _max_size: number;
  readonly _front: number;
  readonly _rear: number;
  readonly _size: number;
};

export type Vars = {
  /** Index of the script op running, or null while the queue is built. */
  op: number | null;
  /** The queue, once its constructor has got past its check. */
  queue: QueueFields | null;
  /** `value` in `enqueue` (its argument) or `dequeue` (the value read). */
  value: number | null;
  /** Each op's result so far, as the demo would see it. */
  outcomes: (Outcome | null)[];
};

export const INITIAL_INPUT: Input = {
  max_size: 5,
  ops: script(
    ["dequeue"],
    ["enqueue", 3],
    ["enqueue", 1],
    ["enqueue", 4],
    ["dequeue"],
    ["dequeue"],
    ["enqueue", 1],
    ["enqueue", 5],
    ["enqueue", 9],
    ["enqueue", 2],
    ["enqueue", 6],
    ["dequeue"],
  ),
};

function fields(queue: Queue<number>): QueueFields {
  const { _data, _max_size, _front, _rear, _size } = queue;
  return { _data, _max_size, _front, _rear, _size };
}

export function run({ max_size, ops }: Input): Frame<Vars>[] {
  const rec = recorder<Vars>();
  const runner = scriptRunner(ops);
  const queue = new Queue<number>();
  const outcomes: (Outcome | null)[] = ops.map(() => null);

  const t = tracer({
    newUid: runner.newUid,
    record(event) {
      const op = runner.op;
      const outcome = outcomeOf(event);
      if (op !== null && outcome !== undefined) outcomes[op] = outcome;
      const vars: Vars = {
        op,
        // A constructor that raises leaves no queue.
        queue: op === null && event.raised !== undefined ? null : fields(queue),
        value: (event.stack.at(-1)!.locals.value as number | undefined) ?? null,
        outcomes,
      };
      rec.in(event.src)(event.where, vars, event.note);
    },
  });

  if (attempt(() => queue.__init__(max_size, t)) !== null) return rec.frames;
  runner.run((call) => {
    if (call.name === "enqueue") queue.enqueue(call.args[0] ?? 0, t);
    else if (call.name === "dequeue") queue.dequeue(t);
    else throw new Error(`Unknown op ${opText(call)}`);
  });
  return rec.frames;
}
