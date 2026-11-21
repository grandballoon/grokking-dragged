/**
 * Port of grokking_data_structures-main/python/linked_lists/sorted_singly_linked_list.py.
 *
 * `SortedSinglyLinkedList` extends the ported `SinglyLinkedList`, as in the
 * Python: `insert` keeps the nodes in ascending order, the two unsorted
 * inserts are overridden to raise, and every other method is inherited, so
 * its frames are recorded in singly_linked_list.py.
 */
import type { Frame } from "../../../../core/trace";
import { script, type Op } from "../../opScript";
import { SORTED_SINGLY_LINKED_LIST as SRC } from "../../sources";
import type { ScriptInput } from "../shared/edits";
import { SinglyLinkedList, type Node } from "../../ports/singly_linked_list";
import { runScript, type Method, type Tracer } from "../shared/tracer";
import { applyListOp, type ListVars } from "../singlyLinkedList/trace";

export { SRC };

const NOT_SORTED = "This method is not available for sorted lists";

export class SortedSinglyLinkedList extends SinglyLinkedList<number> {
  override insert_in_front(data: number, t: Tracer): never {
    return t
      .enter(SRC, "insert_in_front")
      .raise(
        { snippet: "raise NotImplementedError", after: "def insert_in_front" },
        { data },
        "NotImplementedError",
        NOT_SORTED,
      );
  }

  override insert_to_back(data: number, t: Tracer): never {
    return t
      .enter(SRC, "insert_to_back")
      .raise(
        { snippet: "raise NotImplementedError", after: "def insert_to_back" },
        { data },
        "NotImplementedError",
        NOT_SORTED,
      );
  }

  insert(new_data: number, t: Tracer): void {
    const m: Method = t.enter(SRC, "insert");
    let current = this._head;
    m.step(
      "current = self._head",
      { new_data, current },
      current === null
        ? "current starts at the head, which is None."
        : `current starts at the head, ${current.data()}.`,
    );
    let previous: Node<number> | null = null;
    m.step(
      "previous = None",
      { new_data, current, previous },
      "previous trails one node behind current; the head has none.",
    );
    while (current !== null) {
      const here = current.data() >= new_data;
      m.step(
        "if current.data() >= new_data:",
        { new_data, current, previous },
        here
          ? `${current.data()} >= ${new_data}: the new node goes just before current.`
          : `${current.data()} < ${new_data}: keep looking.`,
      );
      if (here) {
        if (previous === null) {
          this._head = new SinglyLinkedList.Node(new_data, current, t.newUid());
          m.step(
            "self._head = SinglyLinkedList.Node(new_data, current)",
            { new_data, current, previous },
            `A new node holding ${new_data} goes in front of the head.`,
          );
        } else {
          previous.append(new SinglyLinkedList.Node(new_data, current, t.newUid()));
          m.step(
            "previous.append(SinglyLinkedList.Node(new_data, current))",
            { new_data, current, previous },
            `A new node holding ${new_data} goes between ${previous.data()} and ${current.data()}.`,
          );
        }
        m.step(
          {
            snippet: "return",
            after: "previous.append(SinglyLinkedList.Node(new_data, current))",
          },
          { new_data, current, previous },
          `${new_data} is in place; the list is still sorted.`,
        );
        return;
      }
      previous = current;
      m.step(
        "previous = current",
        { new_data, current, previous },
        "previous catches up with current.",
      );
      current = current.next();
      m.step(
        "current = current.next()",
        { new_data, current, previous },
        current === null
          ? "current runs off the end of the list."
          : `current moves on to ${current.data()}.`,
      );
    }
    if (previous === null) {
      this._head = new SinglyLinkedList.Node(new_data, null, t.newUid());
      m.step(
        "self._head = SinglyLinkedList.Node(new_data)",
        { new_data, current, previous },
        `The list was empty: a new node holding ${new_data} becomes the head.`,
      );
    } else {
      previous.append(new SinglyLinkedList.Node(new_data, null, t.newUid()));
      m.step(
        "previous.append(SinglyLinkedList.Node(new_data, None))",
        { new_data, current, previous },
        `${new_data} is the largest value: it goes at the end, after ${previous.data()}.`,
      );
    }
  }
}

function applySortedOp(ssl: SortedSinglyLinkedList, op: Op, t: Tracer): void {
  if (op.name === "insert") ssl.insert(op.args[0] ?? 0, t);
  else applyListOp(ssl, op, t);
}

export const INITIAL_INPUT: ScriptInput = {
  ops: script(
    ["insert", 5],
    ["insert", 2],
    ["insert", 9],
    ["insert", 7],
    ["insert", 5],
    ["insert_in_front", 1],
    ["delete", 9],
    ["get", 2],
    ["size"],
  ),
};

export function run(input: ScriptInput): Frame<ListVars>[] {
  return runScript(
    {
      create: () => new SortedSinglyLinkedList(),
      init: (ssl, t) => ssl.__init__(t),
      apply: applySortedOp,
    },
    input.ops,
  );
}

/**
 * A value that `insert` would put at gap `gap` of the sorted `data` (gap 0
 * is before the first node, gap `data.length` after the last), or null if
 * no value lands there (between two equal values).
 */
export function valueForGap(data: readonly number[], gap: number): number | null {
  const before = data[gap - 1];
  const after = data[gap];
  if (before === undefined && after === undefined) return 0;
  if (before === undefined) return after! - 1;
  if (after === undefined) return before + 1;
  if (after <= before) return null;
  // insert puts a value just before the first node holding at least it.
  return after - before >= 2 ? Math.floor((before + after) / 2) : after;
}
