/**
 * Port of grokking_data_structures-main/python/arrays/dynamic_array.py,
 * driven by an operation script.
 *
 * `DynamicArray` keeps the Python's fields (`_array`, a `core.Array` of
 * `_capacity` slots, `_size` and `_typecode`) and method bodies statement
 * for statement: `insert` doubles the capacity when the array is full, and
 * `delete` halves it once the array is three quarters empty, copying every
 * element from `old_array` into the new static array. Values are `Item`s
 * (see coreArray.ts); comparisons use their `.value`.
 */
import { recorder, type Frame, type Located } from "../../../../core/trace";
import { script, type Op } from "../../opScript";
import { ARRAY_CORE, DYNAMIC_ARRAY } from "../../sources";
import * as core from "../coreArray";
import { returned, type Outcome } from "../../kit/outcome";
import { PyError } from "../../kit/pyError";
import { scriptRunner } from "../../kit/script";

export const SRC = DYNAMIC_ARRAY;

export type Input = {
  readonly initial_capacity: number;
  /** `insert(v)` and `delete(v)` calls. */
  readonly ops: readonly Op[];
};

/** The fields a frame shows for `self`. */
export type Fields = {
  readonly _array: core.ArrayData;
  readonly _capacity: number;
  readonly _size: number;
};

/** Locals of the methods, by their Python names. */
export type Locals = {
  readonly value?: number;
  readonly target?: number;
  readonly i?: number;
  readonly index?: number | null;
  readonly old_array?: core.ArrayData;
  /** Port-only: a `core.Array` still being built inside a resize. */
  readonly allocating?: core.ArrayData;
  /** Port-only: the slot the current line reads or writes, to highlight it. */
  readonly slot?: number;
  readonly returned?: Outcome;
  readonly error?: string;
};

export type Vars = Fields & {
  value: number | null;
  target: number | null;
  i: number | null;
  index: number | null;
  old_array: core.ArrayData | null;
  allocating: core.ArrayData | null;
  slot: number | null;
  /** What `find` returned, once it has. */
  returned: Outcome | null;
  /** The exception the current call raised, as `ValueError: ...`. */
  error: string | null;
  /** Index of the op being run, or null while the array is being built. */
  op: number | null;
};

type Trace = (
  where: string | Located,
  self: Fields,
  note: string,
  locals?: Locals,
) => void;

export type Hooks = {
  readonly clock: core.Clock;
  /** Records a frame in dynamic_array.py. */
  readonly trace: Trace;
  /** Records a frame in core.py. */
  readonly core: Trace;
};

function invariant(holds: boolean): void {
  if (!holds) throw new Error("AssertionError");
}

export class DynamicArray {
  _array: core.Array;
  _capacity: number;
  _size: number;
  _typecode: string;
  readonly #hooks: Hooks;

  constructor(initial_capacity = 1, typecode = "l", hooks: Hooks) {
    this.#hooks = hooks;
    this._array = new core.Array(initial_capacity, typecode, hooks.clock, {
      trace: (where, a, note) =>
        hooks.core(where, { _array: a, _capacity: initial_capacity, _size: 0 }, note, {}),
      detail: "fill",
    });
    this._capacity = initial_capacity;
    this._size = 0;
    this._typecode = typecode;
    this.#trace(
      "self._typecode = typecode",
      `A DynamicArray starts with capacity ${initial_capacity} and nothing stored: _size is 0.`,
    );
  }

  #trace(where: string | Located, note: string, locals: Locals = {}): void {
    this.#hooks.trace(where, this, note, locals);
  }

  #at(i: number): number {
    return this._array.__getitem__(i).value;
  }

  /** A new `core.Array`, whose `__init__` frames show it beside `old_array`. */
  #allocate(capacity: number, old_array: core.Array): core.Array {
    return new core.Array(capacity, this._typecode, this.#hooks.clock, {
      trace: (where, a, note) =>
        this.#hooks.core(where, this, note, { old_array, allocating: a }),
      detail: "fill",
    });
  }

  _is_full(): boolean {
    return this._size >= this._capacity;
  }

  _double_size(): void {
    invariant(this._capacity === this._size);
    const old_array = this._array;
    this.#trace(
      { snippet: "old_array = self._array", after: "def _double_size" },
      `Every slot is taken. Keep the full array as old_array, then grow.`,
      { old_array },
    );
    this._array = this.#allocate(this._capacity * 2, old_array);
    this.#trace(
      "self._array = core.Array(self._capacity * 2, self._typecode)",
      `self._array now refers to the new array, with room for ${this._capacity * 2}.`,
      { old_array },
    );
    this._capacity *= 2;
    this.#trace("self._capacity *= 2", `_capacity doubles to ${this._capacity}.`, {
      old_array,
    });
    for (let i = 0; i < this._size; i++) {
      this._array.__setitem__(i, old_array.__getitem__(i));
      this.#trace(
        { snippet: "self._array[i] = old_array[i]", after: "def _double_size" },
        `Copy old_array[${i}] = ${this.#at(i)} into the new array.`,
        { old_array, i, slot: i },
      );
    }
    invariant(this._array._size === this._capacity);
  }

  _halve_size(): void {
    invariant(this._capacity > 1 && this._size <= this._capacity / 4);
    const old_array = this._array;
    this.#trace(
      { snippet: "old_array = self._array", after: "def _halve_size" },
      `Keep the mostly empty array as old_array, then shrink.`,
      { old_array },
    );
    this._array = this.#allocate(Math.floor(this._capacity / 2), old_array);
    this.#trace(
      "self._array = core.Array(self._capacity // 2, self._typecode)",
      `self._array now refers to the new array, with room for ${Math.floor(this._capacity / 2)}.`,
      { old_array },
    );
    this._capacity = Math.floor(this._capacity / 2);
    this.#trace("self._capacity //= 2", `_capacity halves to ${this._capacity}.`, {
      old_array,
    });
    for (let i = 0; i < this._size; i++) {
      this._array.__setitem__(i, old_array.__getitem__(i));
      this.#trace(
        { snippet: "self._array[i] = old_array[i]", after: "def _halve_size" },
        `Copy old_array[${i}] = ${this.#at(i)} into the new array.`,
        { old_array, i, slot: i },
      );
    }
    invariant(this._array._size === this._capacity);
  }

  insert(item: core.Item): void {
    const value = item.value;
    const full = this._is_full();
    this.#trace(
      "if self._is_full():",
      full
        ? `_size ${this._size} = _capacity ${this._capacity}: no room for ${value}, so double the capacity first.`
        : `_size ${this._size} < _capacity ${this._capacity}: there is room for ${value}.`,
      { value },
    );
    if (full) {
      this._double_size();
    }
    this._array.__setitem__(this._size, item);
    this.#trace(
      "self._array[self._size] = value",
      `${value} goes into the first free slot, ${this._size}.`,
      { value, slot: this._size },
    );
    this._size += 1;
    this.#trace(
      "self._size += 1",
      `_size is now ${this._size}, out of a capacity of ${this._capacity}.`,
      { value },
    );
  }

  find(target: number): number | null {
    for (let i = 0; i < this._size; i++) {
      const v = this.#at(i);
      this.#trace(
        "if self._array[i] == target:",
        v === target
          ? `a[${i}] is ${target}: found it.`
          : `a[${i}] is ${v}, not ${target}.`,
        { target, i, slot: i },
      );
      if (v === target) {
        this.#trace("return i", `find returns ${i}.`, {
          target,
          i,
          slot: i,
          returned: returned("find", i),
        });
        return i;
      }
    }
    this.#trace("return None", `${target} isn't in the array: find returns None.`, {
      target,
      returned: returned("find", null),
    });
    return null;
  }

  delete(target: number): void {
    const index = this.find(target);
    this.#trace(
      "index = self.find(target)",
      index === null
        ? `find didn't find ${target}.`
        : `find found ${target} at index ${index}.`,
      index === null ? { target, index } : { target, index, slot: index },
    );
    if (index === null) {
      const error = new PyError(
        "ValueError",
        `Unable to delete element ${target}: the entry is not in the array`,
      );
      this.#trace("raise ValueError(f'Unable to delete element {target}", error.message, {
        target,
        index,
        error: error.message,
      });
      throw error;
    }
    for (let i = index; i < this._size - 1; i++) {
      this._array.__setitem__(i, this._array.__getitem__(i + 1));
      this.#trace(
        "self._array[i] = self._array[i + 1]",
        `Shift ${this.#at(i)} one slot left, from ${i + 1} to ${i}.`,
        { target, index, i, slot: i },
      );
    }
    this._size -= 1;
    this.#trace("self._size -= 1", `_size drops to ${this._size}.`, { target, index });
    const shrink = this._capacity > 1 && this._size <= this._capacity / 4;
    this.#trace(
      "if self._capacity > 1 and self._size <= self._capacity/4:",
      this._capacity === 1
        ? "Capacity 1 can't shrink any further."
        : shrink
          ? `_size ${this._size} ≤ ${this._capacity}/4: the array is three quarters empty, so halve it.`
          : `_size ${this._size} > ${this._capacity}/4: not empty enough to shrink.`,
      { target, index },
    );
    if (shrink) {
      this._halve_size();
    }
  }
}

export const INITIAL_INPUT: Input = {
  initial_capacity: 1,
  ops: script(
    ["insert", 3],
    ["insert", 8],
    ["insert", 1],
    ["insert", 6],
    ["insert", 4],
    ["delete", 8],
    ["delete", 3],
    ["delete", 6],
    ["delete", 7],
    ["delete", 1],
    ["insert", 5],
  ),
};

export function run(input: Input): Frame<Vars>[] {
  const rec = recorder<Vars>();
  const step = rec.in(SRC);
  const stepCore = rec.in(ARRAY_CORE);
  const runner = scriptRunner(input.ops);
  const vars = (self: Fields, l: Locals): Vars => ({
    _array: self._array,
    _capacity: self._capacity,
    _size: self._size,
    value: l.value ?? null,
    target: l.target ?? null,
    i: l.i ?? null,
    index: l.index ?? null,
    old_array: l.old_array ?? null,
    allocating: l.allocating ?? null,
    slot: l.slot ?? null,
    returned: l.returned ?? null,
    error: l.error ?? null,
    op: runner.op,
  });

  const arr = new DynamicArray(input.initial_capacity, "l", {
    clock: { t: 0 },
    trace: (where, self, note, l = {}) => step(where, vars(self, l), note),
    core: (where, self, note, l = {}) => stepCore(where, vars(self, l), note),
  });
  runner.run((op) => {
    const arg = op.args[0] ?? 0;
    switch (op.name) {
      case "insert":
        return arr.insert(core.item(arg, op.id));
      case "delete":
        return arr.delete(arg);
      default:
        throw new Error(`Unknown op ${op.name}`);
    }
  });
  return rec.frames;
}
