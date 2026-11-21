/**
 * Port of python-master/03/01_countdown.py.
 *
 * `countdown(i)` prints `i` and calls itself on `i - 1` until the base case
 * `i <= 0`. Each active call is an entry on `stack`, outermost first, holding
 * its argument `i`; what the program prints goes in `stdout`.
 */
import source from "@repo/python-master/03/01_countdown.py?raw";
import { pythonSource } from "../../../core/pythonSource";
import { recorder, type Frame } from "../../../core/trace";
import type { Known } from "../kit/linearCalls";
import { pyPrint } from "../../../core/python";

export const SRC = pythonSource("python-master/03/01_countdown.py", source);

export type Input = { readonly i: number };

export type Call = {
  /** Which call this is, counting from 0; for drawing, not a Python value. */
  uid: number;
  i: number;
  /** What `countdown(i-1)` gave back to this call, once it has. */
  got: Known<number> | null;
  /** What this call returns, once it does. */
  returns: Known<number> | null;
};

export type Vars = { stack: Call[]; stdout: string[] };

export const INITIAL_INPUT: Input = { i: 5 };

export function run(input: Input): Frame<Vars>[] {
  const rec = recorder<Vars>();
  const step = rec.in(SRC);
  const stack: Call[] = [];
  const stdout: string[] = [];
  const vars = (): Vars => ({ stack, stdout });
  let calls = 0;

  function countdown(i: number): number {
    const call: Call = { uid: calls++, i, got: null, returns: null };
    stack.push(call);
    step("def countdown(i):", vars(), `countdown(${i}) starts, on top of the stack.`);
    step(
      "if i <= 0:",
      vars(),
      i <= 0 ? `${i} <= 0: the base case.` : `${i} > 0, so not the base case yet.`,
    );
    if (i <= 0) {
      call.returns = { value: 0 };
      step("return 0", vars(), `countdown(${i}) returns 0.`);
      stack.pop();
      return 0;
    }
    stdout.push(pyPrint(i));
    step("print(i)", vars(), `Print ${i}.`);
    step(
      "return countdown(i-1)",
      vars(),
      `countdown(${i}) calls countdown(${i - 1}) and waits for it.`,
    );
    const got = countdown(i - 1);
    call.got = { value: got };
    step(
      "return countdown(i-1)",
      vars(),
      `countdown(${i - 1}) gave back ${got}; countdown(${i}) is back on top.`,
    );
    call.returns = { value: got };
    step("return countdown(i-1)", vars(), `countdown(${i}) returns ${got} too.`);
    stack.pop();
    return got;
  }

  step("countdown(5)", vars(), `The script calls countdown(${input.i}).`);
  countdown(input.i);
  step(
    "countdown(5)",
    vars(),
    `countdown(${input.i}) is done and the stack is empty. Its return value isn't printed.`,
  );
  return rec.frames;
}
