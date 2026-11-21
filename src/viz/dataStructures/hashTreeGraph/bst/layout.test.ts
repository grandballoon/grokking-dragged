import { describe, expect, it } from "vitest";
import { script } from "../../opScript";
import { INITIAL_INPUT } from "./input";
import { emptySlots, height, placeTree, type TreeNode } from "./layout";
import { run } from "./trace";

const finalTree = (ops: Parameters<typeof run>[0]["ops"]) =>
  run({ ops }).at(-1)!.vars._root;

/** The parent (by uid) and side of the node with this uid, or null if absent. */
function whereIs(
  root: TreeNode | null,
  uid: string,
): { parent: string | null; side: string } | null {
  for (const p of placeTree(root)) {
    if (p.node.uid !== uid) continue;
    if (p.parent === null) return { parent: null, side: "left" };
    return { parent: p.parent.uid, side: p.parent._left?.uid === uid ? "left" : "right" };
  }
  return null;
}

describe("BST layout", () => {
  it("gives every node its own column, in sorted order", () => {
    const placed = placeTree(finalTree(INITIAL_INPUT.ops));
    expect(placed.map((p) => p.node._value)).toEqual([20, 35, 40, 70]);
    expect(placed.map((p) => p.rank)).toEqual([0, 1, 2, 3]);
    expect(placed.map((p) => p.depth)).toEqual([1, 2, 0, 1]);
  });

  it("measures height in edges", () => {
    expect(height(null)).toBe(-1);
    expect(height(finalTree(INITIAL_INPUT.ops))).toBe(2);
  });

  it("offers a value for every empty child that insert sends exactly there", () => {
    for (const ops of [
      INITIAL_INPUT.ops,
      script(),
      script(["insert", 1]),
      script(["insert", 99], ["insert", 98]),
    ]) {
      const root = finalTree(ops);
      const slots = emptySlots(root, 0, 99);
      for (const slot of slots) {
        const after = finalTree([
          ...ops,
          { id: "new", name: "insert", args: [slot.value] },
        ]);
        // The inserted node takes the uid of the op that makes it.
        expect(whereIs(after, "new")).toEqual({
          parent: slot.parent?.uid ?? null,
          side: slot.side,
        });
      }
    }
  });

  it("leaves out positions with no integer left to insert", () => {
    // 99 then 98: right of 99 needs a value above 99; right of 98 a value in (98, 99].
    const slots = emptySlots(finalTree(script(["insert", 99], ["insert", 98])), 0, 99);
    expect(slots.map((s) => [s.parent?._value, s.side, s.value])).toEqual([
      [98, "left", 49],
      [98, "right", 99],
    ]);
  });
});
