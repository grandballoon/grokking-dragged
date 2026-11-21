/**
 * Port of grokking_data_structures-main/python/k_largest_elements.py and its
 * `__main__` demo.
 *
 * `k_largest_elements` keeps the k largest values seen so far in a Heap of
 * `(index, value)` tuples whose priority is `-value`: the smallest of them
 * has the highest priority and sits at the root, ready to be evicted when a
 * larger value comes along. The Heap is the port of queues/heap.py, so each
 * heap call steps into heap.py. A tuple's index is unique in `arr`, so it
 * doubles as the tuple's identity across frames.
 */
import { recorder, type Frame, type Located } from "../../../../core/trace";
import { attempt } from "../../kit/pyError";
import { HEAP, K_LARGEST_ELEMENTS } from "../../sources";
import { Heap, type HeapCall } from "../heap/heap";

export const SRC = K_LARGEST_ELEMENTS;
export const HEAP_SRC = HEAP;

/** A Python `(index, value)` tuple. */
export type Pair = readonly [number, number];

export type Input = { readonly arr: readonly number[]; readonly k: number };

export type Vars = {
  arr: readonly number[];
  k: number;
  /** The loop variable, once the loop has started (Python keeps it after). */
  i: number | null;
  /** `heap._elements`, once the heap exists. */
  heap: Pair[] | null;
  /** Active Heap calls, outermost first, below `k_largest_elements` itself. */
  stack: HeapCall<Pair>[];
  /** The list `[heap.top() for _ in range(k)]`, while it is being built. */
  result: Pair[] | null;
  /** What `k_largest_elements` returned. */
  returned: Pair[] | null;
  stdout: string[];
};

/** The array from the `__main__` block, and its k. */
export const INITIAL_INPUT: Input = {
  arr: [55, 71, 43, 59, 10, 20, 15, 44, 11, 234, 23, -45],
  k: 6,
};

export function showPair([index, value]: Pair): string {
  return `(${index}, ${value})`;
}

function showPairs(pairs: readonly Pair[]): string {
  return `[${pairs.map(showPair).join(", ")}]`;
}

export function run({ arr, k }: Input): Frame<Vars>[] {
  const rec = recorder<Vars>();
  const mainStep = rec.in(SRC);
  const heapStep = rec.in(HEAP_SRC);
  const stack: HeapCall<Pair>[] = [];
  let i: number | null = null;
  let heap: Heap<Pair> | null = null;
  let result: Pair[] | null = null;
  let returnedPairs: Pair[] | null = null;
  const stdout: string[] = [];
  const vars = (elements: Pair[] | null): Vars => ({
    arr,
    k,
    i,
    heap: elements,
    stack,
    result,
    returned: returnedPairs,
    stdout,
  });
  const step = (where: string | Located, note: string) =>
    mainStep(where, vars(heap?._elements ?? null), note);

  step("arr = [", `The demo's array has ${arr.length} values. Find the ${k} largest.`);

  // The demo doesn't catch an exception: its frame at the raise is the last step.
  attempt(() => {
    returnedPairs = k_largest_elements();
    stdout.push(showPairs(returnedPairs));
    step(
      "print(k_largest_elements(arr, 6))",
      `It prints ${stdout[0]}: the ${k} largest values, smallest first.`,
    );
  });
  return rec.frames;

  function k_largest_elements(): Pair[] {
    const h = new Heap<Pair>(
      {
        stack,
        step: (where, live, note) => heapStep(where, vars(live._elements ?? null), note),
        show: showPair,
      },
      null,
      (x) => -x[1],
    );
    heap = h;
    step(
      "heap = Heap(element_priority=lambda x: -x[1])",
      "Its priority is -value, so the smallest value in the heap sits at the root.",
    );
    for (i = 0; i < arr.length; i++) {
      const value = arr[i]!;
      step("for i in range(len(arr)):", `i = ${i}: look at arr[${i}] = ${value}.`);
      const full = h.__len__() >= k;
      step(
        "if len(heap) >= k:",
        full
          ? `The heap already holds ${k}, so ${value} must beat the smallest of them.`
          : `The heap holds ${h.__len__()} of ${k}, so ${value} goes straight in.`,
      );
      if (full) {
        const smallest = h.peek()[1];
        const larger = smallest < value;
        step(
          "if heap.peek()[1] < arr[i]:",
          larger
            ? `The smallest kept value is ${smallest} < ${value}: swap it out.`
            : `The smallest kept value is ${smallest}, not less than ${value}: skip it.`,
        );
        if (larger) {
          const evicted = h.top();
          step("heap.top()  # remove", `${showPair(evicted)} is out of the running.`);
          h.insert([i, value]);
          step(
            { snippet: "heap.insert((i, arr[i]))", after: "heap.top()" },
            `(${i}, ${value}) is in the heap.`,
          );
          const valid = h._validate();
          step("heap._validate()", `_validate() returned ${valid ? "True" : "False"}.`);
        }
      } else {
        h.insert([i, value]);
        step(
          { snippet: "heap.insert((i, arr[i]))", after: "else:" },
          `(${i}, ${value}) is in the heap.`,
        );
      }
    }
    i = arr.length - 1;
    result = [];
    for (let n = 0; n < k; n++) {
      result.push(h.top());
      step(
        "return [heap.top() for _ in range(k)]",
        `top() #${n + 1} gives ${showPair(result.at(-1)!)}, the smallest value left.`,
      );
    }
    return result;
  }
}
