/**
 * Pure geometry for drawing a binary search tree.
 *
 * Nodes are placed by in-order rank (x) and depth (y), so no two nodes ever
 * share a column and every edge runs above the nodes it passes over: the
 * picture cannot overlap, whatever the shape of the tree.
 */
import type { Node } from "./trace";

/** A node as it appears in a frame: plain data, its methods gone. */
export type TreeNode = Pick<Node, "uid" | "_value"> & {
  _left: TreeNode | null;
  _right: TreeNode | null;
};

export type Placed = {
  readonly node: TreeNode;
  /** Position in in-order sequence, from 0. */
  readonly rank: number;
  readonly depth: number;
  readonly parent: TreeNode | null;
};

/** Every node reachable from `root`, in order. */
export function placeTree(root: TreeNode | null): Placed[] {
  const out: Placed[] = [];
  const walk = (node: TreeNode | null, depth: number, parent: TreeNode | null) => {
    if (node === null) return;
    walk(node._left, depth + 1, node);
    out.push({ node, rank: out.length, depth, parent });
    walk(node._right, depth + 1, node);
  };
  walk(root, 0, null);
  return out;
}

/** Edges counted from the root, or -1 for an empty tree. */
export function height(root: TreeNode | null): number {
  if (root === null) return -1;
  return 1 + Math.max(height(root._left), height(root._right));
}

/** An empty child position where a new value could be inserted. */
export type Slot = {
  readonly parent: TreeNode | null;
  readonly side: "left" | "right";
  /** A value `insert` would put exactly here. */
  readonly value: number;
};

/**
 * Every empty child position of the tree, with a value from `(lo, hi]` that
 * `insert` sends there. `insert` goes left on `value <= node.value()`, so a
 * left child of `n` takes values in `(lo, n]` and a right child `(n, hi]`.
 * Positions whose range holds no integer are left out.
 */
export function emptySlots(root: TreeNode | null, lo: number, hi: number): Slot[] {
  const out: Slot[] = [];
  const pick = (a: number, b: number) => a + Math.ceil((b - a) / 2);
  const visit = (
    node: TreeNode | null,
    parent: TreeNode | null,
    side: Slot["side"],
    a: number,
    b: number,
  ) => {
    if (node === null) {
      if (b > a) out.push({ parent, side, value: pick(a, b) });
      return;
    }
    visit(node._left, node, "left", a, Math.min(b, node._value));
    visit(node._right, node, "right", Math.max(a, node._value), b);
  };
  visit(root, null, "left", lo, hi);
  return out;
}
