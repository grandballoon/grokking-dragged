/**
 * Port of python-master/03/02_greet.py.
 *
 * `greet` calls `greet2`, then `bye`. Each call gets its own entry on
 * `stack` (outermost first) while it runs, and `greet` sits paused beneath
 * them until they return. What the program prints goes in `stdout`.
 */
import source from "@repo/python-master/03/02_greet.py?raw";
import { pythonSource } from "../../../core/pythonSource";
import { recorder, type Frame } from "../../../core/trace";
import type { Known } from "../kit/linearCalls";
import { pyPrint } from "../../../core/python";

export const SRC = pythonSource("python-master/03/02_greet.py", source);

export type Input = { readonly name: string };

export type Call = {
  /** Which call this is, counting from 0; for drawing, not a Python value. */
  uid: number;
  fn: "greet" | "greet2" | "bye";
  /** The `name` argument; `bye` takes none. */
  name: string | null;
  /** None of these calls waits on a value; kept for the shared card helpers. */
  got: null;
  /** What this call returns (always None), once it does. */
  returns: Known<null> | null;
};

export type Vars = { stack: Call[]; stdout: string[] };

export const INITIAL_INPUT: Input = { name: "adit" };

const IN_GREET = "def greet(name):";

export function run(input: Input): Frame<Vars>[] {
  const rec = recorder<Vars>();
  const step = rec.in(SRC);
  const stack: Call[] = [];
  const stdout: string[] = [];
  const vars = (): Vars => ({ stack, stdout });
  let calls = 0;

  const enter = (fn: Call["fn"], name: string | null): Call => {
    const call: Call = { uid: calls++, fn, name, got: null, returns: null };
    stack.push(call);
    return call;
  };

  function greet2(name: string) {
    const call = enter("greet2", name);
    step("def greet2(name):", vars(), "greet2 starts, on top of greet.");
    stdout.push(pyPrint("how are you, ", name, "?"));
    step('print("how are you, ", name, "?")', vars(), "greet2 asks how you are.");
    call.returns = { value: null };
    step(
      'print("how are you, ", name, "?")',
      vars(),
      "greet2 has nothing left to do, so it returns None and comes off the stack.",
    );
    stack.pop();
  }

  function bye() {
    const call = enter("bye", null);
    step("def bye():", vars(), "bye starts, on top of greet.");
    stdout.push(pyPrint("ok bye!"));
    step('print("ok bye!")', vars(), "bye says goodbye.");
    call.returns = { value: null };
    step(
      'print("ok bye!")',
      vars(),
      "bye is done: it returns None and comes off the stack.",
    );
    stack.pop();
  }

  function greet(name: string) {
    const call = enter("greet", name);
    step(IN_GREET, vars(), `greet starts with name = '${name}'.`);
    stdout.push(pyPrint("hello, ", name, "!"));
    step('print("hello, ", name, "!")', vars(), "greet says hello.");
    const callGreet2 = { snippet: "greet2(name)", after: IN_GREET };
    step(callGreet2, vars(), "greet calls greet2 and pauses, half-way through.");
    greet2(name);
    step(callGreet2, vars(), "greet2 returned, so greet carries on where it paused.");
    stdout.push(pyPrint("getting ready to say bye..."));
    step('print("getting ready to say bye...")', vars(), "greet gets ready to say bye.");
    const callBye = { snippet: "bye()", after: IN_GREET };
    step(callBye, vars(), "greet calls bye and pauses again.");
    bye();
    step(callBye, vars(), "bye returned; greet is back on top.");
    call.returns = { value: null };
    step(callBye, vars(), "greet has run its last line: it returns None too.");
    stack.pop();
  }

  step('greet("adit")', vars(), `The script calls greet('${input.name}').`);
  greet(input.name);
  step('greet("adit")', vars(), "greet is done and the stack is empty.");
  return rec.frames;
}
