/**
 * Port of grokking_data_structures-main/python/stacks/stack_dynamic_array.py.
 *
 * `Stack` keeps its items in a Python list, `_data`, here a TS array used
 * the same way: `append` pushes onto the end, `pop()` takes from the end,
 * and `_data[-1]` is the top.
 */
import type { Frame } from "../../../../core/trace";
import type { Op } from "../../opScript";
import { STACK_DYNAMIC_ARRAY as SRC } from "../../sources";
import type { ScriptInput } from "../shared/edits";
import { runScript, type Method, type Tracer, type Vars } from "../shared/tracer";
import { STACK_SCRIPT } from "../stack/trace";

export { SRC };

export class Stack {
  _data: number[] = [];

  /** Runs `__init__`; the TypeScript constructor already made `_data` empty. */
  __init__(t: Tracer): void {
    this._data = [];
    t.enter(SRC, "__init__").step(
      "self._data = []",
      {},
      "stack = Stack(): the stack keeps its items in an empty Python list.",
    );
  }

  is_empty(): boolean {
    return this._data.length === 0;
  }

  push(value: number, t: Tracer): void {
    const m: Method = t.enter(SRC, "push");
    this._data.push(value);
    m.step(
      "self._data.append(value)",
      { value },
      `${value} is appended at the end of the list: the new top.`,
      { found: String(this._data.length - 1) },
    );
  }

  pop(t: Tracer): number {
    const m: Method = t.enter(SRC, "pop");
    const at = (snippet: string) => ({ snippet, after: "def pop" });
    if (this.is_empty()) {
      m.raise(
        at('raise ValueError("Cannot pop from an empty stack")'),
        {},
        "ValueError",
        "Cannot pop from an empty stack",
      );
    }
    m.step(at("if self.is_empty():"), {}, "The stack is not empty.");
    const value = this._data.pop()!;
    m.step(
      "return self._data.pop()",
      {},
      `pop takes ${value} off the end of the list and returns it.`,
      { returns: value },
    );
    return value;
  }

  peek(t: Tracer): number {
    const m: Method = t.enter(SRC, "peek");
    const at = (snippet: string) => ({ snippet, after: "def peek" });
    if (this.is_empty()) {
      m.raise(
        at('raise ValueError("Cannot peek at an empty stack")'),
        {},
        "ValueError",
        "Cannot peek at an empty stack",
      );
    }
    m.step(at("if self.is_empty():"), {}, "The stack is not empty.");
    // Python's _data[-1]: the last item.
    const top = this._data.at(-1)!;
    m.step(
      "return copy.deepcopy(self._data[-1])",
      {},
      `peek returns a copy of _data[-1], ${top}, and leaves it in place.`,
      { found: String(this._data.length - 1), returns: top },
    );
    return top;
  }
}

export type ArrayStackFields = { readonly _data: readonly number[] };
export type ArrayStackVars = Vars<ArrayStackFields>;

function applyOp(stack: Stack, op: Op, t: Tracer): void {
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

export const INITIAL_INPUT: ScriptInput = { ops: STACK_SCRIPT };

export function run(input: ScriptInput): Frame<ArrayStackVars>[] {
  return runScript(
    { create: () => new Stack(), init: (stack, t) => stack.__init__(t), apply: applyOp },
    input.ops,
  );
}
