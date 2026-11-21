/**
 * Port of python-master/04/01_loop_sum.py.
 *
 * `arr` is a list, `total` and `x` the Python locals; `sum` shadows the
 * built-in, exactly as in the file. The one addition is `at`, the position
 * of the `for` loop's hidden iterator, so a drawing can tell which item `x`
 * came from when values repeat.
 */
import { pyRepr } from "../../../core/python";
import source from "@repo/python-master/04/01_loop_sum.py?raw";
import { pythonSource } from "../../../core/pythonSource";
import { recorder, type Frame } from "../../../core/trace";

export const SRC = pythonSource("python-master/04/01_loop_sum.py", source);

/** The list the script passes to `sum`. */
export const BOOK_ARR = [1, 2, 3, 4];

export type Vars = {
  arr: number[];
  total: number | null;
  x: number | null;
  /** Index of the item `x` was taken from; `arr.length` once the loop is done. */
  at: number | null;
  stdout: string[];
};

export function run(input: readonly number[]): Frame<Vars>[] {
  const rec = recorder<Vars>();
  const step = rec.in(SRC);

  const arr = [...input];
  let total: number | null = null;
  let x: number | null = null;
  let at: number | null = null;
  const stdout: string[] = [];
  const vars = (): Vars => ({ arr, total, x, at, stdout });

  step(
    "def sum(arr):",
    vars(),
    `print(sum(${pyRepr(arr)})) calls this sum, which shadows Python's built-in sum.`,
  );
  total = 0;
  step("total = 0", vars(), "Start the running total at 0.");
  for (const [i, item] of arr.entries()) {
    x = item;
    at = i;
    step("for x in arr:", vars(), `Take the next item: x = ${x}.`);
    total += x;
    step("total += x", vars(), `Add ${x} to the total, which is now ${total}.`);
  }
  at = arr.length;
  step(
    "for x in arr:",
    vars(),
    arr.length === 0
      ? "arr is empty, so the loop body never runs."
      : "No items left, so the loop ends.",
  );
  step("return total", vars(), `sum returns ${total}.`);
  stdout.push(String(total));
  step("print(sum(", vars(), `print shows ${total}.`);
  return rec.frames;
}
