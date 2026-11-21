/**
 * Port of python-master/03/06_find_max.py.
 *
 * `find_max(arr)` compares the first item with the largest of the rest,
 * `find_max(arr[1:])`, and stops early at lists of length 0, 1 or 2. Each
 * active call is an entry on `stack`, outermost first, holding its slice
 * `arr` and its local `sub_max`.
 *
 * The file defines `find_max` but never calls it, so this page calls it on
 * an input list of its own (`[2, 8, 3, 5]` to start with).
 */
import source from "@repo/python-master/03/06_find_max.py?raw";
import { pythonSource } from "../../../core/pythonSource";
import { recorder, type Frame } from "../../../core/trace";
import type { Known } from "../kit/linearCalls";
import { pyRepr, pySlice } from "../../../core/python";

export const SRC = pythonSource("python-master/03/06_find_max.py", source);

export type Input = { readonly arr: readonly number[] };

export type Call = {
  /** Which call this is, counting from 0; for drawing, not a Python value. */
  uid: number;
  arr: number[];
  sub_max: number | null;
  /** What `find_max(arr[1:])` gave back to this call, once it has. */
  got: Known<number> | null;
  /** What this call returns, once it does. */
  returns: Known<number> | null;
};

export type Vars = { stack: Call[] };

export const DEFAULT_ARR = [2, 8, 3, 5];

export function run(input: Input): Frame<Vars>[] {
  const rec = recorder<Vars>();
  const step = rec.in(SRC);
  const stack: Call[] = [];
  const vars = (): Vars => ({ stack });
  let calls = 0;

  function find_max(arr: number[]): number {
    const call: Call = { uid: calls++, arr, sub_max: null, got: null, returns: null };
    stack.push(call);
    const ret = (
      snippet: string | { snippet: string; after: string },
      value: number,
      note: string,
    ) => {
      call.returns = { value };
      step(snippet, vars(), note);
      stack.pop();
      return value;
    };
    step("def find_max(arr):", vars(), `find_max(${pyRepr(arr)}) starts.`);
    const n = arr.length;
    step(
      "if len(arr) == 0:",
      vars(),
      n === 0 ? "arr is empty." : `len(arr) is ${n}, not 0.`,
    );
    if (n === 0) {
      return ret("return 0", 0, "An empty list: return 0.");
    }
    step(
      "elif len(arr) == 1:",
      vars(),
      n === 1 ? "Just one item." : `len(arr) is ${n}, not 1.`,
    );
    if (n === 1) {
      return ret(
        { snippet: "return arr[0]", after: "elif len(arr) == 1:" },
        arr[0]!,
        `The only item, ${arr[0]}, is the largest.`,
      );
    }
    step(
      "elif len(arr) == 2:",
      vars(),
      n === 2 ? "Two items: compare them directly." : `len(arr) is ${n}, so recurse.`,
    );
    if (n === 2) {
      const [a, b] = [arr[0]!, arr[1]!];
      return ret(
        "arr[0] > arr[1] else arr[1]",
        a > b ? a : b,
        `${a} > ${b} is ${a > b ? "True" : "False"}, so return ${a > b ? a : b}.`,
      );
    }
    const rest = pySlice(arr, 1);
    step(
      "sub_max = find_max(arr[1:])",
      vars(),
      `Find the largest of the rest, ${pyRepr(rest)}, and wait for it.`,
    );
    const sub_max = find_max(rest);
    call.got = { value: sub_max };
    call.sub_max = sub_max;
    step("sub_max = find_max(arr[1:])", vars(), `The largest of the rest is ${sub_max}.`);
    const a = arr[0]!;
    return ret(
      "arr[0] > sub_max else sub_max",
      a > sub_max ? a : sub_max,
      `${a} > ${sub_max} is ${a > sub_max ? "True" : "False"}, so return ${a > sub_max ? a : sub_max}.`,
    );
  }

  find_max([...input.arr]);
  return rec.frames;
}
