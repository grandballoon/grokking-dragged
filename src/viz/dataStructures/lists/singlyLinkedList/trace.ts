/**
 * The singly linked list page: the port of linked_lists/singly_linked_list.py
 * (ports/singly_linked_list.ts) run over an operation script.
 */
import type { Frame } from "../../../../core/trace";
import { script, withLabels, type Op } from "../../opScript";
import { SinglyLinkedList, SRC } from "../../ports/singly_linked_list";
import type { ScriptInput } from "../shared/edits";
import type { NodeData } from "../shared/layout";
import { runScript, type Tracer, type Vars } from "../shared/tracer";

export { SRC };

export type ListFields = { readonly _head: NodeData | null };
export type ListVars = Vars<ListFields>;

/** How the script reads the calls whose Python is not `name(arg)`. */
const LIST_LABELS = { search: "search(lambda x: x == {0})" };

/** Runs one op of a script on a list, by the op's method name. */
export function applyListOp(sll: SinglyLinkedList<number>, op: Op, t: Tracer): void {
  const arg = op.args[0] ?? 0;
  switch (op.name) {
    case "insert_in_front":
      return sll.insert_in_front(arg, t);
    case "insert_to_back":
      return sll.insert_to_back(arg, t);
    case "get":
      sll.get(arg, t);
      return;
    case "search":
      sll.search({ source: `lambda x: x == ${arg}`, test: (x) => x === arg }, t);
      return;
    case "delete":
      return sll.delete(arg, t);
    case "delete_from_front":
      sll.delete_from_front(t);
      return;
    case "size":
      sll.size(t);
      return;
  }
}

export const INITIAL_INPUT: ScriptInput = {
  ops: withLabels(
    script(
      ["insert_to_back", 5],
      ["insert_in_front", 3],
      ["insert_to_back", 8],
      ["insert_in_front", 1],
      ["get", 2],
      ["search", 8],
      ["delete", 5],
      ["delete_from_front"],
      ["size"],
      ["delete", 4],
    ),
    LIST_LABELS,
  ),
};

export function run(input: ScriptInput): Frame<ListVars>[] {
  return runScript(
    {
      create: () => new SinglyLinkedList<number>(),
      init: (sll, t) => sll.__init__(t),
      apply: applyListOp,
    },
    input.ops,
  );
}
