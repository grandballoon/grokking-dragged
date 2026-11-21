import { describe, expect, it } from "vitest";
import { lineText } from "../../../../core/pythonSource";
import { script } from "../../opScript";
import { slotsOf } from "../shared/linkedRow";
import { values } from "../../kit/testing";
import { echoesByOp } from "../shared/testing";
import { INITIAL_INPUT, run, SRC } from "./trace";

const line = (f: { line: number }) => lineText(SRC, f.line).trim();

describe("singly linked list port", () => {
  const frames = run(INITIAL_INPUT);
  const last = frames.at(-1)!;

  it("returns and raises what the Python does", () => {
    // python3 -I, from grokking_data_structures-main/python, running the
    // same calls on a SinglyLinkedList (search with lambda x: x == 8).
    expect(echoesByOp(INITIAL_INPUT.ops, frames)).toEqual([
      "-",
      "-",
      "-",
      "-",
      "5",
      "8",
      "-",
      "1",
      "2",
      "ValueError: No element with value 4 was found in the list.",
    ]);
    expect(values(last.vars.obj._head)).toEqual([3, 8]);
  });

  it("starts with the constructor and ends at the raise", () => {
    expect(line(frames[0]!)).toBe("self._head = None");
    expect(frames[0]!.vars.op).toBeNull();
    expect(line(last)).toBe(
      "raise ValueError(f'No element with value {target} was found in the list.')",
    );
    expect(last.note).toBe("ValueError: No element with value 4 was found in the list.");
  });

  it("walks insert_to_back to the last node before appending", () => {
    const op = INITIAL_INPUT.ops.findIndex((o) => o.id === "op2");
    const walk = frames.filter((f) => f.vars.op === op);
    expect(walk.map(line)).toEqual([
      "current = self._head",
      "current = current.next()",
      "while current.next() is not None:",
      "current.append(SinglyLinkedList.Node(data))",
    ]);
    const current = walk[2]!.vars.stack[0]!.locals.current as { _data: number };
    expect(current._data).toBe(5);
  });

  it("keeps a deleted node held by current, out of the list", () => {
    const op = INITIAL_INPUT.ops.findIndex((o) => o.id === "op6");
    const unlinked = frames.find(
      (f) => f.vars.op === op && line(f) === "previous.append(current.next())",
    )!;
    expect(values(unlinked.vars.obj._head)).toEqual([1, 3, 8]);
    const slots = slotsOf(unlinked.vars.obj._head, null, unlinked.vars.stack);
    expect(slots.map((s) => [s.node._data, s.dropped])).toEqual([
      [1, false],
      [3, false],
      [5, true],
      [8, false],
    ]);
  });

  it("gives each node the id of the op that made it", () => {
    const end = frames.findLast((f) => f.vars.op === 3)!;
    expect(slotsOf(end.vars.obj._head, null, []).map((s) => s.node.uid)).toEqual([
      "op3",
      "op1",
      "op0",
      "op2",
    ]);
  });

  it("raises IndexError for a negative or too-large index", () => {
    const negative = run({ ops: script(["get", -1]) }).at(-1)!;
    expect(negative.note).toBe("IndexError: Index must be non-negative");
    const tooFar = run({ ops: script(["insert_in_front", 1], ["get", 3]) }).at(-1)!;
    expect(tooFar.note).toBe("IndexError: Index out of bounds");
  });

  it("carries on after an exception", () => {
    const ops = script(["delete_from_front"], ["insert_in_front", 2], ["search", 9]);
    const f = run({ ops });
    expect(echoesByOp(ops, f)).toEqual([
      "ValueError: Delete on an empty list.",
      "-",
      "None",
    ]);
    expect(values(f.at(-1)!.vars.obj._head)).toEqual([2]);
  });
});
