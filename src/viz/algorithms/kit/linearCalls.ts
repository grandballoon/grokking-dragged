/**
 * Card parts for a recursion where each call makes at most one call of its
 * own, waits for it, and returns a value: `fact`, `count`, `sum_array`, ...
 *
 * Each port's stack entry carries, beside its Python arguments and locals,
 * a `uid` (which call this is), `got` (what its own recursive call gave
 * back) and `returns` (what it returns). Those two are boxed as `{ value }`,
 * `null` until known, since the value itself may be Python's `None`.
 */
import { pyRepr } from "../../../core/python";
import { uid } from "../../../ui/svg";
import type { CardStatus, Hole, ValueChip } from "./callStack";

/** A value once it is known; boxed so that `None` (null) can be a value. */
export type Known<T> = { readonly value: T };

export type LinearCall<T> = {
  readonly uid: number;
  readonly got: Known<T> | null;
  readonly returns: Known<T> | null;
};

/** The id of the card for a call. */
export const callId = (call: { readonly uid: number }) => uid("call", call.uid);

/**
 * The id of the value handed to the call below `stack[i]` (or to the
 * script, for the outermost call). The callee's return chip and the
 * caller's filled-in hole share it, so the value slides down between them.
 */
function valueId<T>(stack: readonly LinearCall<T>[], i: number): string {
  const parent = stack[i - 1];
  return uid("value", parent === undefined ? "top" : parent.uid);
}

export function cardStatus<T>(stack: readonly LinearCall<T>[], i: number): CardStatus {
  if (i < stack.length - 1) return "waiting";
  return stack[i]!.returns === null ? "running" : "returning";
}

/** The chip for what `stack[i]` returns, once it does. */
export function returnChip<T>(
  stack: readonly LinearCall<T>[],
  i: number,
  text: (value: T) => string = pyRepr,
): ValueChip | undefined {
  const { returns } = stack[i]!;
  return returns === null
    ? undefined
    : { id: valueId(stack, i), text: text(returns.value) };
}

/**
 * The hole for `stack[i]`'s own recursive call: pending while that call is
 * on the stack above it, its value once it has returned, and nothing before
 * the call is made.
 */
export function callHole<T>(
  stack: readonly LinearCall<T>[],
  i: number,
  text: (value: T) => string = pyRepr,
): Hole | undefined {
  const call = stack[i]!;
  if (call.got !== null) {
    return { value: { id: uid("value", call.uid), text: text(call.got.value) } };
  }
  return i < stack.length - 1 ? { pending: "?" } : undefined;
}

/** `value` boxed once it is known, for ports that hold a value not known yet as null. */
export function known<T>(value: T | null): Known<T> | null {
  return value === null ? null : { value };
}
