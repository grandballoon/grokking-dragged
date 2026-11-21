/**
 * Port of grokking_data_structures-main/python/arrays/unsorted_array.py,
 * driven by an operation script.
 *
 * `UnsortedArray` keeps the Python's fields (`_array`, a core `Array` of
 * `_max_size` slots, and `_size`) and method bodies statement for statement.
 * Values are `Item`s (see coreArray.ts) so the drawing can follow them; the
 * comparisons use their `.value`. `traverse` is called with `print` as its
 * callback, so what it visits lands in `stdout`.
 */
import { recorder, type Frame, type Located } from "../../../../core/trace";
import { script, type Op } from "../../opScript";
import { ARRAY_CORE, UNSORTED_ARRAY } from "../../sources";
import {
  Array,
  item,
  type ArrayData,
  type Clock,
  type CoreTrace,
  type Item,
} from "../coreArray";
import { returned, type Outcome } from "../../kit/outcome";
import { PyError } from "../../kit/pyError";
import { scriptRunner } from "../../kit/script";

export const SRC = UNSORTED_ARRAY;

export type Input = {
  readonly max_size: number;
  /** `insert(v)`, `delete(index)`, `find(v)` and `traverse()` calls. */
  readonly ops: readonly Op[];
};

/** Locals of the methods, by their Python names. */
export type Locals = {
  readonly index?: number;
  readonly new_entry?: number;
  readonly target?: number;
  /** Port-only: the slot the current line reads or writes, to highlight it. */
  readonly slot?: number;
  readonly returned?: Outcome;
  readonly error?: string;
};

export type Vars = {
  _array: ArrayData;
  _max_size: number;
  _size: number;
  index: number | null;
  new_entry: number | null;
  target: number | null;
  slot: number | null;
  /** What the current method returned, once it has. */
  returned: Outcome | null;
  /** The exception the current call raised, as `ValueError: ...`. */
  error: string | null;
  /** Index of the op being run, or null while the array is being built. */
  op: number | null;
  stdout: string[];
};

type Trace = (
  where: string | Located,
  self: UnsortedArray,
  note: string,
  locals?: Locals,
) => void;

export type Hooks = {
  readonly clock: Clock;
  readonly trace: Trace;
  readonly core: CoreTrace;
};

export class UnsortedArray {
  _array: Array;
  _max_size: number;
  _size: number;
  readonly #trace: Trace;

  constructor(max_size: number, typecode = "l", hooks: Hooks) {
    this.#trace = hooks.trace;
    // core.py's Array, not the built-in one.
    // eslint-disable-next-line @typescript-eslint/no-array-constructor
    this._array = new Array(max_size, typecode, hooks.clock, {
      trace: hooks.core,
      detail: "fill",
    });
    this._max_size = max_size;
    this._size = 0;
    this.#trace(
      "self._size = 0",
      this,
      `UnsortedArray(${max_size}) starts empty: _size is 0, though all ${max_size} slots exist.`,
    );
  }

  insert(new_entry: Item): void {
    const v = new_entry.value;
    const full = this._size >= this._array.__len__();
    this.#trace(
      "if self._size >= len(self._array):",
      this,
      full
        ? `All ${this._size} slots are taken: there is no room for ${v}.`
        : `_size ${this._size} < ${this._array.__len__()}: there is room for ${v}.`,
      { new_entry: v },
    );
    if (full) {
      this.#raise(
        "raise ValueError('The array is already full')",
        "The array is already full",
        {
          new_entry: v,
        },
      );
    }
    this._array.__setitem__(this._size, new_entry);
    this.#trace(
      "self._array[self._size] = new_entry",
      this,
      `No searching, no shifting: ${v} goes straight into the first free slot, ${this._size}.`,
      { new_entry: v, slot: this._size },
    );
    this._size += 1;
    this.#trace("self._size += 1", this, `_size is now ${this._size}.`, { new_entry: v });
  }

  delete(index: number): void {
    if (this._size === 0) {
      this.#trace("if self._size == 0:", this, "The array is empty.", { index });
      this.#raise(
        "raise ValueError('Delete from an empty array')",
        "Delete from an empty array",
        {
          index,
        },
      );
    }
    const outside = index < 0 || index >= this._size;
    this.#trace(
      "elif index < 0 or index >= self._size:",
      this,
      outside
        ? `Index ${index} is outside 0..${this._size - 1}.`
        : `Index ${index} holds ${this._array.__getitem__(index).value}, the value to delete.`,
      outside ? { index } : { index, slot: index },
    );
    if (outside) {
      this.#raise(
        "raise ValueError(f'Index {index} out of range.')",
        `Index ${index} out of range.`,
        { index },
      );
    }
    const last = this._size - 1;
    this._array.__setitem__(index, this._array.__getitem__(this._size - 1));
    this.#trace(
      "self._array[index] = self._array[self._size-1]",
      this,
      index === last
        ? `Index ${index} is already the last element, so nothing needs to move.`
        : `Order doesn't matter, so the last element, ${this._array.__getitem__(index).value}, moves into the hole at ${index}.`,
      { index, slot: index },
    );
    this._size -= 1;
    this.#trace(
      "self._size -= 1",
      this,
      `_size drops to ${this._size}; slot ${this._size} is no longer in use.`,
      { index },
    );
  }

  find(target: number): number | null {
    for (let index = 0; index < this._size; index++) {
      const v = this._array.__getitem__(index).value;
      this.#trace(
        "if self._array[index] == target:",
        this,
        v === target
          ? `a[${index}] is ${target}: found it.`
          : `a[${index}] is ${v}, not ${target}.`,
        { index, target, slot: index },
      );
      if (v === target) {
        this.#trace("return index", this, `find returns ${index}.`, {
          index,
          target,
          slot: index,
          returned: returned("find", index),
        });
        return index;
      }
    }
    this.#trace(
      "return None",
      this,
      `Checked all ${this._size} elements: ${target} isn't there, so find returns None.`,
      { target, returned: returned("find", null) },
    );
    return null;
  }

  traverse(callback: (value: number) => void): void {
    for (let index = 0; index < this._size; index++) {
      const v = this._array.__getitem__(index).value;
      callback(v);
      this.#trace("callback(self._array[index])", this, `callback(${v}) prints ${v}.`, {
        index,
        slot: index,
      });
    }
  }

  #raise(where: string, message: string, locals: Locals): never {
    const error = new PyError("ValueError", message);
    this.#trace(where, this, error.message, { ...locals, error: error.message });
    throw error;
  }
}

export const INITIAL_INPUT: Input = {
  max_size: 5,
  ops: script(
    ["insert", 4],
    ["insert", -2],
    ["insert", 55],
    ["insert", 7],
    ["find", 55],
    ["delete", 1],
    ["traverse"],
    ["insert", 9],
    ["insert", 3],
    ["insert", 8],
    ["delete", 6],
    ["find", 6],
  ),
};

export function run(input: Input): Frame<Vars>[] {
  const rec = recorder<Vars>();
  const step = rec.in(SRC);
  const stepCore = rec.in(ARRAY_CORE);
  const runner = scriptRunner(input.ops);
  const stdout: string[] = [];
  type Fields = Pick<Vars, "_array" | "_max_size" | "_size">;
  const vars = (self: Fields, l: Locals): Vars => ({
    _array: self._array,
    _max_size: self._max_size,
    _size: self._size,
    index: l.index ?? null,
    new_entry: l.new_entry ?? null,
    target: l.target ?? null,
    slot: l.slot ?? null,
    returned: l.returned ?? null,
    error: l.error ?? null,
    op: runner.op,
    stdout,
  });

  const arr = new UnsortedArray(input.max_size, "l", {
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
  runner.run((op) => call(arr, op, stdout));
  return rec.frames;
}

function call(arr: UnsortedArray, op: Op, stdout: string[]): void {
  const arg = op.args[0] ?? 0;
  switch (op.name) {
    case "insert":
      return arr.insert(item(arg, op.id));
    case "delete":
      return arr.delete(arg);
    case "find":
      arr.find(arg);
      return;
    case "traverse":
      return arr.traverse((value) => stdout.push(String(value)));
    default:
      throw new Error(`Unknown op ${op.name}`);
  }
}
