import { describe, expect, it } from "vitest";
import {
  opRowY,
  opScriptHeight,
  opText,
  reorder,
  reorderTargets,
  script,
  withArg,
  withLabels,
  type Op,
} from "./opScript";

describe("opScript", () => {
  const ops = script(["insert", 8], ["insert_edge", 1, 2], ["pop"]);

  it("numbers op ids and keeps every argument", () => {
    expect(ops).toEqual([
      { id: "op0", name: "insert", args: [8] },
      { id: "op1", name: "insert_edge", args: [1, 2] },
      { id: "op2", name: "pop", args: [] },
    ]);
  });

  it("formats calls like Python", () => {
    expect(ops.map(opText)).toEqual(["insert(8)", "insert_edge(1, 2)", "pop()"]);
  });

  it("fills a label's placeholders with the arguments", () => {
    const set: Op = {
      id: "a",
      name: "__setitem__",
      args: [3, -7],
      label: "a[{0}] = {1}",
    };
    expect(opText(set)).toBe("a[3] = -7");
    expect(opText({ id: "b", name: "__iter__", args: [], label: "list(bag)" })).toBe(
      "list(bag)",
    );
  });

  it("labels ops by method name", () => {
    const labelled = withLabels(script(["search", 8], ["insert", 1]), {
      search: "search(lambda x: x == {0})",
    });
    expect(labelled.map(opText)).toEqual(["search(lambda x: x == 8)", "insert(1)"]);
    expect(labelled[1]).not.toHaveProperty("label");
  });

  it("reorders and edits one argument without mutating", () => {
    expect(reorder(ops, 2, 0).map((o) => o.id)).toEqual(["op2", "op0", "op1"]);
    expect(withArg(ops, 1, 1, 5)[1]).toEqual({
      id: "op1",
      name: "insert_edge",
      args: [1, 5],
    });
    expect(withArg(ops, 0, 0, 4)[0]!.args).toEqual([4]);
    expect(ops[1]!.args).toEqual([1, 2]);
  });

  it("keeps locked ops in place when reordering", () => {
    const fixed = script(
      ["insert_vertex", 1],
      ["insert_edge", 1, 2],
      ["insert_edge", 2, 3],
    );
    const locked = (op: Op) => op.name === "insert_vertex";
    expect(reorderTargets(fixed, 1, locked)).toEqual([1, 2]);
    expect(reorderTargets(fixed, 2, locked)).toEqual([1, 2]);
    expect(reorderTargets(fixed, 2)).toEqual([0, 1, 2]);
  });

  it("lays rows out at a fixed pitch", () => {
    expect([0, 1, 2].map(opRowY)).toEqual([26, 56, 86]);
    expect(opScriptHeight(3)).toBe(98);
  });
});
