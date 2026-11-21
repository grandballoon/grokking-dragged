/**
 * Where each node of a linked list goes in the drawing, as a pure function
 * of a frame's snapshot.
 *
 * Mid-operation a list is not always one tidy chain: a node being deleted
 * is still held by a local after the list has stopped pointing at it, and a
 * doubly linked insert briefly has a new head that is not linked to the old
 * one yet. So the layout collects every node reachable from the list's
 * `_head` and `_tail` and from the running methods' locals, puts them in one
 * left-to-right order that follows the links, and marks as `dropped` the
 * nodes the list itself no longer reaches. Those are drawn lowered out of
 * the row, beneath the gap they left.
 */
import type { Call } from "./tracer";

/** A linked node as a frame holds it: the Python fields plus `uid`. */
export type NodeData = {
  /** Not in the Python: the node's identity across frames (the op that made it). */
  readonly uid: string;
  readonly _data: unknown;
  readonly _next: NodeData | null;
  /** Doubly linked nodes only. */
  readonly _prev?: NodeData | null;
};

export function isNode(value: unknown): value is NodeData {
  return (
    typeof value === "object" &&
    value !== null &&
    "uid" in value &&
    "_data" in value &&
    "_next" in value
  );
}

export type Slot = {
  readonly node: NodeData;
  readonly index: number;
  /** In no chain from `_head` (or, doubly linked, from `_tail`). */
  readonly dropped: boolean;
};

/** A named reference to a node: `_head`, `_tail`, or a local. */
export type Pointer = {
  readonly name: string;
  readonly uid: string;
  /** The call it belongs to (0 = outermost), or -1 for the list's own fields. */
  readonly depth: number;
};

function chain(start: NodeData | null, via: "_next" | "_prev"): NodeData[] {
  const result: NodeData[] = [];
  const seen = new Set<string>();
  for (let n = start; n && !seen.has(n.uid); n = n[via] ?? null) {
    seen.add(n.uid);
    result.push(n);
  }
  return result;
}

/** Every node a local of an active call refers to, outermost call first. */
export function localNodes(stack: readonly Call[]): NodeData[] {
  return stack.flatMap((call) => Object.values(call.locals).filter(isNode));
}

export function layoutList(
  head: NodeData | null,
  tail: NodeData | null,
  others: readonly NodeData[],
): Slot[] {
  const order: NodeData[] = [];
  const index = (n: NodeData | null | undefined) =>
    n ? order.findIndex((o) => o.uid === n.uid) : -1;
  const place = (n: NodeData) => {
    if (index(n) >= 0) return;
    const next = index(n._next);
    const prev = index(n._prev);
    if (next >= 0) order.splice(next, 0, n);
    else if (prev >= 0) order.splice(prev + 1, 0, n);
    else order.push(n);
  };
  // Place each chain from its far end back, so every node finds the
  // neighbour its link points at already placed.
  const placeChain = (start: NodeData | null, via: "_next" | "_prev") =>
    chain(start, via).reverse().forEach(place);

  const fromHead = chain(head, "_next");
  fromHead.forEach((n) => order.push(n));
  placeChain(tail, "_prev");
  for (const n of others) {
    placeChain(n, "_next");
    placeChain(n, "_prev");
  }

  const linked = new Set([...fromHead, ...chain(tail, "_prev")].map((n) => n.uid));
  return order.map((node, i) => ({ node, index: i, dropped: !linked.has(node.uid) }));
}

/** The pointers to draw: the list's own fields, then each call's node locals. */
export function pointers(
  fields: Readonly<Record<string, NodeData | null>>,
  stack: readonly Call[],
): Pointer[] {
  const own = Object.entries(fields).flatMap(([name, n]) =>
    n ? [{ name, uid: n.uid, depth: -1 }] : [],
  );
  const locals = stack.flatMap((call, depth) =>
    Object.entries(call.locals).flatMap(([name, v]) =>
      isNode(v) ? [{ name, uid: v.uid, depth }] : [],
    ),
  );
  return [...own, ...locals];
}
