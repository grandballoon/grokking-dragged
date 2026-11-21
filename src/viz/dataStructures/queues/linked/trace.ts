/**
 * Port of grokking_data_structures-main/python/queues/queue_linked_list.py,
 * driven by an operation script.
 *
 * The Queue keeps its elements in the ported DoublyLinkedList
 * (ports/doubly_linked_list.ts), `_data`: enqueue appends at the tail,
 * dequeue removes the head. Each list method records its steps in
 * doubly_linked_list.py, so the trace steps from one file into the other.
 * The `stack` var holds the Python call stack: the Queue method, the list
 * method it called, and `Node.prepend` when that runs.
 */
import { recorder, type Frame } from "../../../../core/trace";
import { outcomeOf, type Outcome } from "../../kit/outcome";
import { scriptRunner } from "../../kit/script";
import { tracer, type Call, type Method, type Tracer } from "../../kit/tracer";
import { script, opText, type Op } from "../../opScript";
import { DoublyLinkedList, SRC as LIST_SRC } from "../../ports/doubly_linked_list";
import { QUEUE_LINKED_LIST as SRC } from "../../sources";

export { LIST_SRC, SRC };
export type { Call };

export type Input = { readonly ops: readonly Op[] };

/** A list node as a frame holds it. */
export type NodeFields = {
  /** Not in the Python: the node's identity across frames. */
  readonly uid: string;
  readonly _data: number;
  readonly _next: NodeFields | null;
  readonly _prev: NodeFields | null;
};

export type Vars = {
  /** Index of the script op running, or null while the queue is built. */
  op: number | null;
  /** The fields of the queue's list, `self._data`. */
  _head: NodeFields | null;
  _tail: NodeFields | null;
  /** Active calls, outermost first. */
  stack: readonly Call[];
  /** Each op's result so far, as the demo would see it. */
  outcomes: (Outcome | null)[];
};

export class Queue {
  _data = new DoublyLinkedList<number>();

  /** Runs `__init__`: `DoublyLinkedList()` runs first, as in Python. */
  __init__(t: Tracer): void {
    const m: Method = t.enter(SRC, "__init__");
    const data = new DoublyLinkedList<number>();
    data.__init__(m.call({}));
    this._data = data;
    m.step(
      "self._data = DoublyLinkedList()",
      {},
      "Queue() starts with an empty DoublyLinkedList: _head and _tail are None.",
    );
  }

  is_empty(): boolean {
    return this._data.is_empty();
  }

  enqueue(value: number, t: Tracer): void {
    const m: Method = t.enter(SRC, "enqueue");
    this._data.insert_to_back(value, m.call({ value }));
    m.step(
      "self._data.insert_to_back(value)",
      { value },
      `${value} is now at the back of the queue.`,
    );
  }

  dequeue(t: Tracer): number {
    const m: Method = t.enter(SRC, "dequeue");
    const empty = this.is_empty();
    m.step(
      "if self.is_empty():",
      {},
      empty
        ? "The queue is empty: its list has no head."
        : "The queue isn't empty, so ask the list for its head.",
    );
    if (empty) {
      m.raise(
        'raise ValueError("Cannot dequeue from an empty queue")',
        {},
        "ValueError",
        "Cannot dequeue from an empty queue",
      );
    }
    const value = this._data.delete_from_front(m.call({}));
    m.step("return self._data.delete_from_front()", {}, `dequeue returns ${value}.`, {
      returns: value,
    });
    return value;
  }
}

export const INITIAL_INPUT: Input = {
  ops: script(
    ["enqueue", 3],
    ["enqueue", 1],
    ["enqueue", 4],
    ["dequeue"],
    ["enqueue", 1],
    ["enqueue", 5],
    ["dequeue"],
    ["dequeue"],
    ["dequeue"],
    ["dequeue"],
    ["dequeue"],
  ),
};

export function run({ ops }: Input): Frame<Vars>[] {
  const rec = recorder<Vars>();
  const runner = scriptRunner(ops);
  const queue = new Queue();
  const outcomes: (Outcome | null)[] = ops.map(() => null);

  const t = tracer({
    newUid: runner.newUid,
    record(event) {
      const op = runner.op;
      const outcome = outcomeOf(event);
      if (op !== null && outcome !== undefined) outcomes[op] = outcome;
      const vars: Vars = {
        op,
        _head: queue._data._head,
        _tail: queue._data._tail,
        stack: event.stack,
        outcomes,
      };
      rec.in(event.src)(event.where, vars, event.note);
    },
  });

  queue.__init__(t);
  runner.run((call) => {
    if (call.name === "enqueue") queue.enqueue(call.args[0] ?? 0, t);
    else if (call.name === "dequeue") queue.dequeue(t);
    else throw new Error(`Unknown op ${opText(call)}`);
  });
  return rec.frames;
}
