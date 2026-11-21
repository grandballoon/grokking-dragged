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

describe("longest common substring port", () => {
  const frames = run(BOOK_WORDS);

  it("prints the table the Python prints", () => {
    expect(frames.at(-1)!.vars.stdout).toEqual([
      "[0, 0, 0, 0, 0]",
      "[0, 1, 0, 0, 0]",
      "[0, 0, 2, 0, 0]",
      "[0, 0, 0, 3, 0]",
    ]);
  });

  it("reads only the diagonal, and only on a match", () => {
    const writes = frames.filter((f) =>
      lineText(SRC, f.line).includes("dp_table[i][j] ="),
    );
    expect(writes).toHaveLength(20);
    const reads = writes.filter((f) => readsAt(f).length > 0);
    expect(reads.map((f) => readsAt(f)[0])).toEqual([
      { pyRow: 0, pyCol: 0, row: 0, col: 0 },
      { pyRow: 1, pyCol: 1, row: 1, col: 1 },
      { pyRow: 2, pyCol: 2, row: 2, col: 2 },
    ]);
  });

  // Expected tables from running the Python with these two words.
  it("matches Python where a wrapped diagonal read changes the answer", () => {
    expect(run(words("abcs", "cab")).at(-1)!.vars.stdout).toEqual([
      "[0, 1, 0]",
      "[0, 0, 2]",
      "[3, 0, 0]",
      "[0, 0, 0]",
    ]);
    expect(run(words("fosh", "fish")).at(-1)!.vars.stdout).toEqual([
      "[1, 0, 0, 0]",
      "[0, 0, 0, 0]",
      "[0, 0, 1, 0]",
      "[0, 0, 0, 2]",
    ]);
  });
});
