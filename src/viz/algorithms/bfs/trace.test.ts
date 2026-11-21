import { describe, expect, it } from "vitest";
import { lineText } from "../../../core/pythonSource";
import { BOOK_GRAPH, INITIAL_INPUT, run, SRC } from "./trace";

describe("breadth-first search port", () => {
  const frames = run(INITIAL_INPUT);
  const last = frames[frames.length - 1]!;

  it("finds thom, as the Python prints", () => {
    expect(last.vars.result).toBe(true);
    expect(last.vars.person).toBe("thom");
    expect(lineText(SRC, last.line).trim()).toBe("return True");
  });

  it("searches people in the same order as the Python", () => {
    expect([...last.vars.searched]).toEqual([
      "you",
      "alice",
      "bob",
      "claire",
      "peggy",
      "anuj",
    ]);
  });

  it("skips peggy the second time she comes off the queue", () => {
    const skips = frames.filter((f) => lineText(SRC, f.line).trim() === "continue");
    expect(skips.map((f) => f.vars.person)).toEqual(["peggy"]);
  });

  it("snapshots each frame independently", () => {
    expect(frames[0]!.vars.search_queue).toEqual(["you"]);
    expect(frames[0]!.vars.searched.size).toBe(0);
  });

  it("returns False when nobody sells mangoes", () => {
    const noSeller = { ...BOOK_GRAPH, claire: ["jonny"] };
    const end = run({ graph: noSeller, start: "you" }).at(-1)!;
    expect(end.vars.result).toBe(false);
    expect(lineText(SRC, end.line).trim()).toBe("return False");
  });
});
