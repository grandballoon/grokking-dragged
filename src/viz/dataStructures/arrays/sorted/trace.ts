/**
 * Port of grokking_data_structures-main/python/arrays/sorted_array.py,
 * driven by an operation script.
 *
 * `SortedArray` keeps the Python's fields (`_array`, a `core.Array` of
 * `_max_size` slots, and `_size`) and method bodies statement for statement:
 * `insert` shifts larger values right from the back, `linear_search` stops
 * early once it passes the target, `binary_search` halves `left..right`, and
 * `delete` finds the target by binary search and shifts the rest left.
 * Values are `Item`s (see coreArray.ts); comparisons use their `.value`.
 */
import { recorder, type Frame, type Located } from "../../../../core/trace";
import { script, type Op } from "../../opScript";
import { ARRAY_CORE, SORTED_ARRAY } from "../../sources";
import * as core from "../coreArray";
import { returned, type Outcome } from "../../kit/outcome";
import { PyError } from "../../kit/pyError";
import { scriptRunner } from "../../kit/script";

export const SRC = SORTED_ARRAY;

export type Input = {
  readonly max_size: number;
  /** `insert(v)`, `linear_search(v)`, `binary_search(v)`, `delete(v)` calls. */
  readonly ops: readonly Op[];
};

/** Locals of the methods, by their Python names. */
export type Locals = {
  readonly value?: number;
  readonly target?: number;
  readonly i?: number;
  readonly left?: number;
  readonly right?: number;
  readonly mid_index?: number;
  readonly mid_val?: number;
  readonly index?: number | null;
  /** Port-only: the slot the current line reads or writes, to highlight it. */
  readonly slot?: number;
  readonly returned?: Outcome;
  readonly error?: string;
};

export type Vars = {
  _array: core.ArrayData;
  _max_size: number;
  _size: number;
  value: number | null;
  target: number | null;
  i: number | null;
  left: number | null;
  right: number | null;
  mid_index: number | null;
  mid_val: number | null;
  index: number | null;
  slot: number | null;
  /** What the current method returned, once it has. */
  returned: Outcome | null;
  /** The exception the current call raised, as `ValueError: ...`. */
  error: string | null;
  /** Index of the op being run, or null while the array is being built. */
  op: number | null;
};

type Trace = (
  where: string | Located,
  self: SortedArray,
  note: string,
  locals?: Locals,
) => void;

export type Hooks = {
  readonly clock: core.Clock;
  readonly trace: Trace;
  readonly core: core.CoreTrace;
};

export class SortedArray {
  _array: core.Array;
  _max_size: number;
  _size: number;
  readonly #trace: Trace;

  constructor(max_size: number, typecode = "l", hooks: Hooks) {
    this.#trace = hooks.trace;
    this._array = new core.Array(max_size, typecode, hooks.clock, {
      trace: hooks.core,
      detail: "fill",
    });
    this._max_size = max_size;
    this._size = 0;
    this.#trace(
      "self._size = 0",
      this,
      `SortedArray(${max_size}) starts empty: _size is 0, though all ${max_size} slots exist.`,
    );
  }

  #at(i: number): number {
    return this._array.__getitem__(i).value;
  }

  insert(item: core.Item): void {
    const value = item.value;
    const full = this._size >= this._max_size;
    this.#trace(
      "if self._size >= self._max_size:",
      this,
      full
        ? `All ${this._max_size} slots are taken: there is no room for ${value}.`
        : `_size ${this._size} < ${this._max_size}: there is room for ${value}.`,
      { value },
    );
    if (full) {
      this.#raise(
        "raise ValueError(f'The array is already full",
        `The array is already full, maximum size: ${this._max_size}`,
        { value },
      );
    }
    for (let i = this._size; i > 0; i--) {
      const before = this.#at(i - 1);
      this.#trace(
        "if self._array[i-1] <= value:",
        this,
        before <= value
          ? `a[${i - 1}] = ${before} ≤ ${value}, so ${value} belongs right after it, in slot ${i}.`
          : `a[${i - 1}] = ${before} > ${value}, so ${before} has to make room.`,
        { value, i, slot: i - 1 },
      );
      if (before <= value) {
        this._array.__setitem__(i, item);
        this.#trace("self._array[i] = value", this, `Slot ${i} gets ${value}.`, {
          value,
          i,
          slot: i,
        });
        this._size += 1;
        this.#trace(
          { snippet: "self._size += 1", after: "self._array[i] = value" },
          this,
          `_size is now ${this._size}, and the array is still sorted.`,
          { value },
        );
        return;
      } else {
        this._array.__setitem__(i, this._array.__getitem__(i - 1));
        this.#trace(
          "self._array[i] = self._array[i-1]",
          this,
          `Shift ${before} one slot right, from ${i - 1} to ${i}.`,
          { value, i, slot: i },
        );
      }
    }
    this._array.__setitem__(0, item);
    this.#trace(
      "self._array[0] = value",
      this,
      this._size === 0
        ? `The array is empty, so ${value} goes in slot 0.`
        : `Everything was larger and has shifted right, so ${value} goes in slot 0.`,
      { value, slot: 0 },
    );
    this._size += 1;
    this.#trace(
      { snippet: "self._size += 1", after: "self._array[0] = value" },
      this,
      `_size is now ${this._size}.`,
      { value },
    );
  }

  linear_search(target: number): number | null {
    for (let i = 0; i < this._size; i++) {
      const v = this.#at(i);
      this.#trace(
        "if self._array[i] == target:",
        this,
        v === target
          ? `a[${i}] is ${target}: found it.`
          : v > target
            ? `a[${i}] = ${v} is already past ${target}.`
            : `a[${i}] = ${v} < ${target}: keep going.`,
        { target, i, slot: i },
      );
      if (v === target) {
        this.#trace(
          { snippet: "return i", after: "def linear_search" },
          this,
          `linear_search returns ${i}.`,
          {
            target,
            i,
            slot: i,
            returned: returned("linear_search", i),
          },
        );
        return i;
      } else if (v > target) {
        this.#trace(
          { snippet: "return None", after: "elif self._array[i] > target:" },
          this,
          `Sorted order means everything after a[${i}] is larger too: stop early and return None.`,
          { target, i, slot: i, returned: returned("linear_search", null) },
        );
        return null;
      }
    }
    this.#trace(
      // The first `return None` in the file is the early exit above.
      { snippet: "return None", after: "return None" },
      this,
      `Reached the end without passing ${target}: linear_search returns None.`,
      { target, returned: returned("linear_search", null) },
    );
    return null;
  }

  binary_search(target: number): number | null {
    let left = 0;
    let right = this._size - 1;
    this.#trace(
      "right = self._size - 1",
      this,
      `Look for ${target} anywhere in a[${left}..${right}].`,
      { target, left, right },
    );
    while (left <= right) {
      const mid_index = Math.floor((left + right) / 2);
      const mid_val = this.#at(mid_index);
      const here = { target, left, right, mid_index, mid_val, slot: mid_index };
      this.#trace(
        "mid_val = self._array[mid_index]",
        this,
        `The middle of ${left}..${right} is (${left} + ${right}) // 2 = ${mid_index}, holding ${mid_val}.`,
        here,
      );
      if (mid_val === target) {
        this.#trace(
          "return mid_index",
          this,
          `${mid_val} is the target: return ${mid_index}.`,
          {
            ...here,
            returned: returned("binary_search", mid_index),
          },
        );
        return mid_index;
      } else if (mid_val > target) {
        right = mid_index - 1;
        this.#trace(
          "right = mid_index - 1",
          this,
          `${mid_val} > ${target}: drop the right half, right = ${right}.`,
          { ...here, right },
        );
      } else {
        left = mid_index + 1;
        this.#trace(
          "left = mid_index + 1",
          this,
          `${mid_val} < ${target}: drop the left half, left = ${left}.`,
          { ...here, left },
        );
      }
    }
    this.#trace(
      { snippet: "return None", after: "left = mid_index + 1" },
      this,
      `left ${left} > right ${right}: nothing is left to search, so return None.`,
      { target, left, right, returned: returned("binary_search", null) },
    );
    return null;
  }

  delete(target: number): void {
    const index = this.binary_search(target);
    this.#trace(
      "index = self.binary_search(target)",
      this,
      index === null
        ? `binary_search didn't find ${target}.`
        : `binary_search found ${target} at index ${index}.`,
      index === null ? { target, index } : { target, index, slot: index },
    );
    if (index === null) {
      this.#raise(
        "raise ValueError(f'Unable to delete element {target}",
        `Unable to delete element ${target}: the entry is not in the array`,
        { target, index },
      );
    }
    for (let i = index; i < this._size - 1; i++) {
      this._array.__setitem__(i, this._array.__getitem__(i + 1));
      this.#trace(
        "self._array[i] = self._array[i + 1]",
        this,
        `Shift ${this.#at(i)} one slot left, from ${i + 1} to ${i}.`,
        { target, index, i, slot: i },
      );
    }
    this._size -= 1;
    this.#trace(
      "self._size -= 1",
      this,
      `_size drops to ${this._size}: ${target} is gone and the array is still sorted.`,
      { target, index },
    );
  }

  #raise(where: string, message: string, locals: Locals): never {
    const error = new PyError("ValueError", message);
    this.#trace(where, this, error.message, { ...locals, error: error.message });
    throw error;
  }
}

export const INITIAL_INPUT: Input = {
  max_size: 6,
  ops: script(
    ["insert", 5],
    ["insert", 2],
    ["insert", 9],
    ["insert", 7],
    ["insert", 1],
    ["linear_search", 7],
    ["linear_search", 6],
    ["binary_search", 7],
    ["binary_search", 3],
    ["delete", 5],
    ["insert", 8],
    ["insert", 4],
    ["insert", 3],
  ),
};

export function run(input: Input): Frame<Vars>[] {
  const rec = recorder<Vars>();
  const step = rec.in(SRC);
  const stepCore = rec.in(ARRAY_CORE);
  const runner = scriptRunner(input.ops);
  type Fields = Pick<Vars, "_array" | "_max_size" | "_size">;
  const vars = (self: Fields, l: Locals): Vars => ({
    _array: self._array,
    _max_size: self._max_size,
    _size: self._size,
    value: l.value ?? null,
    target: l.target ?? null,
    i: l.i ?? null,
    left: l.left ?? null,
    right: l.right ?? null,
    mid_index: l.mid_index ?? null,
    mid_val: l.mid_val ?? null,
    index: l.index ?? null,
    slot: l.slot ?? null,
    returned: l.returned ?? null,
    error: l.error ?? null,
    op: runner.op,
  });

  const arr = new SortedArray(input.max_size, "l", {
    clock: { t: 0 },
    trace: (where, self, note, l = {}) => step(where, vars(self, l), note),
    // While the constructor builds `_array`, show it as the array to be.
    core: (where, self, note) =>
      stepCore(
        where,
        vars({ _array: self, _max_size: input.max_size, _size: 0 }, {}),
        note,
      ),
  });
  runner.run((op) => {
    const arg = op.args[0] ?? 0;
    switch (op.name) {
      case "insert":
        return arr.insert(core.item(arg, op.id));
      case "linear_search":
        arr.linear_search(arg);
        return;
      case "binary_search":
        arr.binary_search(arg);
        return;
      case "delete":
        return arr.delete(arg);
      default:
        throw new Error(`Unknown op ${op.name}`);
    }
  });
  return rec.frames;
}
