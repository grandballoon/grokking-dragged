/**
 * Port of python-master/03/05_binary_search_recursive.py.
 *
 * `binary_search(arr, target)` looks at the middle item and calls itself on
 * the half that could still hold `target`: `arr[:mid]` or `arr[(mid + 1):]`.
 * The right half's indexes start at `mid + 1`, so an index found there is
 * shifted back by `(mid + 1)` on the way out. Each active call is an entry
 * on `stack`, outermost first; `stdout` holds what the two prints print.
 */
import source from "@repo/python-master/03/05_binary_search_recursive.py?raw";
import { pythonSource } from "../../../core/pythonSource";
import { recorder, type Frame } from "../../../core/trace";
import type { Known } from "../kit/linearCalls";
import { floorDiv, pyPrint, pyRepr, pySlice } from "../../../core/python";

export const SRC = pythonSource("python-master/03/05_binary_search_recursive.py", source);

/** The list both prints search, and the target of each print. */
export type Input = {
  readonly arr: readonly number[];
  readonly targets: readonly [number, number];
};

type Index = number | null;

export type Call = {
  /** Which call this is, counting from 0; for drawing, not a Python value. */
  uid: number;
  arr: number[];
  target: number;
  mid: number | null;
  recursive_response: Known<Index> | null;
  /** What this call's own recursive call gave back, once it has. */
  got: Known<Index> | null;
  /** What this call returns, once it does. */
  returns: Known<Index> | null;
};

export type Vars = { stack: Call[]; stdout: string[] };

export const BOOK_INPUT: Input = { arr: [6, 7, 8, 9, 10], targets: [8, 6] };

const CALL_LINES = [
  "binary_search([6, 7, 8, 9, 10], 8))",
  "binary_search([6, 7, 8, 9, 10], 6))",
];

export function run(input: Input): Frame<Vars>[] {
  const rec = recorder<Vars>();
  const step = rec.in(SRC);
  const stack: Call[] = [];
  const stdout: string[] = [];
  const vars = (): Vars => ({ stack, stdout });
  let calls = 0;

  function binary_search(arr: number[], target: number): Index {
    const call: Call = {
      uid: calls++,
      arr,
      target,
      mid: null,
      recursive_response: null,
      got: null,
      returns: null,
    };
    stack.push(call);
    const ret = (snippet: string, value: Index, note: string): Index => {
      call.returns = { value };
      step(snippet, vars(), note);
      stack.pop();
      return value;
    };
    step(
      "def binary_search(arr, target):",
      vars(),
      `binary_search(${pyRepr(arr)}, ${target}) starts.`,
    );
    step(
      "if len(arr) == 0:",
      vars(),
      arr.length === 0 ? "Nothing left to search." : `${arr.length} items to search.`,
    );
    if (arr.length === 0) {
      return ret("return None", null, `${target} isn't here: return None.`);
    }
    const mid = floorDiv(arr.length, 2);
    call.mid = mid;
    step(
      "mid = len(arr) // 2",
      vars(),
      `The middle is index ${arr.length} // 2 = ${mid}.`,
    );
    step(
      "if arr[mid] == target:",
      vars(),
      arr[mid] === target
        ? `arr[${mid}] is ${target}: found it!`
        : `arr[${mid}] is ${arr[mid]}, not ${target}.`,
    );
    if (arr[mid] === target) {
      return ret("return mid", mid, `Return its index here, ${mid}.`);
    }
    step(
      "elif arr[mid] > target:",
      vars(),
      arr[mid]! > target
        ? `${arr[mid]} > ${target}: the target can only be in the left half.`
        : `${arr[mid]} < ${target}: the target can only be in the right half.`,
    );
    if (arr[mid]! > target) {
      const left = pySlice(arr, 0, mid);
      const where = "return binary_search(arr[:mid], target)";
      step(where, vars(), `Search arr[:${mid}] = ${pyRepr(left)} and wait.`);
      const got = binary_search(left, target);
      call.got = { value: got };
      step(where, vars(), `The left half gave back ${pyRepr(got)}.`);
      return ret(
        where,
        got,
        `Its indexes are the same as ours, so return ${pyRepr(got)} as it is.`,
      );
    }
    const right = pySlice(arr, mid + 1);
    const where = "recursive_response = binary_search(arr[(mid + 1) :], target)";
    step(
      where,
      vars(),
      `Search arr[${mid + 1}:] = ${pyRepr(right)}, whose index 0 is our index ${mid + 1}.`,
    );
    const recursive_response = binary_search(right, target);
    call.got = { value: recursive_response };
    call.recursive_response = { value: recursive_response };
    step(where, vars(), `recursive_response = ${pyRepr(recursive_response)}.`);
    if (recursive_response !== null) {
      return ret(
        "(mid + 1) + recursive_response",
        mid + 1 + recursive_response,
        `Shift it back into our indexes: (${mid} + 1) + ${recursive_response} = ${mid + 1 + recursive_response}.`,
      );
    }
    return ret(
      "else recursive_response",
      null,
      "recursive_response is None, so return None.",
    );
  }

  input.targets.forEach((target, k) => {
    const line = CALL_LINES[k]!;
    step(line, vars(), `Call binary_search(${pyRepr(input.arr)}, ${target}).`);
    const result = binary_search([...input.arr], target);
    stdout.push(pyPrint(result));
    step(line, vars(), `It returned ${pyRepr(result)}, which gets printed.`);
  });
  return rec.frames;
}
