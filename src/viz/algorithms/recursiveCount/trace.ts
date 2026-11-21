/**
 * Port of python-master/04/03_recursive_count.py.
 *
 * `count` takes a list and recurses on the slice `list[1:]`, a fresh copy,
 * as in Python. The file only defines `count`, so the port calls it once on
 * its input. The recursion shows up as `stack`, one entry per active call,
 * outermost first.
 */
import { pyRepr } from "../../../core/python";
import source from "@sources/python-master/04/03_recursive_count.py?raw";
import { pythonSource } from "../../../core/pythonSource";
import { recorder, type Frame } from "../../../core/trace";

export const SRC = pythonSource("python-master/04/03_recursive_count.py", source);

/** The file never calls `count`; this is the list it counts here. */
export const DEFAULT_LIST = [3, 1, 4];

export type Call = {
  list: number[];
  /** What the recursive call `count(list[1:])` handed back, once it has (not a Python variable). */
  rest: number | null;
  /** What this call returns, once it does. */
  returns: number | null;
};

export type Vars = { stack: Call[] };

export function run(input: readonly number[]): Frame<Vars>[] {
  const rec = recorder<Vars>();
  const step = rec.in(SRC);
  const stack: Call[] = [];
  const vars = (): Vars => ({ stack });

  function count(list: number[]): number {
    const call: Call = { list, rest: null, returns: null };
    stack.push(call);
    step(
      "def count(list):",
      vars(),
      stack.length === 1
        ? `The file only defines count, so call it: count(${pyRepr(list)}).`
        : `Call count(${pyRepr(list)}).`,
    );
    step(
      "if list == []:",
      vars(),
      list.length === 0
        ? "list is empty: this is the base case."
        : `list isn't empty, so this is the recursive case.`,
    );
    if (list.length === 0) {
      call.returns = 0;
      step("return 0", vars(), "An empty list has 0 items, so return 0.");
      stack.pop();
      return 0;
    }
    const rest = list.slice(1);
    step(
      "return 1 + count(list[1:])",
      vars(),
      `Count list[0] = ${list[0]} as 1 and call count on the rest, ${pyRepr(rest)}.`,
    );
    call.rest = count(rest);
    call.returns = 1 + call.rest;
    step(
      "return 1 + count(list[1:])",
      vars(),
      `count(${pyRepr(rest)}) returned ${call.rest}, so return 1 + ${call.rest} = ${call.returns}.`,
    );
    stack.pop();
    return call.returns;
  }

  count([...input]);
  return rec.frames;
}
