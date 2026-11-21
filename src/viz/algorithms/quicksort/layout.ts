/**
 * Where each quicksort call sits in the recursion-tree drawing.
 *
 * Quicksort never moves an element out of the range of positions its call
 * covers: the outermost call covers positions 0..n, `quicksort(less)` the
 * first `len(less)` of its caller's range, the pivot the next one, and
 * `quicksort(greater)` the rest. So each call is drawn over exactly the
 * columns its elements end up in, one level per recursion depth, and a
 * returned call's sorted list lines up with its caller's.
 */
import type { Call } from "./trace";

export type Place = {
  readonly depth: number;
  /** The range of final positions `[lo, hi)` the call covers. */
  readonly lo: number;
  readonly hi: number;
  /** For an empty call, which side of its caller's pivot it hangs from. */
  readonly side: "root" | "less" | "greater";
};

/** Places for every call in `calls`, which must include each call's caller. */
export function placeCalls(calls: readonly Call[]): ReadonlyMap<string, Place> {
  const byUid = new Map(calls.map((c) => [c.uid, c]));
  const places = new Map<string, Place>();
  const ordered = [...calls].sort((a, b) => a.uid.length - b.uid.length);
  for (const call of ordered) {
    const parentUid = call.uid.slice(0, -1);
    const parent = byUid.get(parentUid);
    const at = places.get(parentUid);
    if (parent === undefined || at === undefined) {
      places.set(call.uid, { depth: 0, lo: 0, hi: call.array.length, side: "root" });
      continue;
    }
    const split = at.lo + (parent.less?.length ?? 0);
    const less = call.uid.endsWith("l");
    places.set(call.uid, {
      depth: at.depth + 1,
      lo: less ? at.lo : split + 1,
      hi: less ? split : at.hi,
      side: less ? "less" : "greater",
    });
  }
  return places;
}

/**
 * The horizontal centre of the call's box, in units of position slots: an
 * empty call sits in the near half of its caller's pivot slot, which no
 * other call at its depth covers.
 */
export function centerSlot(place: Place): number {
  if (place.hi > place.lo) return (place.lo + place.hi) / 2;
  if (place.side === "less") return place.lo + 0.25;
  if (place.side === "greater") return place.lo - 0.25;
  return place.lo;
}
