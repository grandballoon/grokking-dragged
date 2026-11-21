/**
 * Port of python-master/02/01_selection_sort.py.
 *
 * `selectionSort` repeatedly asks `findSmallest` for the index of the
 * smallest item left in `arr`, pops it, and appends it to `newArr`. The two
 * calls are entries on `stack` (outermost first), each with its Python
 * locals; both hold the same `arr` list, which the snapshots keep shared.
 */
import source from "@repo/python-master/02/01_selection_sort.py?raw";
import { pythonSource } from "../../../core/pythonSource";
import { recorder, type Frame } from "../../../core/trace";
import type { Known } from "../kit/linearCalls";
import { pyPrint, pyRepr } from "../../../core/python";

export const SRC = pythonSource("python-master/02/01_selection_sort.py", source);

export type Input = { readonly arr: readonly number[] };

type CallParts = {
  /** Which call this is, counting from 0; for drawing, not a Python value. */
  uid: number;
  arr: number[];
};

export type SortCall = CallParts & {
  fn: "selectionSort";
  newArr: number[];
  i: number | null;
  smallest: number | null;
  /** What this pass's `findSmallest(arr)` gave back, once it has. */
  got: Known<number> | null;
  returns: Known<number[]> | null;
};

export type FindCall = CallParts & {
  fn: "findSmallest";
  smallest: number | null;
  smallest_index: number | null;
  i: number | null;
  got: null;
  returns: Known<number> | null;
};

export type Vars = { stack: (SortCall | FindCall)[]; stdout: string[] };

export const BOOK_ARR = [5, 3, 6, 2, 10];

export function run(input: Input): Frame<Vars>[] {
  const rec = recorder<Vars>();
  const step = rec.in(SRC);
  const stack: (SortCall | FindCall)[] = [];
  const stdout: string[] = [];
  const vars = (): Vars => ({ stack, stdout });
  let calls = 0;

  function findSmallest(arr: number[]): number {
    const call: FindCall = {
      uid: calls++,
      fn: "findSmallest",
      arr,
      smallest: null,
      smallest_index: null,
      i: null,
      got: null,
      returns: null,
    };
    stack.push(call);
    step("def findSmallest(arr):", vars(), `findSmallest looks through ${pyRepr(arr)}.`);
    let smallest = arr[0]!;
    call.smallest = smallest;
    step(
      "smallest = arr[0]",
      vars(),
      `Start with the first item: smallest = ${smallest}.`,
    );
    let smallest_index = 0;
    call.smallest_index = smallest_index;
    step("smallest_index = 0", vars(), "It is at index 0.");
    for (let i = 1; i < arr.length; i++) {
      call.i = i;
      const smaller = arr[i]! < smallest;
      step(
        "if arr[i] < smallest:",
        vars(),
        `Is arr[${i}] = ${arr[i]} < ${smallest}? ${smaller ? "Yes." : "No."}`,
      );
      if (smaller) {
        smallest_index = i;
        call.smallest_index = i;
        step("smallest_index = i", vars(), `The smallest so far is at index ${i}...`);
        smallest = arr[i]!;
        call.smallest = smallest;
        step("smallest = arr[i]", vars(), `...and it is ${smallest}.`);
      }
    }
    call.returns = { value: smallest_index };
    step(
      "return smallest_index",
      vars(),
      `Done looking: the smallest, ${smallest}, is at index ${smallest_index}.`,
    );
    stack.pop();
    return smallest_index;
  }

  function selectionSort(arr: number[]): number[] {
    const call: SortCall = {
      uid: calls++,
      fn: "selectionSort",
      arr,
      newArr: [],
      i: null,
      smallest: null,
      got: null,
      returns: null,
    };
    stack.push(call);
    step("def selectionSort(arr):", vars(), `selectionSort starts on ${pyRepr(arr)}.`);
    const newArr: number[] = [];
    call.newArr = newArr;
    step("newArr = []", vars(), "The sorted items will go in a new, empty list.");
    // range(len(arr)) is evaluated once, before arr starts shrinking.
    const passes = arr.length;
    for (let i = 0; i < passes; i++) {
      call.i = i;
      call.got = null;
      step(
        "for i in range(len(arr)):",
        vars(),
        i === 0
          ? `range(len(arr)) is range(${passes}), fixed now: ${passes} passes, though arr will shrink.`
          : `Pass ${i}: ${arr.length} items left.`,
      );
      step(
        "smallest = findSmallest(arr)",
        vars(),
        "Ask findSmallest where the smallest remaining item is, and wait.",
      );
      const smallest = findSmallest(arr);
      call.got = { value: smallest };
      call.smallest = smallest;
      step("smallest = findSmallest(arr)", vars(), `smallest = ${smallest}, an index.`);
      const item = arr.splice(smallest, 1)[0]!;
      newArr.push(item);
      step(
        "newArr.append(arr.pop(smallest))",
        vars(),
        `Pop arr[${smallest}] = ${item} and append it to newArr.`,
      );
    }
    call.returns = { value: newArr };
    step("return newArr", vars(), `newArr is sorted: ${pyRepr(newArr)}.`);
    stack.pop();
    return newArr;
  }

  step("print(selectionSort(", vars(), `The script sorts ${pyRepr(input.arr)}.`);
  const result = selectionSort([...input.arr]);
  stdout.push(pyPrint(result));
  step("print(selectionSort(", vars(), "And prints the sorted list.");
  return rec.frames;
}
