/**
 * Port of python-master/03/04_count.py.
 *
 * `count(arr)` counts one item and adds the count of the rest, `arr[1:]`, a
 * fresh copy one shorter, until the list is empty. Each active call is an
 * entry on `stack`, outermost first, holding its own slice `arr`.
 *
 * The file defines `count` but never calls it, so this page calls it on an
 * input list of its own (`[2, 4, 6]` to start with).
 */
import source from "@repo/python-master/03/04_count.py?raw";
import { pythonSource } from "../../../core/pythonSource";
import { recorder, type Frame } from "../../../core/trace";
import type { Known } from "../kit/linearCalls";
import { pyRepr, pySlice } from "../../../core/python";

export const SRC = pythonSource("python-master/03/04_count.py", source);

export type Input = { readonly arr: readonly number[] };

export type Call = {
  /** Which call this is, counting from 0; for drawing, not a Python value. */
  uid: number;
  arr: number[];
  /** What `count(arr[1:])` gave back to this call, once it has. */
  got: Known<number> | null;
  /** What this call returns, once it does. */
  returns: Known<number> | null;
};

export type Vars = { stack: Call[] };

export const DEFAULT_ARR = [2, 4, 6];

export function run(input: Input): Frame<Vars>[] {
  const rec = recorder<Vars>();
  const step = rec.in(SRC);
  const stack: Call[] = [];
  const vars = (): Vars => ({ stack });
  let calls = 0;

  function count(arr: number[]): number {
    const call: Call = { uid: calls++, arr, got: null, returns: null };
    stack.push(call);
    step("def count(arr):", vars(), `count(${pyRepr(arr)}) starts.`);
    step(
      "if not arr:",
      vars(),
      arr.length === 0
        ? "arr is empty: the base case."
        : `arr has items, so count the first and recurse on the rest.`,
    );
    if (arr.length === 0) {
      call.returns = { value: 0 };
      step("return 0", vars(), "An empty list has 0 items: return 0.");
      stack.pop();
      return 0;
    }
    const rest = pySlice(arr, 1);
    step(
      "return 1 + count(arr[1:])",
      vars(),
      `arr[1:] is a new list, ${pyRepr(rest)}. Call count on it and wait.`,
    );
    const got = count(rest);
    call.got = { value: got };
    step("return 1 + count(arr[1:])", vars(), `count(${pyRepr(rest)}) gave back ${got}.`);
    const result = 1 + got;
    call.returns = { value: result };
    step("return 1 + count(arr[1:])", vars(), `Return 1 + ${got} = ${result}.`);
    stack.pop();
    return result;
  }

  count([...input.arr]);
  return rec.frames;
}
