/**
 * Port of python-master/04/05_quicksort.py.
 *
 * Each call picks `pivot = array[0]`, builds `less` and `greater` with the
 * same comprehensions, and returns `quicksort(less) + [pivot] +
 * quicksort(greater)`. The recursion shows up as `stack`, one entry per
 * active call, outermost first; calls that have returned move to
 * `finished`, so a drawing can keep showing the whole recursion tree.
 */
import { pyRepr } from "../../../core/python";
import source from "@repo/python-master/04/05_quicksort.py?raw";
import { pythonSource } from "../../../core/pythonSource";
import { recorder, type Frame } from "../../../core/trace";

export const SRC = pythonSource("python-master/04/05_quicksort.py", source);

/** The list the script sorts. */
export const BOOK_ARRAY = [10, 5, 2, 3];

export type Call = {
  /**
   * Where the call sits in the recursion tree: "q" for the outermost call,
   * then "l" or "g" for each step down into `quicksort(less)` or
   * `quicksort(greater)`. The one addition to the Python's locals.
   */
  uid: string;
  array: number[];
  pivot: number | null;
  less: number[] | null;
  greater: number[] | null;
  /** What `quicksort(less)` returned, once it has (not a Python variable). */
  sorted_less: number[] | null;
  /** What `quicksort(greater)` returned, once it has (not a Python variable). */
  sorted_greater: number[] | null;
  /** What this call returns, once it does. */
  returns: number[] | null;
};

export type Vars = { stack: Call[]; finished: Call[]; stdout: string[] };

const RECURSE = "return quicksort(less) + [pivot] + quicksort(greater)";

export function run(input: readonly number[]): Frame<Vars>[] {
  const rec = recorder<Vars>();
  const step = rec.in(SRC);
  const stack: Call[] = [];
  const finished: Call[] = [];
  const stdout: string[] = [];
  const vars = (): Vars => ({ stack, finished, stdout });

  function quicksort(array: number[], uid: string): number[] {
    const call: Call = {
      uid,
      array,
      pivot: null,
      less: null,
      greater: null,
      sorted_less: null,
      sorted_greater: null,
      returns: null,
    };
    const done = (result: number[]) => {
      call.returns = result;
      return result;
    };
    const leave = () => {
      stack.pop();
      finished.push(call);
    };
    stack.push(call);
    step(
      "def quicksort(array):",
      vars(),
      stack.length === 1
        ? `print(quicksort(${pyRepr(array)})) calls quicksort.`
        : `Call quicksort(${pyRepr(array)}).`,
    );
    step(
      "if len(array) < 2:",
      vars(),
      array.length < 2
        ? `${pyRepr(array)} has fewer than 2 elements: the base case.`
        : `${pyRepr(array)} has ${array.length} elements, so this is the recursive case.`,
    );
    if (array.length < 2) {
      done(array);
      step("return array", vars(), `${pyRepr(array)} is already sorted, so return it.`);
      leave();
      return array;
    }
    const pivot = array[0]!;
    call.pivot = pivot;
    step("pivot = array[0]", vars(), `The first element, ${pivot}, is the pivot.`);
    const less = array.slice(1).filter((i) => i <= pivot);
    call.less = less;
    step(
      "less = [i for i in array[1:] if i <= pivot]",
      vars(),
      `The rest that are <= ${pivot} go in less: ${pyRepr(less)}.`,
    );
    const greater = array.slice(1).filter((i) => i > pivot);
    call.greater = greater;
    step(
      "greater = [i for i in array[1:] if i > pivot]",
      vars(),
      `The rest that are > ${pivot} go in greater: ${pyRepr(greater)}.`,
    );
    step(RECURSE, vars(), `Sort less first: call quicksort(${pyRepr(less)}).`);
    const sortedLess = quicksort(less, uid + "l");
    call.sorted_less = sortedLess;
    step(
      RECURSE,
      vars(),
      `quicksort(less) returned ${pyRepr(sortedLess)}; now call quicksort(${pyRepr(greater)}).`,
    );
    const sortedGreater = quicksort(greater, uid + "g");
    call.sorted_greater = sortedGreater;
    const result = done([...sortedLess, pivot, ...sortedGreater]);
    step(
      RECURSE,
      vars(),
      `Glue the pieces together: ${pyRepr(sortedLess)} + [${pivot}] + ${pyRepr(sortedGreater)} = ${pyRepr(result)}.`,
    );
    leave();
    return result;
  }

  const sorted = quicksort([...input], "q");
  stdout.push(pyRepr(sorted));
  step("print(quicksort(", vars(), `print shows ${pyRepr(sorted)}.`);
  return rec.frames;
}
