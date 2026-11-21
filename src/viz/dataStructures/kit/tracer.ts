/**
 * How a ported method records its steps without knowing the visualization
 * it is part of.
 *
 * Every traced method takes a `Tracer` as its last argument. It opens its
 * call with `t.enter(SRC, "method_name")`, which names its own Python file,
 * and then records a step after each line it runs, handing over its locals
 * under their Python names. When it calls another traced method (a Stack's
 * `push` calling its list's `insert_in_front`), it passes `m.call(locals)`,
 * so the callee's steps carry the caller's call underneath: `Event.stack`
 * is the Python call stack, outermost call first.
 *
 * The visualization's `run` owns the root tracer. It decides what an event
 * becomes: which variables its frame shows, and whether it is recorded at
 * all. Tracers are passed as arguments, never stored on the ported objects,
 * because those objects end up in frames, which are copied with
 * `structuredClone` and so must hold only data.
 */
import type { PythonSource } from "../../../core/pythonSource";
import type { Located } from "../../../core/trace";
import { pyRepr } from "../../../core/python";
import { PyError } from "./pyError";

export type Where = string | Located;

/**
 * A function passed as an argument, as a frame holds it: by its Python
 * source (`lambda x: x == 8`, `value_matches_key`), since frames hold data.
 */
export type PyFunction = { readonly source: string };

export function isPyFunction(value: unknown): value is PyFunction {
  return (
    typeof value === "object" &&
    value !== null &&
    Object.keys(value).length === 1 &&
    typeof (value as { source?: unknown }).source === "string"
  );
}

/** A call's locals, under their Python names. */
export type Locals = Readonly<Record<string, unknown>>;

/** One active method call: its file, its name and its locals. */
export type Call = {
  readonly file: string;
  readonly fn: string;
  readonly locals: Locals;
};

/** What a step can say besides its locals. */
export type Facts = {
  /** The uid of the node (or index of the slot) whose value was just produced. */
  readonly found?: string;
  /**
   * The value the method returns at this line. The key is present only on
   * a line that returns, even when the value is None (`null`). A generator
   * driven by `list(...)` reports the list built so far at each `yield`.
   */
  readonly returns?: unknown;
};

/** One recorded step, for the root tracer's owner to turn into a frame. */
export type Event = Facts & {
  readonly src: PythonSource;
  readonly where: Where;
  readonly note: string;
  /** Active calls, outermost first; the last is the method recording. */
  readonly stack: readonly Call[];
  /** The same for every step of one call, and different for the next call. */
  readonly invocation: number;
  /** The exception, when this step is a `raise` line. */
  readonly raised?: PyError;
};

/** One call of a traced method. */
export type Method = {
  /** Record a step at `where`, after it ran, with this call's `locals`. */
  step(where: Where, locals: Locals, note: string, facts?: Facts): void;
  /** Record a step at a `raise` line, then raise. The note is the exception. */
  raise(where: Where, locals: Locals, type: string, detail: string): never;
  /** The tracer for a call made from this method while its locals are `locals`. */
  call(locals: Locals): Tracer;
};

export type Tracer = {
  enter(src: PythonSource, fn: string): Method;
  /** A fresh node identity: the one permitted addition to a node's fields. */
  newUid(): string;
  /** How a stored value reads in a note. */
  show(value: unknown): string;
  /** This tracer recording nothing, for a call not worth stepping into. */
  quiet(): Tracer;
};

export type TracerOptions = {
  readonly record: (event: Event) => void;
  readonly newUid: () => string;
  /** Defaults to Python's repr. */
  readonly show?: (value: unknown) => string;
};

export function tracer(options: TracerOptions): Tracer {
  const show = options.show ?? pyRepr;
  let invocations = 0;
  const make = (record: (event: Event) => void, callers: readonly Call[]): Tracer => ({
    enter(src, fn) {
      const invocation = ++invocations;
      const callOf = (locals: Locals): Call => ({ file: src.file, fn, locals });
      const emit = (where: Where, locals: Locals, note: string, more: object) =>
        record({
          src,
          where,
          note,
          stack: [...callers, callOf(locals)],
          invocation,
          ...more,
        });
      return {
        step: (where, locals, note, facts = {}) => emit(where, locals, note, facts),
        raise(where, locals, type, detail) {
          const error = new PyError(type, detail);
          emit(where, locals, error.message, { raised: error });
          throw error;
        },
        call: (locals) => make(record, [...callers, callOf(locals)]),
      };
    },
    newUid: options.newUid,
    show,
    quiet: () => make(() => {}, callers),
  });
  return make(options.record, []);
}

/**
 * Wraps `record` so that each call for which `brief(call)` holds shows only
 * its last step: every step it records replaces its previous one in
 * `frames` (the list `record` appends to), and the calls it makes record
 * nothing. A page that calls a structure dozens of times uses it to step
 * over those calls and keep its trace readable.
 */
export function stepOver(
  record: (event: Event) => void,
  frames: unknown[],
  brief: (call: Call) => boolean,
): (event: Event) => void {
  let lastBrief: number | null = null;
  return (event) => {
    const at = event.stack.findIndex(brief);
    if (at >= 0 && at < event.stack.length - 1) return;
    if (at >= 0 && lastBrief === event.invocation) frames.pop();
    record(event);
    lastBrief = at >= 0 ? event.invocation : null;
  };
}
