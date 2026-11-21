/**
 * Port of python-master/03/03_factorial.py.
 *
 * `fact(x)` multiplies `x` by `fact(x-1)`, so every call has to wait for the
 * one above it before it can finish: the stack grows down to the base case
 * `x == 1`, then the products flow back down it. Each active call is an
 * entry on `stack`, outermost first.
 */
import source from "@sources/python-master/03/03_factorial.py?raw";
import { pythonSource } from "../../../core/pythonSource";
import { recorder, type Frame } from "../../../core/trace";
import type { Known } from "../kit/linearCalls";
import { pyPrint } from "../../../core/python";

export const SRC = pythonSource("python-master/03/03_factorial.py", source);

export type Input = { readonly x: number };

export type Call = {
  /** Which call this is, counting from 0; for drawing, not a Python value. */
  uid: number;
  x: number;
  /** What `fact(x-1)` gave back to this call, once it has. */
  got: Known<number> | null;
  /** What this call returns, once it does. */
  returns: Known<number> | null;
};

export type Vars = { stack: Call[]; stdout: string[] };

export const INITIAL_INPUT: Input = { x: 5 };

export function run(input: Input): Frame<Vars>[] {
  const rec = recorder<Vars>();
  const step = rec.in(SRC);
  const stack: Call[] = [];
  const stdout: string[] = [];
  const vars = (): Vars => ({ stack, stdout });
  let calls = 0;

  function fact(x: number): number {
    const call: Call = { uid: calls++, x, got: null, returns: null };
    stack.push(call);
    step("def fact(x):", vars(), `fact(${x}) starts, on top of the stack.`);
    step(
      "if x == 1:",
      vars(),
      x === 1 ? "x is 1: the base case." : `x is ${x}, not 1, so recurse.`,
    );
    if (x === 1) {
      call.returns = { value: 1 };
      step("return 1", vars(), "fact(1) returns 1.");
      stack.pop();
      return 1;
    }
    step(
      "return x * fact(x-1)",
      vars(),
      `fact(${x}) needs fact(${x - 1}) before it can multiply, so it calls it and waits.`,
    );
    const got = fact(x - 1);
    call.got = { value: got };
    step(
      "return x * fact(x-1)",
      vars(),
      `fact(${x - 1}) gave back ${got}; fact(${x}) can now work out ${x} * ${got}.`,
    );
    const result = x * got;
    call.returns = { value: result };
    step("return x * fact(x-1)", vars(), `fact(${x}) returns ${x} * ${got} = ${result}.`);
    stack.pop();
    return result;
  }

  step("print(fact(5))", vars(), `The script calls fact(${input.x}).`);
  const result = fact(input.x);
  stdout.push(pyPrint(result));
  step(
    "print(fact(5))",
    vars(),
    `fact(${input.x}) is ${result}, and the script prints it.`,
  );
  return rec.frames;
}
