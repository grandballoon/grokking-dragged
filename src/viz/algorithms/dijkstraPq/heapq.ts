/**
 * Python's `heapq.heappush` and `heapq.heappop`, ported line for line from
 * CPython's Lib/heapq.py (`_siftdown` and `_siftup`, which the C
 * accelerator mirrors), so the list's order matches Python's after every
 * call. Items compare the way Python compares tuples of numbers and strings.
 */

export type HeapItem = readonly (number | string)[];

/** Python's `<` on tuples: element by element, then the shorter one first. */
export function tupleLess(a: HeapItem, b: HeapItem): boolean {
  const n = Math.min(a.length, b.length);
  for (let k = 0; k < n; k++) {
    const x = a[k]!;
    const y = b[k]!;
    if (x === y) continue;
    if (typeof x !== typeof y) {
      throw new TypeError(
        `'<' not supported between instances of '${typeof x}' and '${typeof y}'`,
      );
    }
    return x < y;
  }
  return a.length < b.length;
}

export function heappush<T extends HeapItem>(heap: T[], item: T): void {
  heap.push(item);
  siftdown(heap, 0, heap.length - 1);
}

export function heappop<T extends HeapItem>(heap: T[]): T {
  if (heap.length === 0) throw new Error("IndexError: index out of range");
  const lastelt = heap.pop()!;
  if (heap.length > 0) {
    const returnitem = heap[0]!;
    heap[0] = lastelt;
    siftup(heap, 0);
    return returnitem;
  }
  return lastelt;
}

function siftdown<T extends HeapItem>(heap: T[], startpos: number, pos: number): void {
  const newitem = heap[pos]!;
  while (pos > startpos) {
    const parentpos = (pos - 1) >> 1;
    const parent = heap[parentpos]!;
    if (tupleLess(newitem, parent)) {
      heap[pos] = parent;
      pos = parentpos;
      continue;
    }
    break;
  }
  heap[pos] = newitem;
}

function siftup<T extends HeapItem>(heap: T[], pos: number): void {
  const endpos = heap.length;
  const startpos = pos;
  const newitem = heap[pos]!;
  let childpos = 2 * pos + 1;
  while (childpos < endpos) {
    const rightpos = childpos + 1;
    if (rightpos < endpos && !tupleLess(heap[childpos]!, heap[rightpos]!)) {
      childpos = rightpos;
    }
    heap[pos] = heap[childpos]!;
    pos = childpos;
    childpos = 2 * pos + 1;
  }
  heap[pos] = newitem;
  siftdown(heap, startpos, pos);
}
