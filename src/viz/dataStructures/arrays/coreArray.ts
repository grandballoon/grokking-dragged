/**
 * Port of grokking_data_structures-main/python/arrays/core.py: `Array`, the
 * fixed-size typed array every other array in the chapter is built on.
 *
 * Same fields as the Python: `_size` and `_array`, a list of exactly `_size`
 * slots filled with 0 (typecode 'l' and the other numeric typecodes; the
 * Unicode typecodes are not supported here).
 *
 * Port-only additions, so the drawing can follow values as they move:
 * - Each slot holds an `Item`, a number plus the identity of the value it is
 *   a copy of (`uid`) and a write stamp (`born`). Comparisons use `.value`.
 *   Writing a value stores a fresh copy with a new stamp, so when a value is
 *   copied from one slot to another, the newest copy is the one that "moved"
 *   and the older one is the copy left behind.
 * - `_id` names the array instance, so a diagram can tell the old and new
 *   arrays of a resize apart.
 * - `#clock` hands out stamps and ids; it is private, so frame snapshots
 *   (`structuredClone`) leave it out.
 */
import type { Located } from "../../../core/trace";
import { returned, type Outcome } from "../kit/outcome";
import { PyError } from "../kit/pyError";

export type Item = {
  readonly value: number;
  /** Identity of the value this is a copy of (e.g. the op that inserted it). */
  readonly uid: string;
  /** Write stamp: larger means written later. */
  readonly born: number;
};

/** A counter shared by all the arrays of one run. */
export type Clock = { t: number };

/** An array as a frame snapshot holds it: its fields, without methods. */
export type ArrayData = {
  readonly _id: string;
  readonly _size: number;
  readonly _array: readonly Item[];
};

/** Locals of core.py's methods, by their Python names. */
export type CoreLocals = {
  readonly index?: number;
  readonly val?: number;
  readonly fill?: number;
  readonly returned?: Outcome;
  readonly error?: string;
};

/**
 * Records a frame in core.py for the array `self`. The caller turns `self`
 * and the locals into its own `Vars`.
 */
export type CoreTrace = (
  where: string | Located,
  self: Array,
  note: string,
  locals?: CoreLocals,
) => void;

/** A value that has not been stored anywhere yet. */
export function item(value: number, uid: string): Item {
  return { value, uid, born: -1 };
}

export type InitTrace = {
  readonly trace: CoreTrace;
  /** "all" records every line of `__init__`; "fill" only the allocation. */
  readonly detail: "all" | "fill";
};

export class Array {
  readonly _id: string;
  _size = 0;
  _array: Item[] = [];
  readonly #clock: Clock;

  constructor(size: number, typecode = "l", clock: Clock, init?: InitTrace) {
    this.#clock = clock;
    this._id = `a${clock.t++}`;
    const all = init?.detail === "all" ? init.trace : undefined;
    if (size <= 0) {
      const error = new PyError(
        "ValueError",
        `Invalid array size (must be positive): ${size}`,
      );
      init?.trace("raise ValueError(f'Invalid array size", this, error.message, {
        error: error.message,
      });
      throw error;
    }
    this._size = size;
    all?.("self._size = size", this, `Array(${size}): room for exactly ${size} values.`);
    if ("uw".includes(typecode)) throw new Error("Unicode typecodes are not ported");
    const fill = 0;
    all?.(
      "fill = ",
      this,
      `Typecode '${typecode}' holds numbers, so the fill value is 0.`,
      { fill },
    );
    this._array = Array.filled(fill, size, this._id, clock.t++);
    init?.trace(
      "self._array = array.array(typecode, [fill] * size)",
      this,
      `All ${size} slots are allocated up front, each holding ${fill}.`,
      { fill },
    );
  }

  private static filled(fill: number, size: number, id: string, born: number): Item[] {
    return globalThis.Array.from({ length: size }, (_, i) => ({
      value: fill,
      uid: `${id}-${i}`,
      born,
    }));
  }

  __len__(): number {
    return this._size;
  }

  __getitem__(index: number, trace?: CoreTrace): Item {
    const inRange = !(index < 0 || index >= this._size);
    trace?.(
      { snippet: "if index < 0 or index >= self._size:", after: "def __getitem__" },
      this,
      boundsNote(index, this._size),
      { index },
    );
    if (!inRange) {
      const error = new PyError("IndexError", "array index out of range");
      trace?.("raise IndexError('array index out of range')", this, error.message, {
        index,
        error: error.message,
      });
      throw error;
    }
    const value = this._array[index]!;
    trace?.(
      "return self._array[index]",
      this,
      `Reading slot ${index} is one step, wherever it is: it holds ${value.value}.`,
      { index, returned: returned("__getitem__", value.value) },
    );
    return value;
  }

  __setitem__(index: number, val: Item, trace?: CoreTrace): void {
    const inRange = !(index < 0 || index >= this._size);
    trace?.(
      { snippet: "if index < 0 or index >= self._size:", after: "def __setitem__" },
      this,
      boundsNote(index, this._size),
      { index, val: val.value },
    );
    if (!inRange) {
      const error = new PyError("IndexError", "array assignment index out of range");
      trace?.(
        "raise IndexError('array assignment index out of range')",
        this,
        error.message,
        {
          index,
          val: val.value,
          error: error.message,
        },
      );
      throw error;
    }
    this._array[index] = { value: val.value, uid: val.uid, born: this.#clock.t++ };
    trace?.(
      "self._array[index] = val",
      this,
      `Slot ${index} now holds ${val.value}; the other slots are untouched.`,
      { index, val: val.value },
    );
  }
}

function boundsNote(index: number, size: number): string {
  if (index < 0) return `Index ${index} is negative: Array does not wrap around.`;
  if (index >= size) return `Index ${index} is past the last slot, ${size - 1}.`;
  return `0 ≤ ${index} < ${size}, so index ${index} is in range.`;
}
