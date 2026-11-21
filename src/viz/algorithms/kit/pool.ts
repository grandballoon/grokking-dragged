/**
 * The input editing shared by the chapter 4 and 5 pages: the items the
 * program uses live in one list of a `KeyedLists`, and spare items wait in
 * another. Dragging an item reorders it, adds it from the spares or retires
 * it to them; every candidate drop is one `moveItem`. Items carry a stable
 * `id` so a dragged item keeps its identity wherever it lands.
 */
import {
  moveItem,
  moveTargets,
  type KeyedLists,
  type Slot,
} from "../../../core/keyedLists";

/** The pool's two lists. */
export const USED = "used";
export const SPARE = "spare";

export type Pool<T> = KeyedLists<T>;

/** A pool of `used` items followed by `spare` ones, with ids `prefix0`, `prefix1`, ... */
export function pool<V, T>(
  used: readonly V[],
  spare: readonly V[],
  make: (value: V, id: string) => T,
  prefix = "i",
): Pool<T> {
  const all = [...used, ...spare].map((v, i) => make(v, `${prefix}${i}`));
  return { [USED]: all.slice(0, used.length), [SPARE]: all.slice(used.length) };
}

export function usedItems<T>(items: Pool<T>): readonly T[] {
  return items[USED] ?? [];
}

export function spareItems<T>(items: Pool<T>): readonly T[] {
  return items[SPARE] ?? [];
}

/**
 * Every pool the item at `from` could be dropped into: any position in its
 * own list, or in the other list while that has room.
 */
export function poolMoves<T>(
  items: Pool<T>,
  from: Slot,
  capacity: Readonly<Record<string, number>>,
): Pool<T>[] {
  return moveTargets(
    items,
    from,
    (key, list) => list.length < (capacity[key] ?? Infinity),
  ).map((to) => moveItem(items, from, to));
}

/** The pool with every item passed through `update`. */
export function mapItems<T>(items: Pool<T>, update: (item: T) => T): Pool<T> {
  return Object.fromEntries(
    Object.entries(items).map(([key, list]) => [key, list.map(update)]),
  );
}
