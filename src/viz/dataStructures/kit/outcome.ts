/**
 * What a method call came to, as the demo around it would print it: the
 * value it returned, or the exception it raised.
 */
import { pyRepr } from "../../../core/python";
import type { PyError } from "./pyError";
import type { Event } from "./tracer";

export type Outcome = {
  /** The method that returned or raised, e.g. `find`. */
  readonly from: string;
  /** Python's repr of the value returned, or the exception as Python prints it. */
  readonly text: string;
  /** The exception's class, e.g. `ValueError`, or null if the call returned. */
  readonly raised: string | null;
};

/** `from` returned `value`. */
export function returned(from: string, value: unknown): Outcome {
  return { from, text: pyRepr(value), raised: null };
}

/** `from` raised `error`. */
export function raised(from: string, error: PyError): Outcome {
  return { from, text: error.message, raised: error.type };
}

/**
 * What a recorded step says about how the script's call came out: it
 * raised, or the op's own method returned (what its callees return is
 * theirs). Undefined for any other step.
 */
export function outcomeOf(event: Event): Outcome | undefined {
  const fn = event.stack.at(-1)!.fn;
  if (event.raised !== undefined) return raised(fn, event.raised);
  if (event.stack.length === 1 && "returns" in event) return returned(fn, event.returns);
  return undefined;
}
