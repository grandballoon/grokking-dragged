import { describe, expect, it } from "vitest";
import { lineText } from "../../../core/pythonSource";
import { BOOK_INPUT, run, SRC } from "./trace";

const lineOf = (frame: { line: number }) => lineText(SRC, frame.line).trim();

describe("iterative binary search port", () => {
  const frames = run(BOOK_INPUT);

  it("prints 1 and None, as the Python does", () => {
    expect(frames.at(-1)!.vars.stdout).toEqual(["1", "None"]);
  });

  it("guesses 5 then 1 then 3 when looking for 3", () => {
    const first = frames.filter((f) => f.vars.call === 0);
    const guesses = first.filter((f) => lineOf(f) === "guess = list[mid]");
    expect(guesses.map((f) => f.vars.guess)).toEqual([5, 1, 3]);
  });

  it("stops with low > high when the item is missing", () => {
    const end = frames.filter(
      (f) => f.vars.call === 1 && lineOf(f) === "return None",
    )[0]!;
    expect(end.vars).toMatchObject({ low: 0, high: -1, returned: { value: null } });
  });

  it("records search_iterative's lines, not search_recursive's", () => {
    const def = SRC.lines.findIndex((l) => l.includes("def search_recursive")) + 1;
    const inSearch = frames.filter(
      (f) => f.vars.item !== null && !lineOf(f).startsWith("print("),
    );
    expect(inSearch.every((f) => f.line < def)).toBe(true);
  });

  it("finds an item at the top end of a longer list", () => {
    const out = run({ my_list: [2, 4, 6, 8, 10, 12], items: [12, 7] }).at(-1)!.vars
      .stdout;
    expect(out).toEqual(["5", "None"]);
  });
});
