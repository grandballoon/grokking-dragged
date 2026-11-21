/**
 * Pure edits on an input list of numbers, the `arr` most of these programs
 * take. Each element carries a stable id in a parallel `ids` list, so an
 * element keeps its identity (and its place on screen) while it is dragged,
 * reordered or nudged. The ids are drawing bookkeeping only; the ports see
 * just the numbers.
 */

/** A Python list argument `arr`, plus the parallel ids. */
export type ArrInput = {
  readonly arr: readonly number[];
  readonly ids: readonly string[];
};

/** An input for `arr`, numbering the ids. */
export function arrInput(arr: readonly number[]): ArrInput {
  return { arr, ids: arr.map((_, i) => `v${i}`) };
}

function moved<T>(items: readonly T[], from: number, to: number): T[] {
  const result = items.filter((_, i) => i !== from);
  result.splice(to, 0, items[from]!);
  return result;
}

/** Every order reachable by moving element `from`, in target-index order. */
export function reorders(list: ArrInput, from: number): ArrInput[] {
  return list.arr.map((_, to) => ({
    arr: moved(list.arr, from, to),
    ids: moved(list.ids, from, to),
  }));
}

/** The list with element `index` set to `value`. */
export function withValue(list: ArrInput, index: number, value: number): ArrInput {
  return { ...list, arr: list.arr.map((v, i) => (i === index ? value : v)) };
}

/**
 * The values element `index` may take within `[lo, hi]`. With `sorted`, it
 * may not pass its neighbours, so a sorted list stays sorted.
 */
export function valueChoices(
  list: ArrInput,
  index: number,
  [lo, hi]: readonly [number, number],
  sorted = false,
): number[] {
  const min = sorted ? Math.max(lo, list.arr[index - 1] ?? lo) : lo;
  const max = sorted ? Math.min(hi, list.arr[index + 1] ?? hi) : hi;
  const result: number[] = [];
  for (let v = min; v <= max; v++) result.push(v);
  return result;
}

function freshId(ids: readonly string[]): string {
  let k = 0;
  while (ids.includes(`n${k}`)) k++;
  return `n${k}`;
}

/**
 * The list cut down or grown to `length`. New elements get their value from
 * `fill`, which sees the list so far, and a fresh id.
 */
export function resized(
  list: ArrInput,
  length: number,
  fill: (values: readonly number[]) => number,
): ArrInput {
  if (length <= list.arr.length) {
    return { arr: list.arr.slice(0, length), ids: list.ids.slice(0, length) };
  }
  const values = [...list.arr];
  const ids = [...list.ids];
  while (values.length < length) {
    values.push(fill(values));
    ids.push(freshId(ids));
  }
  return { arr: values, ids };
}
