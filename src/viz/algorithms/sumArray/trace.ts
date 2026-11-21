/**
 * Port of python-master/03/07_sum_array.py.
 *
 * `sum_array(arr)` adds the first item to the sum of the rest, `arr[1:]`,
 * until the list is empty. Each active call is an entry on `stack`,
 * outermost first, holding its own slice `arr`.
 *
 * The file defines `sum_array` but never calls it, so this page calls it on
 * an input list of its own (`[2, 4, 6]` to start with, the book's example).
 */
import source from "@sources/python-master/03/07_sum_array.py?raw";
import { pythonSource } from "../../../core/pythonSource";
import { recorder, type Frame } from "../../../core/trace";
import type { Known } from "../kit/linearCalls";
import { pyRepr, pySlice } from "../../../core/python";

export const SRC = pythonSource("python-master/03/07_sum_array.py", source);

export type Input = { readonly arr: readonly number[] };

export type Call = {
  /** Which call this is, counting from 0; for drawing, not a Python value. */
  uid: number;
  arr: number[];
  /** What `sum_array(arr[1:])` gave back to this call, once it has. */
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

  function sum_array(arr: number[]): number {
    const call: Call = { uid: calls++, arr, got: null, returns: null };
    stack.push(call);
    step("def sum_array(arr):", vars(), `sum_array(${pyRepr(arr)}) starts.`);
    step(
      "if not arr:",
      vars(),
      arr.length === 0
        ? "arr is empty: the base case."
        : `arr isn't empty, so add arr[0] = ${arr[0]} to the sum of the rest.`,
    );
    if (arr.length === 0) {
      call.returns = { value: 0 };
      step("return 0", vars(), "An empty list sums to 0.");
      stack.pop();
      return 0;
    }
    const rest = pySlice(arr, 1);
    step(
      "return arr[0] + sum_array(arr[1:])",
      vars(),
      `Call sum_array on a copy of the rest, ${pyRepr(rest)}, and wait.`,
    );
    const got = sum_array(rest);
    call.got = { value: got };
    step(
      "return arr[0] + sum_array(arr[1:])",
      vars(),
      `sum_array(${pyRepr(rest)}) gave back ${got}.`,
    );
    const result = arr[0]! + got;
    call.returns = { value: result };
    step(
      "return arr[0] + sum_array(arr[1:])",
      vars(),
      `Return ${arr[0]} + ${got} = ${result}.`,
    );
    stack.pop();
    return result;
  }

  sum_array([...input.arr]);
  return rec.frames;
}
