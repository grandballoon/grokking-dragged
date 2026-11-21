import { describe, expect, it } from "vitest";
import { lineText } from "../../../../core/pythonSource";
import { script } from "../../opScript";
import { SINGLY_LINKED_LIST } from "../../sources";
import { values } from "../../kit/testing";
import { echoesByOp } from "../shared/testing";
import { INITIAL_INPUT, run, SRC, valueForGap } from "./trace";

describe("sorted singly linked list port", () => {
  const frames = run(INITIAL_INPUT);
  const last = frames.at(-1)!;

  it("returns and raises what the Python does", () => {
    expect(echoesByOp(INITIAL_INPUT.ops, frames)).toEqual([
      "-",
      "-",
      "-",
      "-",
      "-",
      "NotImplementedError: This method is not available for sorted lists",
      "-",
      "5",
      "4",
    ]);
    expect(values(last.vars.obj._head)).toEqual([2, 5, 5, 7]);
  });

  it("records insert in its own file and inherited methods in the base file", () => {
    const files = (op: number) =>
      new Set(frames.filter((f) => f.vars.op === op).map((f) => f.file));
    expect(files(0)).toEqual(new Set([SRC.file]));
    expect(files(5)).toEqual(new Set([SRC.file]));
    expect(files(6)).toEqual(new Set([SINGLY_LINKED_LIST.file]));
  });

  it("puts an equal value before the existing one", () => {
    const second5 = frames.filter((f) => f.vars.op === 4);
    expect(second5.map((f) => lineText(SRC, f.line).trim())).toEqual([
      "current = self._head",
      "previous = None",
      "if current.data() >= new_data:",
      "previous = current",
      "current = current.next()",
      "if current.data() >= new_data:",
      "previous.append(SinglyLinkedList.Node(new_data, current))    # General case",
      "return",
    ]);
  });

  it("appends the largest value at the end", () => {
    const f = run({ ops: script(["insert", 1], ["insert", 3]) }).at(-1)!;
    expect(lineText(SRC, f.line).trim()).toBe(
      "previous.append(SinglyLinkedList.Node(new_data, None))    # Add the element at the end of the list",
    );
  });

  it("picks a value for every gap that insert puts there", () => {
    const data = [2, 3, 5, 5, 9];
    expect([0, 1, 2, 3, 4, 5].map((g) => valueForGap(data, g))).toEqual([
      1,
      3,
      4,
      null,
      7,
      10,
    ]);
    expect(valueForGap([], 0)).toBe(0);
    for (const gap of [0, 1, 2, 4, 5]) {
      const v = valueForGap(data, gap)!;
      const ops = script(...[...data, v].map((x) => ["insert", x] as const));
      const uids: string[] = [];
      for (let n = run({ ops }).at(-1)!.vars.obj._head; n !== null; n = n._next) {
        uids.push(n.uid);
      }
      expect(uids.indexOf(ops.at(-1)!.id)).toBe(gap);
    }
  });
});
