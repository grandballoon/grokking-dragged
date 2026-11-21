import { describe, expect, it } from "vitest";
import type { Frame } from "../../../core/trace";
import { lineText } from "../../../core/pythonSource";
import { BOOK_WORDS, readsAt as readsIn, type DpVars, type Words } from "../dpTable/dp";
import { run, SRC } from "./trace";

const readsAt = (frame: Frame<DpVars>) => readsIn(SRC, frame);

const words = (a: string, b: string): Words => ({
  dp_table_blue: [...a],
  dp_table_clues: [...b],
});

describe("longest common subsequence port", () => {
  const frames = run(BOOK_WORDS);

  it("prints the table the Python prints", () => {
    expect(frames.at(-1)!.vars.stdout).toEqual([
      "[0, 0, 0, 0, 0]",
      "[0, 1, 1, 1, 1]",
      "[0, 1, 2, 2, 2]",
      "[0, 1, 2, 3, 3]",
    ]);
  });

  it("reads the last row and column at i = 0 and j = 0, as Python's -1 does", () => {
    const first = frames.find(
      (f) => f.vars.i === 0 && f.vars.j === 0 && readsAt(f).length,
    )!;
    expect(lineText(SRC, first.line).trim()).toBe(
      "dp_table[i][j] = max(dp_table[i-1][j], dp_table[i][j-1])",
    );
    expect(readsAt(first)).toEqual([
      { pyRow: -1, pyCol: 0, row: 3, col: 0 },
      { pyRow: 0, pyCol: -1, row: 0, col: 4 },
    ]);
  });

  // Expected tables from running the Python with these two words.
  it("matches Python where the wrap changes the answer", () => {
    expect(run(words("abcs", "cab")).at(-1)!.vars.stdout).toEqual([
      "[0, 1, 1]",
      "[0, 1, 2]",
      "[3, 3, 3]",
      "[3, 3, 3]",
    ]);
    expect(run(words("a", "ba")).at(-1)!.vars.stdout).toEqual(["[0, 1]"]);
  });

  it("matches Python on fosh and fish", () => {
    expect(run(words("fosh", "fish")).at(-1)!.vars.stdout).toEqual([
      "[1, 1, 1, 1]",
      "[1, 1, 1, 1]",
      "[1, 1, 2, 2]",
      "[1, 1, 2, 3]",
    ]);
  });
});
