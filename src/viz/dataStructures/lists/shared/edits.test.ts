import { describe, expect, it } from "vitest";
import { script } from "../../opScript";
import { run } from "../singlyLinkedList/trace";
import { addOpState, canAddOp, insertAfter, MAX_OPS, nextOpId, nextValue } from "./edits";

describe("script edits", () => {
  const ops = script(["insert_in_front", 4], ["insert_to_back", 7], ["size"]);

  it("finds a fresh op id and a value one past every argument", () => {
    expect(nextOpId(ops)).toBe("op3");
    expect(nextOpId([...ops, { id: "op3", name: "size", args: [] }])).toBe("op4");
    expect(nextValue(ops)).toBe(8);
    expect(nextValue([])).toBe(1);
  });

  it("inserts after the op on screen, or first before any op", () => {
    const op = { id: "x", name: "size", args: [] };
    expect(insertAfter(ops, 0, op).ops.map((o) => o.id)).toEqual([
      "op0",
      "x",
      "op1",
      "op2",
    ]);
    expect(insertAfter(ops, null, op).at).toBe(0);
  });

  it("caps the script length", () => {
    expect(canAddOp(ops)).toBe(true);
    expect(
      canAddOp(script(...Array.from({ length: MAX_OPS }, () => ["size"] as const))),
    ).toBe(false);
  });

  it("jumps to the last frame of the added op", () => {
    const state = addOpState({ ops }, 1, ["insert_in_front", 8], run);
    const frames = run(state.input);
    expect(state.input.ops[2]).toEqual({ id: "op3", name: "insert_in_front", args: [8] });
    expect(frames[state.step]!.vars.op).toBe(2);
    expect(frames[state.step + 1]!.vars.op).toBe(3);
  });
});
