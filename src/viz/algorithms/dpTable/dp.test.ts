import { describe, expect, it } from "vitest";
import { explain, read, stepKind, wrapNote } from "./dp";

describe("dp table helpers", () => {
  it("resolves negative indexes to the cell actually read", () => {
    expect(read(-1, 2, 4, 5)).toEqual({ pyRow: -1, pyCol: 2, row: 3, col: 2 });
    expect(read(1, -1, 4, 5)).toEqual({ pyRow: 1, pyCol: -1, row: 1, col: 4 });
  });

  it("explains wrapped reads only", () => {
    expect(wrapNote([read(1, 2, 4, 5)])).toBe("");
    expect(wrapNote([read(-1, -1, 4, 5)])).toBe(
      " Negative indexes wrap: [-1][-1] is [3][4].",
    );
  });
});

describe("explain", () => {
  const vars = {
    dp_table_blue: ["a", "b"],
    dp_table_clues: ["b", "a"],
    dp_table: [
      [0, 1],
      [1, 0],
    ],
    i: 1,
    j: 0,
    stdout: [],
  };

  it("fills in a wrapped diagonal read", () => {
    expect(explain(vars, "diagonal", [read(0, -1, 2, 2)])).toEqual([
      { text: "dp_table[1][0] =" },
      { text: "  dp_table[0][-1] + 1" },
      { text: "= 1 + 1 = 2" },
      { text: "[0][-1] is [0][1]", wrap: true },
    ]);
  });

  it("reads the written cell as its old 0", () => {
    const one = {
      ...vars,
      dp_table: [[5]],
      dp_table_blue: ["a"],
      dp_table_clues: ["a"],
      i: 0,
    };
    expect(explain(one, "diagonal", [read(-1, -1, 1, 1)])[2]).toEqual({
      text: "= 0 + 1 = 1",
    });
  });

  it("knows each statement", () => {
    expect(stepKind("            dp_table[i][j] = 0")).toBe("zero");
    expect(stepKind("for i in dp_table:")).toBeNull();
  });
});
