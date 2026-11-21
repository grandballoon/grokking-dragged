import { describe, expect, it } from "vitest";
import { lineText } from "../../../../core/pythonSource";
import { script } from "../../opScript";
import { slotsOf } from "../shared/linkedRow";
import { values } from "../../kit/testing";
import { echoesByOp } from "../shared/testing";
import { INITIAL_INPUT, run, SRC, type DoublyVars } from "./trace";

const line = (f: { line: number }) => lineText(SRC, f.line).trim();
const ofOp = <F extends { vars: DoublyVars }>(frames: readonly F[], op: number) =>
  frames.filter((f) => f.vars.op === op);

/** Data from `_tail` back along `_prev`. */
function backwards(vars: DoublyVars): unknown[] {
  const result: unknown[] = [];
  for (let n = vars.obj._tail; n !== null; n = n._prev ?? null) result.push(n._data);
  return result;
}

describe("doubly linked list port", () => {
  const frames = run(INITIAL_INPUT);

  it("returns what the Python does", () => {
    expect(echoesByOp(INITIAL_INPUT.ops, frames)).toEqual([
      "-",
      "-",
      "-",
      "-",
      "-",
      "-",
      "-",
      "-",
      "5",
      "-",
    ]);
    const end = frames.at(-1)!.vars.obj;
    expect(end._head).toBeNull();
    expect(end._tail).toBeNull();
  });

  it("keeps both directions consistent after every op", () => {
    for (let op = 0; op < INITIAL_INPUT.ops.length; op++) {
      const end = ofOp(frames, op).at(-1)!.vars;
      expect(backwards(end)).toEqual(values(end.obj._head).reverse());
    }
    const four = ofOp(frames, 3).at(-1)!.vars;
    expect(values(four.obj._head)).toEqual([2, 4, 6, 8]);
  });

  it("steps into Node.append to link a new head both ways", () => {
    const insert = ofOp(frames, 2);
    expect(insert.map(line)).toEqual([
      "old_head = self._head",
      "self._head = DoublyLinkedList.Node(data)",
      "self._next = next_node",
      "next_node._prev = self",
      "self._head.append(old_head)",
    ]);
    const inAppend = insert[2]!.vars.stack;
    expect(inAppend.map((c) => c.fn)).toEqual(["insert_in_front", "Node.append"]);
    // Before append, the new head stands alone at the front of the row.
    const alone = insert[1]!.vars;
    expect(
      slotsOf(alone.obj._head, alone.obj._tail, alone.stack).map((s) => s.node._data),
    ).toEqual([2, 4, 6]);
  });

  it("deletes from the middle, the front and the back", () => {
    expect(ofOp(frames, 4).map(line)).toEqual([
      "current = self._head",
      "if current.data() == target:",
      "current = current.next()",
      "if current.data() == target:",
      "current = current.next()",
      "if current.data() == target:",
      "return current",
      "node = self._search(target)",
      "if node.prev() is None:",
      "elif node.next() is None:",
      "self._next = next_node",
      "next_node._prev = self",
      "node.prev().append(node.next())",
      "del node",
    ]);
    const unlinked = ofOp(frames, 4).at(-2)!.vars;
    const slots = slotsOf(unlinked.obj._head, unlinked.obj._tail, unlinked.stack);
    expect(slots.map((s) => [s.node._data, s.dropped])).toEqual([
      [2, false],
      [4, false],
      [6, true],
      [8, false],
    ]);
    expect(ofOp(frames, 5).slice(-2).map(line)).toEqual([
      "self._prev = prev_node",
      "self._head.prepend(None)",
    ]);
    expect(
      ofOp(frames, 5)
        .at(-2)!
        .vars.stack.map((c) => c.fn),
    ).toEqual(["delete", "Node.prepend"]);
    expect(line(ofOp(frames, 6).at(-1)!)).toBe("self._tail.append(None)");
  });

  it("empties the list from either end", () => {
    expect(line(ofOp(frames, 9).at(-1)!)).toBe("self._tail = None");
    const f = run({ ops: script(["insert_to_back", 1], ["delete_from_back"]) });
    expect(line(f.at(-2)!)).toBe("self._head = None");
    expect(f.at(-1)!.vars.echoes.map((e) => e.text)).toEqual(["1"]);
  });
});
