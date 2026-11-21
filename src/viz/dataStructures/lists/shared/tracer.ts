/**
 * The shell that runs a list-like structure (linked list, stack, bag) over
 * an operation script and turns the steps its port records (see
 * kit/tracer.ts) into frames.
 *
 * A frame shows the instance the script calls, the Python call stack with
 * each call's locals, and an echo per op of what it returned or raised, as
 * a REPL would print it.
 */
import { recorder, type Frame } from "../../../../core/trace";
import { outcomeOf, type Outcome } from "../../kit/outcome";
import { scriptRunner } from "../../kit/script";
import { tracer, type Call, type Method, type Tracer } from "../../kit/tracer";
import type { Op } from "../../opScript";

export type { Call, Method, Tracer };

/** What the REPL shows after an op: the value it returned, or the exception. */
export type Echo = Outcome & {
  /** The id of the op, or `init` for the constructor. */
  readonly op: string;
};

export type Vars<O> = {
  /** The instance the script's calls go to, as its Python fields. */
  readonly obj: O;
  /** Active method calls, outermost first. */
  readonly stack: readonly Call[];
  /** Index of the script op being run; null while the instance is built. */
  readonly op: number | null;
  /** The node uid (or cell index) whose value was just returned or created. */
  readonly found: string | null;
  /** Echoes of the ops that have returned a value or raised so far. */
  readonly echoes: readonly Echo[];
};

export type ScriptSpec<O> = {
  /** A blank instance, before `__init__` runs. */
  readonly create: () => O;
  /** Run the constructor's `__init__`. */
  readonly init: (obj: O, t: Tracer) => void;
  /** Call the method an op names. */
  readonly apply: (obj: O, op: Op, t: Tracer) => void;
};

export function runScript<O>(spec: ScriptSpec<O>, ops: readonly Op[]): Frame<Vars<O>>[] {
  const rec = recorder<Vars<O>>();
  const runner = scriptRunner(ops);
  const obj = spec.create();
  const echoes: Echo[] = [];

  const setEcho = (outcome: Outcome) => {
    const op = runner.op === null ? "init" : ops[runner.op]!.id;
    const at = echoes.findIndex((e) => e.op === op);
    const echo = { ...outcome, op };
    if (at >= 0) echoes[at] = echo;
    else echoes.push(echo);
  };

  const t = tracer({
    newUid: runner.newUid,
    record(event) {
      const outcome = outcomeOf(event);
      if (outcome !== undefined) setEcho(outcome);
      const vars: Vars<O> = {
        obj,
        stack: event.stack,
        op: runner.op,
        found: event.found ?? null,
        echoes,
      };
      rec.in(event.src)(event.where, vars, event.note);
    },
  });

  spec.init(obj, t);
  runner.run((op) => spec.apply(obj, op, t));
  return rec.frames;
}
