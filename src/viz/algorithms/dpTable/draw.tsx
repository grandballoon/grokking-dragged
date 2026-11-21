/**
 * The drawing both chapter 11 pages share: the two words as letter chips
 * that double as the table's row and column headers, the `dp_table` grid,
 * the cells the current statement read (wrapped negative indexes dashed),
 * the statement evaluated with real values, and the printed rows.
 *
 * Every letter is draggable: within its word, into the other word, or to a
 * tray of spare letters, so the reader can try any pair of short words.
 */
import { translate, Vec2, type Svgx } from "dragology";
import { lineText, type PythonSource } from "../../../core/pythonSource";
import {
  moveItem,
  moveTargets,
  type KeyedLists,
  type Slot,
} from "../../../core/keyedLists";
import { arrow, box, caption, cell, label, uid } from "../../../ui/svg";
import { color } from "../../../ui/theme";
import type { DrawArgs } from "../../defineViz";
import { CURRENT, DONE, EMPTY, PLAIN, type Paint } from "../kit/paint";
import { stdoutPanel } from "../kit/stdout";
import { varCell } from "../kit/varCell";
import {
  BOOK_WORDS,
  currentRow,
  explain,
  readsAt,
  stepKind,
  wraps,
  type DpVars,
  type Words,
} from "./dp";

/**
 * The editable input: the two words the Python spells out, a tray of spare
 * letters (not part of the program), and a stable id per letter, all keyed
 * the same way so `moveItem` can shuttle a letter between any two of them.
 */
export type DpInput = Words & {
  readonly spare: readonly string[];
  readonly ids: KeyedLists<string>;
};

type Key = "dp_table_blue" | "dp_table_clues" | "spare";
const KEYS: readonly Key[] = ["dp_table_blue", "dp_table_clues", "spare"];
const MAX_LETTERS = 6;
const MAX_SPARE = 10;

const lettersOf = (input: DpInput): KeyedLists<string> => ({
  dp_table_blue: input.dp_table_blue,
  dp_table_clues: input.dp_table_clues,
  spare: input.spare,
});

const BOOK_SPARE = ["a", "c", "s"];

export const DP_INITIAL_INPUT: DpInput = {
  ...BOOK_WORDS,
  spare: BOOK_SPARE,
  ids: Object.fromEntries(
    KEYS.map((key) => [
      key,
      lettersOf({ ...BOOK_WORDS, spare: BOOK_SPARE, ids: {} })[key]!.map(
        (_, k) => `${key}-${k}`,
      ),
    ]),
  ),
};

const CELL = 50;
const GRID = Vec2(130, 130);
const CHIP = Vec2(42, 36);
const COL_CHIP_Y = 64;
const ROW_CHIP_X = 74;
const TRAY = Vec2(130, 470);
const PANEL_X = 452;
const PANEL_W = 288;

const cellOrigin = (r: number, c: number) => GRID.add(Vec2(c * CELL, r * CELL));
const cellCentre = (r: number, c: number) =>
  cellOrigin(r, c).add(Vec2(CELL / 2, CELL / 2));

/** Where letter `index` of `key` sits. */
function letterAt(key: Key, index: number): Vec2 {
  if (key === "dp_table_clues") {
    return Vec2(GRID.x + index * CELL + (CELL - CHIP.x) / 2, COL_CHIP_Y);
  }
  if (key === "dp_table_blue") {
    return Vec2(ROW_CHIP_X, GRID.y + index * CELL + (CELL - CHIP.y) / 2);
  }
  return TRAY.add(Vec2(index * (CHIP.x + 6), 0));
}

function indexText(k: number, length: number): string {
  return k === length - 1 ? `${k} (-1)` : String(k);
}

export function dpDraw(src: PythonSource) {
  return function draw({
    frame,
    input,
    d,
    draggedId,
    withInput,
  }: DrawArgs<DpInput, DpVars>): Svgx {
    const { vars } = frame;
    const { dp_table } = vars;
    const kind = stepKind(lineText(src, frame.line));
    const reads = readsAt(src, frame);
    const rows = input.dp_table_blue.length;
    const cols = input.dp_table_clues.length;
    const filling = typeof vars.i === "number" && vars.j !== null;
    const fi = typeof vars.i === "number" ? vars.i : -1;
    const fj = vars.j ?? -1;
    const writes = kind === "diagonal" || kind === "best" || kind === "zero";
    const printing = Array.isArray(vars.i);
    const printed = currentRow(vars);

    const written = (r: number, c: number) => {
      if (printing) return true;
      if (!filling) return false;
      return r < fi || (r === fi && (c < fj || (c === fj && writes)));
    };

    const letters = lettersOf(input);
    const compared = (key: Key, index: number) =>
      filling &&
      kind !== null &&
      ((key === "dp_table_blue" && index === fi) ||
        (key === "dp_table_clues" && index === fj));
    const same = filling && vars.dp_table_clues[fj] === vars.dp_table_blue[fi];

    const letterChip = (key: Key, index: number) => {
      const slot: Slot = { key, index };
      const id = uid("letter", input.ids[key]![index]!);
      const paint: Paint =
        key === "spare" ? EMPTY : compared(key, index) ? (same ? DONE : CURRENT) : PLAIN;
      return cell(letterAt(key, index), CHIP.x, CHIP.y, {
        id,
        text: letters[key]![index]!,
        textOptions: { size: 17, weight: 600 },
        ...paint,
        zIndex: draggedId === id ? "/1" : 2,
        onDrag: () => {
          const accepts = (k: string, list: readonly string[]) =>
            list.length < (k === "spare" ? MAX_SPARE : MAX_LETTERS);
          const candidates = moveTargets(letters, slot, accepts)
            .map((to) => ({ to, moved: moveItem(letters, slot, to) }))
            .filter(
              ({ moved }) =>
                moved["dp_table_blue"]!.length > 0 && moved["dp_table_clues"]!.length > 0,
            )
            .map(({ to, moved }) =>
              withInput({
                dp_table_blue: moved["dp_table_blue"]!,
                dp_table_clues: moved["dp_table_clues"]!,
                spare: moved["spare"]!,
                ids: moveItem(input.ids, slot, to),
              }),
            );
          return d.closest(candidates).withFloating();
        },
      });
    };

    const headers = (
      <g>
        {caption("dp_table_clues →", Vec2(GRID.x, 24))}
        {caption("dp_table_blue ↓", Vec2(14, 114))}
        {input.dp_table_clues.map((_, c) =>
          label(indexText(c, cols), Vec2(GRID.x + c * CELL + CELL / 2, 50), {
            id: uid("col-index", c),
            size: 10.5,
            mono: true,
            fill: c === cols - 1 ? color.pointer : color.faint,
          }),
        )}
        {input.dp_table_blue.map((_, r) =>
          label(indexText(r, rows), Vec2(66, GRID.y + r * CELL + CELL / 2), {
            id: uid("row-index", r),
            size: 10.5,
            mono: true,
            anchor: "end",
            fill: r === rows - 1 ? color.pointer : color.faint,
          }),
        )}
      </g>
    );

    const readAt = (r: number, c: number) =>
      reads.find((x) => x.row === r && x.col === c);
    const cellPaint = (r: number, c: number): Paint => {
      if (printing) return r === printed ? DONE : PLAIN;
      if (filling && r === fi && c === fj) return CURRENT;
      return written(r, c) ? PLAIN : EMPTY;
    };

    const grid = (
      <g>
        {Array.from({ length: rows }, (_, r) =>
          Array.from({ length: cols }, (_, c) => {
            const paint = cellPaint(r, c);
            // Before `dp_table = [[0 ...]]` runs, the cells are drawn empty.
            const value = dp_table[r]?.[c];
            const hit = readAt(r, c);
            return (
              <g id={uid("cell", r, c)} transform={translate(cellOrigin(r, c))}>
                <g transform={translate(2, 2)}>
                  {box(CELL - 4, CELL - 4, { ...paint, radius: 6 })}
                </g>
                {value !== undefined &&
                  label(String(value), Vec2(CELL / 2, hit ? 30 : CELL / 2), {
                    size: 16,
                    mono: true,
                    weight: written(r, c) ? 600 : undefined,
                    fill: written(r, c) ? color.ink : color.faint,
                  })}
                {hit && (
                  <g>
                    <g transform={translate(5, 5)}>
                      {box(CELL - 10, CELL - 10, {
                        fill: "none",
                        stroke: color.pointer,
                        strokeWidth: 2.2,
                        radius: 5,
                        dash: wraps(hit) ? "4 3" : undefined,
                      })}
                    </g>
                    {label(`[${hit.pyRow}][${hit.pyCol}]`, Vec2(CELL / 2, 14), {
                      size: 9,
                      mono: true,
                      weight: 600,
                      fill: color.pointer,
                    })}
                  </g>
                )}
              </g>
            );
          }),
        ).flat()}
        {reads.map((r, k) =>
          arrow(cellCentre(r.row, r.col), cellCentre(fi, fj), {
            id: uid("read", k),
            stroke: color.pointer,
            inset: 17,
            width: 1.8,
            dash: wraps(r) ? "5 4" : undefined,
            bend: wraps(r) ? 24 : 0,
          }),
        )}
      </g>
    );

    const lines = explain(vars, kind, reads);
    const iText = Array.isArray(vars.i)
      ? `[${vars.i.join(", ")}]`
      : filling
        ? String(fi)
        : null;
    const iW = printing ? 190 : 60;
    const panel = (
      <g>
        {varCell("i", iText, Vec2(PANEL_X, 24), iW)}
        {varCell(
          "j",
          vars.j === null ? null : String(vars.j),
          Vec2(PANEL_X + iW + 12, 24),
          60,
        )}
        <g transform={translate(PANEL_X, 96)}>
          {box(PANEL_W, 150, {
            fill: color.paper,
            stroke: color.panelBorder,
            strokeWidth: 1,
            radius: 8,
          })}
          {caption("evaluating", Vec2(12, 16))}
          {lines.map((line, k) =>
            label(line.text, Vec2(14, 40 + k * 19), {
              id: uid("explain", k),
              size: 12,
              mono: true,
              anchor: "start",
              fill: line.wrap ? color.pointer : color.ink,
              weight: line.wrap ? 600 : undefined,
            }),
          )}
        </g>
        {stdoutPanel(vars.stdout, Vec2(PANEL_X, 270), PANEL_W, 124)}
        <g transform={translate(PANEL_X, 424)}>
          {box(16, 16, {
            fill: "none",
            stroke: color.pointer,
            strokeWidth: 2.2,
            radius: 4,
          })}
          {label("a cell this statement read", Vec2(26, 8), {
            size: 11.5,
            anchor: "start",
            fill: color.muted,
          })}
          <g transform={translate(0, 22)}>
            {box(16, 16, {
              fill: "none",
              stroke: color.pointer,
              strokeWidth: 2.2,
              radius: 4,
              dash: "4 3",
            })}
          </g>
          {label("read through a negative index", Vec2(26, 30), {
            size: 11.5,
            anchor: "start",
            fill: color.muted,
          })}
        </g>
      </g>
    );

    return (
      <g>
        {headers}
        {grid}
        {KEYS.flatMap((key) => letters[key]!.map((_, index) => letterChip(key, index)))}
        {caption("spare letters — not part of the program", TRAY.add(Vec2(0, -14)))}
        {panel}
      </g>
    );
  };
}
