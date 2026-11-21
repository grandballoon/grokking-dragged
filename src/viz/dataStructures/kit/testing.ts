/** Helpers shared by the data-structure ports' tests. */
import type { Frame } from "../../../core/trace";

/** A linked node as a frame holds it. */
type ChainNode = { readonly _data: unknown; readonly _next: ChainNode | null };

/** A core Array as a frame holds it: slots of boxed values. */
type Slots = { readonly _array: readonly { readonly value: number }[] };

/**
 * The values a structure holds, as Python's `list(...)` gives them: a
 * linked chain from `head` along `_next`, or every slot of a core Array.
 */
export function values(of: ChainNode | null): unknown[];
export function values(of: Slots): number[];
export function values(of: ChainNode | Slots | null): unknown[] {
  if (of !== null && "_array" in of) return of._array.map((item) => item.value);
  const result: unknown[] = [];
  for (let n = of; n !== null; n = n._next) result.push(n._data);
  return result;
}

/** The last frame of each op of the script, in script order. */
export function endsOfOps<V extends { readonly op: number | null }>(
  frames: readonly Frame<V>[],
): Frame<V>[] {
  return frames.filter(
    (f, i) => f.vars.op !== null && frames[i + 1]?.vars.op !== f.vars.op,
  );
}
