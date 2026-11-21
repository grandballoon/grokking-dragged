/**
 * The stack page: the port of stacks/stack.py (ports/stack.ts), built on
 * the singly linked list as in the Python, run over an operation script.
 */
import type { Frame } from "../../../../core/trace";
import { script, type Op } from "../../opScript";
import { SRC, Stack } from "../../ports/stack";
import type { ScriptInput } from "../shared/edits";
import { runScript, type Tracer, type Vars } from "../shared/tracer";
import type { ListFields } from "../singlyLinkedList/trace";

export { SRC };

export type StackFields = { readonly _data: ListFields };
export type StackVars = Vars<StackFields>;

function applyOp(stack: Stack<number>, op: Op, t: Tracer): void {
  switch (op.name) {
    case "push":
      return stack.push(op.args[0] ?? 0, t);
    case "pop":
      stack.pop(t);
      return;
    case "peek":
      stack.peek(t);
      return;
  }
}

export const STACK_SCRIPT = script(
  ["push", 1],
  ["push", 2],
  ["push", 3],
  ["peek"],
  ["pop"],
  ["push", 4],
  ["pop"],
  ["pop"],
  ["pop"],
  ["pop"],
);

export const INITIAL_INPUT: ScriptInput = { ops: STACK_SCRIPT };

export function run(input: ScriptInput): Frame<StackVars>[] {
  return runScript(
    {
      create: () => new Stack<number>(),
      init: (stack, t) => stack.__init__(t),
      apply: applyOp,
    },
    input.ops,
  );
}
