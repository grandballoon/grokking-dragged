import { describe, expect, it } from "vitest";
import { displayWindow, lineOf, lineText, pythonSource } from "./pythonSource";

const SRC = pythonSource(
  "demo.py",
  [
    "class Box:", // 1
    "    '''A box.", // 2
    "", // 3
    "    It holds things.'''", // 4
    "    def put(self, x):", // 5
    '        """Put x in."""', // 6
    "        if x:", // 7
    "            return None", // 8
    "        return None", // 9
    "", // 10
    "", // 11
    "    def take(self):", // 12
    "        # comment mentioning return None", // 13
    "        return 1", // 14
  ].join("\n"),
);

describe("pythonSource", () => {
  it("finds docstrings, single- and multi-line", () => {
    expect([...SRC.docstringLines].sort((a, b) => a - b)).toEqual([2, 3, 4, 6]);
  });

  it("finds a unique line by snippet", () => {
    expect(lineOf(SRC, "if x:")).toBe(7);
    expect(lineText(SRC, lineOf(SRC, "return 1"))).toBe("        return 1");
  });

  it("ignores comments and docstrings when matching", () => {
    expect(() => lineOf(SRC, "Put x")).toThrow(/matched 0 lines/);
    expect(() => lineOf(SRC, "It holds")).toThrow(/matched 0 lines/);
    // Line 13 mentions "return None" only in a comment.
    expect(() => lineOf(SRC, "return None", { after: "def take" })).toThrow(/matched 0/);
  });

  it("rejects ambiguous snippets unless anchored", () => {
    expect(() => lineOf(SRC, "return None")).toThrow(/matched 2 lines/);
    expect(lineOf(SRC, "return None", { after: "if x:" })).toBe(8);
  });

  it("shows a short file whole, without docstrings or doubled blank lines", () => {
    expect(displayWindow(SRC, 7, 40)).toEqual([1, 5, 7, 8, 9, 10, 12, 13, 14]);
  });

  it("shows only the enclosing def of a long file", () => {
    expect(displayWindow(SRC, 8, 5)).toEqual([5, 7, 8, 9]);
    expect(displayWindow(SRC, 14, 5)).toEqual([12, 13, 14]);
  });

  it("keeps the current line in view when even the def is too long", () => {
    expect(displayWindow(SRC, 9, 2)).toContain(9);
    expect(displayWindow(SRC, 9, 2)).toHaveLength(2);
  });
});
