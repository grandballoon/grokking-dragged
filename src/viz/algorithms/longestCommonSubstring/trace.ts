/**
 * Port of python-master/11/02_longest_common_substring.py.
 *
 * The same table as the subsequence program, but a mismatch resets the cell
 * to 0. A match reads `dp_table[i-1][j-1]`, and at `i = 0` or `j = 0` Python's
 * negative indexes wrap that read to the last row or column; the port wraps
 * the same way, and `readsAt` (in `dpTable/dp.ts`) reports the cell
 * actually read.
 */
import source from "@repo/python-master/11/02_longest_common_substring.py?raw";
import { pyIndex } from "../../../core/python";
import { pythonSource } from "../../../core/pythonSource";
import { recorder, type Frame } from "../../../core/trace";
import {
  read,
  refText,
  wordNote,
  wrapNote,
  type DpVars,
  type Words,
} from "../dpTable/dp";

export const SRC = pythonSource(
  "python-master/11/02_longest_common_substring.py",
  source,
);

const DIAGONAL = "dp_table[i][j] = dp_table[i-1][j-1] + 1";

export function run(input: Words): Frame<DpVars>[] {
  const rec = recorder<DpVars>();
  const step = rec.in(SRC);

  const dp_table_blue = [...input.dp_table_blue];
  const dp_table_clues = [...input.dp_table_clues];
  const dp_table: number[][] = [];
  let i: number | number[] | null = null;
  let j: number | null = null;
  const stdout: string[] = [];
  const vars = (): DpVars => ({ dp_table_blue, dp_table_clues, dp_table, i, j, stdout });
  const rows = dp_table_blue.length;
  const cols = dp_table_clues.length;

  step("dp_table_blue = [", vars(), wordNote("dp_table_blue", dp_table_blue, "rows"));
  step(
    "dp_table_clues = [",
    vars(),
    wordNote("dp_table_clues", dp_table_clues, "columns"),
  );
  for (let r = 0; r < rows; r++) dp_table.push(dp_table_clues.map(() => 0));
  step("dp_table = [[0", vars(), `Start with a ${rows}×${cols} table of zeros.`);

  for (let row = 0; row < rows; row++) {
    i = row;
    for (let col = 0; col < cols; col++) {
      j = col;
      const same = dp_table_clues[col] === dp_table_blue[row];
      step(
        "if dp_table_clues[j] == dp_table_blue[i]:",
        vars(),
        `Is clues[${col}] '${dp_table_clues[col]}' the same as blue[${row}] '${dp_table_blue[row]}'? ` +
          (same ? "Yes." : "No."),
      );
      if (same) {
        const diag = read(row - 1, col - 1, rows, cols);
        const value = pyIndex(pyIndex(dp_table, diag.pyRow), diag.pyCol) + 1;
        dp_table[row]![col] = value;
        step(
          DIAGONAL,
          vars(),
          `A match: the run along the diagonal grows, ${refText(diag)} + 1 = ${value}.` +
            wrapNote([diag]),
        );
      } else {
        dp_table[row]![col] = 0;
        step("dp_table[i][j] = 0", vars(), "No match: any common run is broken, so 0.");
      }
    }
  }

  for (const row of dp_table) {
    i = row;
    stdout.push(`[${row.join(", ")}]`);
    step("print(i)", vars(), `Print row ${stdout.length - 1}: ${stdout.at(-1)}.`);
  }
  return rec.frames;
}
