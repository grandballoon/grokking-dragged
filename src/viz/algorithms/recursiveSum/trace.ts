/**
 * Port of python-master/04/02_recursive_sum.py.
 *
 * `sum` (shadowing the built-in) takes a list and recurses on the slice
 * `list[1:]`, a fresh copy, as in Python. The file only defines `sum`, so
 * the port calls it once on its input. The recursion shows up as `stack`,
 * one entry per active call, outermost first.
 */
import { pyRepr } from "../../../core/python";
import source from "@sources/python-master/04/02_recursive_sum.py?raw";
import { pythonSource } from "../../../core/pythonSource";
import { recorder, type Frame } from "../../../core/trace";

export const SRC = pythonSource("python-master/04/02_recursive_sum.py", source);

/** The file never calls `sum`; this is the list the book adds up. */
export const DEFAULT_LIST = [2, 4, 6];

export type Call = {
  list: number[];
  /** What the recursive call `sum(list[1:])` handed back, once it has (not a Python variable). */
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

  function sum(list: number[]): number {
    const call: Call = { list, rest: null, returns: null };
    stack.push(call);
    step(
      "def sum(list):",
      vars(),
      stack.length === 1
        ? `The file only defines sum, so call it: sum(${pyRepr(list)}).`
        : `Call sum(${pyRepr(list)}).`,
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
      step("return 0", vars(), "The sum of an empty list is 0, so return 0.");
      stack.pop();
      return 0;
    }
    const rest = list.slice(1);
    step(
      "return list[0] + sum(list[1:])",
      vars(),
      `Hold on to list[0] = ${list[0]} and call sum on the rest, ${pyRepr(rest)}.`,
    );
    const head = list[0]!;
    call.rest = sum(rest);
    call.returns = head + call.rest;
    step(
      "return list[0] + sum(list[1:])",
      vars(),
      `sum(${pyRepr(rest)}) returned ${call.rest}, so return ${head} + ${call.rest} = ${call.returns}.`,
    );
    stack.pop();
    return call.returns;
  }

  sum([...input]);
  return rec.frames;
}
