import { translate, Vec2, type Svgx } from "dragology";
import { pyRepr } from "../../../core/python";
import { lineOf } from "../../../core/pythonSource";
import { box, caption, label, uid } from "../../../ui/svg";
import { color } from "../../../ui/theme";
import { defineViz, type DrawArgs } from "../../defineViz";
import { arrayEditor } from "../kit/arrayEditor";
import { arrInput, type ArrInput } from "../kit/arrayEdits";
import { CURRENT, PLAIN, VISITED } from "../kit/paint";
import { stdoutPanel } from "../kit/stdout";
import { varCell } from "../kit/varCell";
import { BOOK_ARR, run, SRC, type Vars } from "./trace";

const INPUT = { at: Vec2(80, 86), pitch: 40, cellW: 34, cellH: 28 };
const VALUE_RANGE = [0, 9] as const;
const MAX_LEN = 6;
const POOL = [5, 7, 2, 8, 1, 3];
const UNIT = 10;
const BAR_X = 120;
const CELL_W = 80;
const CELL_H = 34;
const TOTAL_Y = INPUT.at.y + INPUT.cellH + 40;
const X_Y = TOTAL_Y + 70;
const OUT_Y = X_Y + 70;

/** How many items `total` already includes. */
function summed(vars: Vars, line: number): number {
  if (vars.at === null) return 0;
  return vars.at + (line === lineOf(SRC, "total += x") ? 1 : 0);
}

/** A local of `sum`, its cell's top at `y`. */
function local(name: string, value: number | null, y: number, active: boolean): Svgx {
  return varCell(name, value === null ? null : String(value), Vec2(20, y - 12), CELL_W, {
    h: CELL_H,
    size: 15,
    weight: 600,
    paint: active ? CURRENT : PLAIN,
  });
}

function draw({ frame, input, d, draggedId, withInput }: DrawArgs<ArrInput, Vars>): Svgx {
  const { vars } = frame;
  const added = summed(vars, frame.line);
  const justAdded = frame.line === lineOf(SRC, "total += x");
  const looping = vars.at !== null && vars.at < vars.arr.length;

  const segments = vars.arr.slice(0, added).map((value, i) => {
    const x = BAR_X + vars.arr.slice(0, i).reduce((a, b) => a + b, 0) * UNIT;
    const latest = justAdded && i === added - 1;
    return (
      <g id={uid("segment", i)} transform={translate(x, TOTAL_Y)}>
        {box(value * UNIT, CELL_H, {
          radius: 3,
          fill: latest ? color.currentFill : color.visitedFill,
          stroke: latest ? color.current : color.visited,
        })}
        {value * UNIT >= 14 &&
          label(String(value), Vec2((value * UNIT) / 2, CELL_H / 2), {
            size: 12,
            mono: true,
            fill: latest ? color.ink : color.muted,
          })}
      </g>
    );
  });

  return (
    <g>
      {caption(`print(sum(${pyRepr(input.arr)}))`, Vec2(20, 14), { fill: color.ink })}
      {arrayEditor({
        ...INPUT,
        list: input,
        name: "arr",
        idPrefix: "sum-in",
        bars: { unit: 4, range: VALUE_RANGE },
        reorder: true,
        length: { range: [0, MAX_LEN], fill: (arr) => POOL[arr.length % POOL.length]! },
        paint: (i) =>
          vars.at === null
            ? undefined
            : i === vars.at
              ? CURRENT
              : i < vars.at
                ? VISITED
                : undefined,
        d,
        draggedId,
        toState: withInput,
      })}
      {local("total", vars.total, TOTAL_Y, justAdded)}
      {segments}
      {local("x", vars.x, X_Y, looping)}
      {stdoutPanel(vars.stdout, Vec2(20, OUT_Y - 12), 720, 28)}
    </g>
  );
}

export const loopSumViz = defineViz<ArrInput, Vars>({
  id: "loop-sum",
  title: "Sum with a loop",
  book: "Grokking Algorithms",
  chapter: "4 · Quicksort",
  summary:
    "Add up a list the ordinary way: walk it with a for loop, keeping a running total. The recursive versions on the next pages do the same job by calling themselves.",
  drags: [
    "the timeline knob to step through the loop",
    "a purple dot up or down to change a value",
    "a cell sideways to reorder the list",
    "the purple ] to make the list shorter or longer",
  ],
  sources: [SRC],
  initialInput: arrInput(BOOK_ARR),
  run: (input) => run(input.arr),
  draw,
  diagramHeight: OUT_Y + 28 + 24,
});
