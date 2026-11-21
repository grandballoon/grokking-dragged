/**
 * Port of python-master/01/02/binary_search.py, as its `__main__` block runs
 * it: `search_iterative` on `my_list`, once for 3 and once for -1.
 *
 * `low` and `high` bound the part of the list that could still hold `item`;
 * each pass guesses the middle and throws away the half the guess rules
 * out. `stdout` holds what the two prints print. `search_recursive` is in
 * the file too, but the script never calls it (chapter 3 has its own page
 * for recursive binary search).
 */
import source from "@repo/python-master/01/02/binary_search.py?raw";
import { pythonSource } from "../../../core/pythonSource";
import { recorder, type Frame } from "../../../core/trace";
import { floorDiv, pyPrint, pyRepr } from "../../../core/python";

export const SRC = pythonSource("python-master/01/02/binary_search.py", source);

/** The list both prints search, and the item each print looks for. */
export type Input = {
  readonly my_list: readonly number[];
  readonly items: readonly [number, number];
};

export type Vars = {
  /** Which print's search is running (0 or 1), or null between them. */
  call: number | null;
  list: number[];
  item: number | null;
  low: number | null;
  high: number | null;
  mid: number | null;
  guess: number | null;
  /** What the running search returned, once it has. */
  returned: { value: number | null } | null;
  stdout: string[];
};

export const BOOK_INPUT: Input = { my_list: [1, 3, 5, 7, 9], items: [3, -1] };

const PRINT_LINES = [
  "print(bs.search_iterative(my_list, 3))",
  "print(bs.search_iterative(my_list, -1))",
];

/** A snippet inside `search_iterative`, which shares lines with `search_recursive`. */
const inIterative = (snippet: string) => ({
  snippet,
  after: "def search_iterative(self, list, item):",
});

export function run(input: Input): Frame<Vars>[] {
  const rec = recorder<Vars>();
  const step = rec.in(SRC);
  const my_list = [...input.my_list];
  const vars: Vars = {
    call: null,
    list: [],
    item: null,
    low: null,
    high: null,
    mid: null,
    guess: null,
    returned: null,
    stdout: [],
  };

  step("bs = BinarySearch()", vars, "Make a BinarySearch object to call its methods on.");
  step("my_list = [1, 3, 5, 7, 9]", vars, `my_list = ${pyRepr(my_list)}, a sorted list.`);

  function search_iterative(list: number[], item: number): number | null {
    const ret = (snippet: string, value: number | null, note: string) => {
      vars.returned = { value };
      step(inIterative(snippet), vars, note);
      return value;
    };
    vars.list = list;
    vars.item = item;
    vars.low = 0;
    step(inIterative("low = 0"), vars, `Search all of the list for ${item}: low = 0.`);
    vars.high = list.length - 1;
    step(
      inIterative("high = len(list) - 1"),
      vars,
      `high = ${list.length} - 1 = ${vars.high}.`,
    );

    for (;;) {
      const low = vars.low;
      const high = vars.high;
      step(
        inIterative("while low <= high:"),
        vars,
        low <= high
          ? `${low} <= ${high}: there's still a part of the list to search.`
          : `${low} > ${high}: nothing left to search.`,
      );
      if (!(low <= high)) break;
      const mid = floorDiv(low + high, 2);
      vars.mid = mid;
      step(
        inIterative("mid = (low + high) // 2"),
        vars,
        `mid = (${low} + ${high}) // 2 = ${mid}.`,
      );
      const guess = list[mid]!;
      vars.guess = guess;
      step(inIterative("guess = list[mid]"), vars, `guess = list[${mid}] = ${guess}.`);
      step(
        inIterative("if guess == item:"),
        vars,
        guess === item ? `${guess} == ${item}: found it!` : `${guess} isn't ${item}.`,
      );
      if (guess === item) return ret("return mid", mid, `Return its index, ${mid}.`);
      step(
        inIterative("if guess > item:"),
        vars,
        guess > item
          ? `${guess} > ${item}: the guess was too high.`
          : `${guess} < ${item}: the guess was too low.`,
      );
      if (guess > item) {
        vars.high = mid - 1;
        step(
          inIterative("high = mid - 1"),
          vars,
          `Throw away the top half: high = ${mid} - 1 = ${vars.high}.`,
        );
      } else {
        vars.low = mid + 1;
        step(
          inIterative("low = mid + 1"),
          vars,
          `Throw away the bottom half: low = ${mid} + 1 = ${vars.low}.`,
        );
      }
    }
    return ret("return None", null, `${item} isn't in the list: return None.`);
  }

  input.items.forEach((item, k) => {
    const line = PRINT_LINES[k]!;
    Object.assign(vars, {
      call: k,
      list: [],
      item: null,
      low: null,
      high: null,
      mid: null,
      guess: null,
      returned: null,
    });
    step(line, vars, `Call search_iterative(my_list, ${item}).`);
    const result = search_iterative(my_list, item);
    vars.stdout.push(pyPrint(result));
    step(line, vars, `It returned ${pyRepr(result)}, which gets printed.`);
  });
  return rec.frames;
}
