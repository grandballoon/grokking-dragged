import { describe, expect, it } from "vitest";
import { outcomeText } from "../parts";
import { lineText } from "../../../../core/pythonSource";
import type { Frame } from "../../../../core/trace";
import { INITIAL_INPUT, LIST_SRC, run, SRC, type NodeFields, type Vars } from "./trace";

/** The list as Python's `str(self._data)` prints it, walking `_next` from `_head`. */
function str(head: NodeFields | null): string {
  const values: number[] = [];
  for (let n = head; n !== null; n = n._next) values.push(n._data);
  return values.join("<->");
}

/** The same list walked backwards via `_prev` from `_tail`. */
function backwards(tail: NodeFields | null): string {
  const values: number[] = [];
  for (let n = tail; n !== null; n = n._prev) values.unshift(n._data);
  return values.join("<->");
}

function afterEachOp(frames: readonly Frame<Vars>[]): Frame<Vars>[] {
  return frames.filter(
    (f, i) => f.vars.op !== null && frames[i + 1]?.vars.op !== f.vars.op,
  );
}

describe("linked-list queue port", () => {
  const frames = run(INITIAL_INPUT);
  const ends = afterEachOp(frames);

  it("holds what the Python prints after every op, linked both ways", () => {
    // From running the same script against queues/queue_linked_list.py.
    const expected = [
      "3",
      "3<->1",
      "3<->1<->4",
      "1<->4",
      "1<->4<->1",
      "1<->4<->1<->5",
      "4<->1<->5",
      "1<->5",
      "5",
      "",
      "",
    ];
    expect(ends.map((f) => str(f.vars._head))).toEqual(expected);
    expect(ends.map((f) => backwards(f.vars._tail))).toEqual(expected);
  });

  it("returns and raises what the Python does", () => {
    expect(
      frames.at(-1)!.vars.outcomes.map((o) => (o === null ? null : outcomeText(o))),
    ).toEqual([
      null,
      null,
      null,
      "→ 3",
      null,
      null,
      "→ 1",
      "→ 4",
      "→ 1",
      "→ 5",
      "ValueError",
    ]);
  });

  it("steps from the queue into the list and into Node.prepend", () => {
    const enqueue4 = frames.filter((f) => f.vars.op === 2);
    expect(
      enqueue4.map((f) => [
        f.file === SRC.file ? "queue" : "list",
        lineText(f.file === SRC.file ? SRC : LIST_SRC, f.line).trim(),
      ]),
    ).toEqual([
      ["list", "old_tail = self._tail"],
      ["list", "self._tail = DoublyLinkedList.Node(data)"],
      ["list", "self._prev = prev_node"],
      ["list", "prev_node._next = self"],
      ["list", "self._tail.prepend(old_tail)"],
      ["queue", "self._data.insert_to_back(value)"],
    ]);
    const inPrepend = enqueue4[2]!.vars.stack.map((c) => c.fn);
    expect(inPrepend).toEqual(["enqueue", "insert_to_back", "Node.prepend"]);
  });

  it("keeps a node's uid as it moves from tail to head", () => {
    const four = ends[2]!.vars._tail!;
    expect(ends[6]!.vars._head!.uid).toBe(four.uid);
    expect(ends[6]!.vars._head!._data).toBe(4);
  });

  it("raises on dequeue from an empty queue, at the queue's raise line", () => {
    const last = frames.at(-1)!;
    expect(last.file).toBe(SRC.file);
    expect(lineText(SRC, last.line).trim()).toBe(
      'raise ValueError("Cannot dequeue from an empty queue")',
    );
    expect(last.vars.stack.map((c) => c.fn)).toEqual(["dequeue"]);
  });
});
