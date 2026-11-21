/**
 * Pure edits on a dict of lists (`{ key: [items] }`), the shape behind many
 * of the book's inputs: a graph's adjacency lists, a radio station's states,
 * the items in each box. Dragging an item to a new place in such a dict is
 * one `moveItem` call per candidate drop slot.
 */

export type KeyedLists<T> = Readonly<Record<string, readonly T[]>>;

/** A position in a keyed list. On a move, `index` is counted after removal. */
export type Slot = { readonly key: string; readonly index: number };

export function moveItem<T>(lists: KeyedLists<T>, from: Slot, to: Slot): KeyedLists<T> {
  const source = lists[from.key];
  if (source === undefined || from.index < 0 || from.index >= source.length) {
    throw new Error(`No item at ${from.key}[${from.index}]`);
  }
  const item = source[from.index]!;
  const result: Record<string, readonly T[]> = { ...lists };
  result[from.key] = source.filter((_, i) => i !== from.index);
  const target = result[to.key];
  if (target === undefined) throw new Error(`No list ${to.key}`);
  if (to.index < 0 || to.index > target.length) {
    throw new Error(`Index ${to.index} out of range for ${to.key}`);
  }
  result[to.key] = [...target.slice(0, to.index), item, ...target.slice(to.index)];
  return result;
}

/**
 * Every slot the item at `from` could move to: every position in its own
 * list, and every position in each other list that `accepts` it.
 */
export function moveTargets<T>(
  lists: KeyedLists<T>,
  from: Slot,
  accepts: (key: string, list: readonly T[], item: T) => boolean,
): Slot[] {
  const item = lists[from.key]?.[from.index];
  if (item === undefined) return [];
  const slots: Slot[] = [];
  for (const [key, list] of Object.entries(lists)) {
    const own = key === from.key;
    if (!own && !accepts(key, list, item)) continue;
    const length = own ? list.length - 1 : list.length;
    for (let index = 0; index <= length; index++) slots.push({ key, index });
  }
  return slots;
}
