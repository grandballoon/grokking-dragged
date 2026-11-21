/**
 * The doubly linked list page: the port of linked_lists/doubly_linked_list.py
 * (ports/doubly_linked_list.ts) run over an operation script.
 */
import type { Frame } from "../../../../core/trace";
import { script, type Op } from "../../opScript";
import { DoublyLinkedList, SRC } from "../../ports/doubly_linked_list";
import type { ScriptInput } from "../shared/edits";
import type { NodeData } from "../shared/layout";
import { runScript, type Tracer, type Vars } from "../shared/tracer";

export { SRC };

export type DoublyFields = {
  readonly _head: NodeData | null;
  readonly _tail: NodeData | null;
};
export type DoublyVars = Vars<DoublyFields>;

function applyOp(dll: DoublyLinkedList<number>, op: Op, t: Tracer): void {
  const arg = op.args[0] ?? 0;
  switch (op.name) {
    case "insert_in_front":
      return dll.insert_in_front(arg, t);
    case "insert_to_back":
      return dll.insert_to_back(arg, t);
    case "delete":
      return dll.delete(arg, t);
    case "delete_from_front":
      dll.delete_from_front(t);
      return;
    case "delete_from_back":
      dll.delete_from_back(t);
      return;
  }
}

export const INITIAL_INPUT: ScriptInput = {
  ops: script(
    ["insert_in_front", 4],
    ["insert_to_back", 6],
    ["insert_in_front", 2],
    ["insert_to_back", 8],
    ["delete", 6],
    ["delete", 2],
    ["delete", 8],
    ["insert_to_back", 5],
    ["delete_from_back"],
    ["delete", 4],
  ),
};

export function run(input: ScriptInput): Frame<DoublyVars>[] {
  return runScript(
    {
      create: () => new DoublyLinkedList<number>(),
      init: (dll, t) => dll.__init__(t),
      apply: applyOp,
    },
    input.ops,
  );
}
