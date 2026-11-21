import { describe, expect, it } from "vitest";
import { lineText } from "../../../../core/pythonSource";
import { script } from "../../opScript";
import { INITIAL_INPUT } from "./input";
import { run, SRC, STACK_SRC, type Node, type Vars } from "./trace";

/** Python's `str(tree)`: `50 (30 ()())(70 ()())`. */
function str(node: Node | null): string {
  if (node === null) return "";
  return `${node._value} (${str(node._left)})(${str(node._right)})`;
}

function lastOfEachOp(frames: ReturnType<typeof run>) {
  const ends = new Map<number, (typeof frames)[number]>();
  for (const f of frames) if (f.vars.op !== null) ends.set(f.vars.op, f);
  return [...ends.values()];
}

describe("binary search tree port", () => {
  const frames = run(INITIAL_INPUT);
  const ends = lastOfEachOp(frames);
  const tree = (v: Vars) => str(v._root);

  it("builds the tree the Python prints after every op", () => {
    expect(ends.map((f) => tree(f.vars))).toEqual([
      "50 ()()",
      "50 (30 ()())()",
      "50 (30 ()())(70 ()())",
      "50 (30 (20 ()())())(70 ()())",
      "50 (30 (20 ()())(40 ()()))(70 ()())",
      "50 (30 (20 ()())(40 (35 ()())()))(70 ()())",
      "50 (30 (20 ()())(40 (35 ()())()))(70 (60 ()())())",
      "50 (30 (20 ()())(40 (35 ()())()))(70 (60 ()())())",
      "50 (20 ()(40 (35 ()())()))(70 (60 ()())())",
      "40 (20 ()(35 ()()))(70 (60 ()())())",
      "40 (20 ()(35 ()()))(70 ()())",
      "40 (20 ()(35 ()()))(70 ()())",
      "40 (20 ()(35 ()()))(70 ()())",
      "40 (20 ()(35 ()()))(70 ()())",
    ]);
  });

  it("returns and raises what the Python does", () => {
    expect(ends.map((f) => f.vars.result ?? f.vars.error)).toEqual([
      ...Array<null>(7).fill(null),
      "True",
      null,
      null,
      null,
      "ValueError: Value not found",
      "4",
      "[20, 35, 40, 70]",
    ]);
  });

  it("replaces a node with two children by the max of its left subtree", () => {
    const op9 = frames.filter((f) => f.vars.op === 9);
    const found = op9.find(
      (f) => lineText(SRC, f.line).includes("return node, parent") && f.vars.max_node,
    );
    expect(found!.vars.max_node!._value).toBe(40);
    expect(found!.vars.max_node_parent!._value).toBe(20);
    expect(
      op9.some((f) => lineText(SRC, f.line).includes("max_node_parent.set_right")),
    ).toBe(true);
  });

  it("counts through the stack in stack.py", () => {
    const len = frames.filter((f) => f.vars.op === 12);
    expect(len.some((f) => f.file === STACK_SRC.file)).toBe(true);
    const counted = len.filter((f) => lineText(SRC, f.line).trim() === "size += 1");
    expect(counted.map((f) => f.vars.node!._value)).toEqual([40, 20, 35, 70]);
  });

  it("yields in order", () => {
    const yields = frames.filter(
      (f) => f.vars.op === 13 && lineText(SRC, f.line).includes("yield"),
    );
    expect(yields.map((f) => f.vars.yielded.at(-1))).toEqual([20, 35, 40, 70]);
  });

  it("raises on an empty tree", () => {
    const empty = run({ ops: script(["delete", 5], ["__len__"], ["__iter__"]) });
    expect(empty.map((f) => f.vars.error).filter(Boolean)).toEqual([
      "ValueError: Delete on an empty tree",
    ]);
    expect(empty.at(-1)!.vars.result).toBe("[]");
  });
});
