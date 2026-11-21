import { describe, expect, it } from "vitest";
import { lineText } from "../../../core/pythonSource";
import { BOOK_LITERAL, run, SRC } from "./trace";

const line = (f: { line: number }) => lineText(SRC, f.line).trim();

describe("price of groceries port", () => {
  const frames = run(BOOK_LITERAL);

  it("prints the dict the way Python does", () => {
    expect(frames.at(-1)!.vars.stdout).toEqual([
      "{'apple': 0.67, 'milk': 1.49, 'avocado': 1.49}",
    ]);
    expect(line(frames.at(-1)!)).toBe("print(book)");
  });

  it("records one frame per pair of the literal, in order", () => {
    const literal = frames.filter((f) => line(f).startsWith("book = {"));
    expect(literal.map((f) => Object.keys(f.vars.book))).toEqual([
      ["apple"],
      ["apple", "milk"],
      ["apple", "milk", "avocado"],
    ]);
  });

  it("prints whole-number prices as floats and keeps insertion order", () => {
    // python3: print({"eggs": 3.0, "apple": 0.67}) -> {'eggs': 3.0, 'apple': 0.67}
    const out = run([
      ["eggs", 3],
      ["apple", 0.67],
    ]).at(-1)!.vars.stdout;
    expect(out).toEqual(["{'eggs': 3.0, 'apple': 0.67}"]);
  });

  it("prints an empty literal as {}", () => {
    expect(run([]).at(-1)!.vars.stdout).toEqual(["{}"]);
  });
});
