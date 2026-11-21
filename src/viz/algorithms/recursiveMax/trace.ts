/**
 * Port of python-master/04/04_recursive_max.py.
 *
 * `max` (shadowing the built-in) takes a list and recurses on the slice
 * `lst[1:]`; its local `max_num` holds what that call returned. The file
 * only defines `max`, so the port calls it once on its input. The recursion
 * shows up as `stack`, one entry per active call, outermost first.
 */
import { pyRepr } from "../../../core/python";
import source from "@sources/python-master/04/04_recursive_max.py?raw";
import { pythonSource } from "../../../core/pythonSource";
import { recorder, type Frame } from "../../../core/trace";

export const SRC = pythonSource("python-master/04/04_recursive_max.py", source);

/** The file never calls `max`; this is the list it searches here. */
export const DEFAULT_LIST = [3, 7, 2, 5];

export type Call = {
  lst: number[];
  /** The local `max_num`, once assigned. */
  max_num: number | null;
  /** Whether the call has returned; `returns` is null both before and for `None`. */
  returned: boolean;
  returns: number | null;
};

export type Vars = { stack: Call[] };

const pyBool = (b: boolean) => (b ? "True" : "False");

export function run(input: readonly number[]): Frame<Vars>[] {
  const rec = recorder<Vars>();
  const step = rec.in(SRC);
  const stack: Call[] = [];
  const vars = (): Vars => ({ stack });

  function max(lst: number[]): number | null {
    const call: Call = { lst, max_num: null, returned: false, returns: null };
    const ret = (value: number | null) => {
      call.returned = true;
      call.returns = value;
      return value;
    };
    stack.push(call);
    step(
      "def max(lst):",
      vars(),
      stack.length === 1
        ? `The file only defines max, so call it: max(${pyRepr(lst)}).`
        : `Call max(${pyRepr(lst)}).`,
    );
    step(
      "if len(lst) == 0:",
      vars(),
      lst.length === 0
        ? "lst is empty: there is no biggest item."
        : `len(lst) is ${lst.length}, not 0.`,
    );
    if (lst.length === 0) {
      ret(null);
      step("return None", vars(), "An empty list has no maximum, so return None.");
      stack.pop();
      return null;
    }
    step(
      "if len(lst) == 1:",
      vars(),
      lst.length === 1
        ? "lst has one item: this is the base case."
        : `len(lst) is ${lst.length}, not 1.`,
    );
    if (lst.length === 1) {
      ret(lst[0]!);
      step(
        { snippet: "return lst[0]", after: "if len(lst) == 1:" },
        vars(),
        `The only item is the biggest, so return ${lst[0]}.`,
      );
      stack.pop();
      return lst[0]!;
    }
    const rest = lst.slice(1);
    step(
      "max_num = max(lst[1:])",
      vars(),
      `Call max on the rest, ${pyRepr(rest)}, to find its biggest item.`,
    );
    // `rest` has at least one item, so this call never returns None.
    call.max_num = max(rest)!;
    step(
      "max_num = max(lst[1:])",
      vars(),
      `max(${pyRepr(rest)}) returned ${call.max_num}, so max_num = ${call.max_num}.`,
    );
    const head = lst[0]!;
    const bigger = head > call.max_num;
    ret(bigger ? head : call.max_num);
    step(
      "return lst[0] if lst[0] > max_num else max_num",
      vars(),
      `${head} > ${call.max_num} is ${pyBool(bigger)}, so return ${call.returns}.`,
    );
    stack.pop();
    return call.returns;
  }

  max([...input]);
  return rec.frames;
}
