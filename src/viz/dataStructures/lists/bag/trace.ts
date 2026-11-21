/**
 * Port of grokking_data_structures-main/python/bags/bag.py.
 *
 * `Bag` wraps the ported `SinglyLinkedList` in `_data`, as in the Python.
 * `insert` steps into the list's `insert_in_front`. `__iter__` returns the
 * list's own generator; the `__iter__()` op then drives that generator to
 * the end, as `list(bag)` would.
 */
import type { Frame } from "../../../../core/trace";
import { script, withLabels, type Op } from "../../opScript";
import { BAG as SRC } from "../../sources";
import type { ScriptInput } from "../shared/edits";
import { SinglyLinkedList } from "../../ports/singly_linked_list";
import { runScript, type Method, type Tracer, type Vars } from "../shared/tracer";
import type { ListFields } from "../singlyLinkedList/trace";

export { SRC };

export class Bag {
  _data = new SinglyLinkedList<number>();

  /** Runs `__init__`: `SinglyLinkedList()` runs first, as in Python. */
  __init__(t: Tracer): void {
    const m: Method = t.enter(SRC, "__init__");
    const data = new SinglyLinkedList<number>();
    data.__init__(m.call({}));
    this._data = data;
    m.step(
      "self._data = SinglyLinkedList()",
      {},
      "bag = Bag(): the bag keeps its items in an empty linked list.",
    );
  }

  /** Returns the generator, as a function that runs it to the end. */
  __iter__(t: Tracer): (t: Tracer) => number[] {
    t.enter(SRC, "__iter__").step(
      "return iter(self._data)",
      {},
      "__iter__ hands out the linked list's own generator; nothing has run yet.",
    );
    return (consumer) => this._data.__iter__(consumer);
  }

  insert(value: number, t: Tracer): void {
    const m: Method = t.enter(SRC, "insert");
    this._data.insert_in_front(value, m.call({ value }));
    m.step(
      "self._data.insert_in_front(value)",
      { value },
      `${value} is in the bag: inserting at the front takes constant time.`,
    );
  }
}

export type BagFields = { readonly _data: ListFields };
export type BagVars = Vars<BagFields>;

function applyOp(bag: Bag, op: Op, t: Tracer): void {
  switch (op.name) {
    case "insert":
      return bag.insert(op.args[0] ?? 0, t);
    case "__iter__":
      bag.__iter__(t)(t);
      return;
  }
}

/** `__iter__` runs as `list(bag)` drives it. */
const BAG_LABELS = { __iter__: "list(bag)" };

export const INITIAL_INPUT: ScriptInput = {
  ops: withLabels(
    script(
      ["insert", 4],
      ["insert", 7],
      ["insert", 4],
      ["__iter__"],
      ["insert", 2],
      ["__iter__"],
    ),
    BAG_LABELS,
  ),
};

export function run(input: ScriptInput): Frame<BagVars>[] {
  return runScript(
    { create: () => new Bag(), init: (bag, t) => bag.__init__(t), apply: applyOp },
    input.ops,
  );
}
