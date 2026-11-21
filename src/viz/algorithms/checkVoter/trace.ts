/**
 * Port of python-master/05/02_check_voter.py.
 *
 * `voted` is the module-level dict from name to True; `check_voter` looks a
 * name up with `voted.get(name)`, which gives True or None, exactly as in
 * the file. The input is the sequence of names the script calls
 * `check_voter` with. `call` is the one addition: which of those calls is
 * running, so a drawing can point at it.
 */
import source from "@sources/python-master/05/02_check_voter.py?raw";
import { pythonSource } from "../../../core/pythonSource";
import { recorder, type Frame } from "../../../core/trace";

export const SRC = pythonSource("python-master/05/02_check_voter.py", source);

/** The names the script checks, in order. */
export const BOOK_CALLS = ["tom", "mike", "mike"];

export type Vars = {
  voted: Record<string, boolean>;
  /** Index into the input of the running `check_voter` call (not a Python variable). */
  call: number | null;
  name: string | null;
  stdout: string[];
};

/** Python's `voted.get(name)`: the stored value, or None. */
export function get(
  voted: Readonly<Record<string, boolean>>,
  name: string,
): boolean | null {
  return Object.hasOwn(voted, name) ? voted[name]! : null;
}

export function run(names: readonly string[]): Frame<Vars>[] {
  const rec = recorder<Vars>();
  const step = rec.in(SRC);
  const voted: Record<string, boolean> = {};
  const stdout: string[] = [];
  let call: number | null = null;
  let name: string | null = null;
  const vars = (): Vars => ({ voted, call, name, stdout });

  step("voted = {}", vars(), "Start with an empty dict: nobody has voted yet.");

  function check_voter(n: string) {
    name = n;
    step("def check_voter(name):", vars(), `Call check_voter("${n}").`);
    const seen = get(voted, n);
    step(
      "if voted.get(name):",
      vars(),
      seen
        ? `voted.get("${n}") is True: ${n} has voted already.`
        : `voted.get("${n}") is None: ${n} hasn't voted yet.`,
    );
    if (seen) {
      stdout.push("kick them out!");
      step('print("kick them out!")', vars(), `${n} already voted: kick them out!`);
    } else {
      voted[n] = true;
      step("voted[name] = True", vars(), `Record that ${n} has voted.`);
      stdout.push("let them vote!");
      step('print("let them vote!")', vars(), `Let ${n} vote.`);
    }
  }

  for (const [i, n] of names.entries()) {
    call = i;
    check_voter(n);
  }
  return rec.frames;
}
