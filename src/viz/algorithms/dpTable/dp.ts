/**
 * What the two chapter 11 ports share: their input (the two words as lists
 * of letters), their variables, and a description of which cells an
 * assignment reads, wrapped negative indexes included.
 */
import { pyIndexOf } from "../../../core/python";
import { lineText, type PythonSource } from "../../../core/pythonSource";
import type { Frame } from "../../../core/trace";

export type Words = {
  readonly dp_table_blue: readonly string[];
  readonly dp_table_clues: readonly string[];
};

export const BOOK_WORDS: Words = {
  dp_table_blue: ["b", "l", "u", "e"],
  dp_table_clues: ["c", "l", "u", "e", "s"],
};

export type DpVars = {
  dp_table_blue: string[];
  dp_table_clues: string[];
  dp_table: number[][];
  /** The row index while filling; in the final `for i in dp_table`, the row itself. */
  i: number | number[] | null;
  j: number | null;
  stdout: string[];
};

/** One `dp_table[row][col]` read, as written in Python and as resolved. */
export type Read = {
  readonly pyRow: number;
  readonly pyCol: number;
  readonly row: number;
  readonly col: number;
};

export function read(pyRow: number, pyCol: number, rows: number, cols: number): Read {
  return {
    pyRow,
    pyCol,
    row: pyIndexOf(pyRow, rows),
    col: pyIndexOf(pyCol, cols),
  };
}

export const wraps = (r: Read) => r.pyRow < 0 || r.pyCol < 0;

/** `dp_table[-1][4]`, as the Python indexes it. */
export function refText(r: Read): string {
  return `dp_table[${r.pyRow}][${r.pyCol}]`;
}

/** " Negative indexes wrap: [-1][0] is [3][0]." for wrapped reads, else "". */
export function wrapNote(reads: readonly Read[]): string {
  const wrapped = reads.filter(wraps);
  if (wrapped.length === 0) return "";
  const parts = wrapped.map((r) => `[${r.pyRow}][${r.pyCol}] is [${r.row}][${r.col}]`);
  return ` Negative indexes wrap: ${parts.join(", ")}.`;
}

/** Narration for one of the word lists, noting when it differs from the script's. */
export function wordNote(
  name: keyof Words,
  letters: readonly string[],
  what: "rows" | "columns",
): string {
  const word = letters.join("");
  const book = BOOK_WORDS[name].join("");
  return word === book
    ? `${name} spells '${word}': one letter per ${what === "rows" ? "row" : "column"}.`
    : `${name} spells '${word}' here (the script lists '${book}'): one letter per ${what === "rows" ? "row" : "column"}.`;
}

/** The row index being filled, or (while printing) the row being printed. */
export function currentRow(vars: DpVars): number | null {
  if (typeof vars.i === "number") return vars.i;
  if (vars.i === null) return null;
  return vars.stdout.length - 1;
}

/** Which statement a frame is on, from its line's text. */
export type StepKind = "compare" | "diagonal" | "best" | "zero" | null;

export function stepKind(line: string): StepKind {
  if (line.includes("if dp_table_clues[j] == dp_table_blue[i]:")) return "compare";
  if (line.includes("dp_table[i-1][j-1] + 1")) return "diagonal";
  if (line.includes("max(dp_table[i-1][j], dp_table[i][j-1])")) return "best";
  if (line.includes("dp_table[i][j] = 0")) return "zero";
  return null;
}

/**
 * The cells the assignment on `frame`'s line of `src` read, in the order
 * Python reads them, wrapped indexes resolved to the cell actually read.
 */
export function readsAt(src: PythonSource, frame: Frame<DpVars>): Read[] {
  const { i, j, dp_table } = frame.vars;
  if (typeof i !== "number" || j === null) return [];
  const rows = dp_table.length;
  const cols = dp_table[0]?.length ?? 0;
  switch (stepKind(lineText(src, frame.line))) {
    case "diagonal":
      return [read(i - 1, j - 1, rows, cols)];
    case "best":
      return [read(i - 1, j, rows, cols), read(i, j - 1, rows, cols)];
    default:
      return [];
  }
}

/** One line of the "evaluating" panel; `wrap` marks a note about a negative index. */
export type Explained = { readonly text: string; readonly wrap?: boolean };

/**
 * The statement on this frame with the real indexes and values filled in,
 * one short line at a time. A read of the cell being written happened
 * before the write, when it still held its initial 0.
 */
export function explain(
  vars: DpVars,
  kind: StepKind,
  reads: readonly Read[],
): Explained[] {
  const { i, j, dp_table, dp_table_blue, dp_table_clues } = vars;
  if (typeof i !== "number" || j === null || kind === null) return [];
  const valueOf = (r: Read) =>
    r.row === i && r.col === j ? 0 : dp_table[r.row]![r.col]!;
  const target = `dp_table[${i}][${j}]`;
  const wrapLines = reads.filter(wraps).map((r) => ({
    text: `[${r.pyRow}][${r.pyCol}] is [${r.row}][${r.col}]`,
    wrap: true,
  }));
  switch (kind) {
    case "compare": {
      const same = dp_table_clues[j] === dp_table_blue[i];
      return [
        { text: `dp_table_clues[${j}] == dp_table_blue[${i}]` },
        { text: `'${dp_table_clues[j]}' == '${dp_table_blue[i]}'` },
        { text: same ? "True" : "False" },
      ];
    }
    case "diagonal": {
      const [diag] = reads;
      if (diag === undefined) return [];
      return [
        { text: `${target} =` },
        { text: `  ${refText(diag)} + 1` },
        { text: `= ${valueOf(diag)} + 1 = ${valueOf(diag) + 1}` },
        ...wrapLines,
      ];
    }
    case "best": {
      const [up, left] = reads;
      if (up === undefined || left === undefined) return [];
      const a = valueOf(up);
      const b = valueOf(left);
      return [
        { text: `${target} = max(` },
        { text: `  ${refText(up)},` },
        { text: `  ${refText(left)})` },
        { text: `= max(${a}, ${b}) = ${Math.max(a, b)}` },
        ...wrapLines,
      ];
    }
    case "zero":
      return [{ text: `${target} = 0` }];
  }
}
