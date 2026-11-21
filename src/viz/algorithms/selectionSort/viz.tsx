import { translate, Vec2, type Svgx } from "dragology";
import { lineOf } from "../../../core/pythonSource";
import type { Frame } from "../../../core/trace";
import { box, caption, label, uid } from "../../../ui/svg";
import { color } from "../../../ui/theme";
import { defineViz, type DrawArgs } from "../../defineViz";
import { arrayEditor } from "../kit/arrayEditor";
import { arrInput, type ArrInput } from "../kit/arrayEdits";
import { callStack, localsLine, type Card, type StackLayout } from "../kit/callStack";
import { callHole, callId, cardStatus, returnChip } from "../kit/linearCalls";
import { CURRENT, DONE, PENDING, type Paint } from "../kit/paint";
import { stdoutPanel } from "../kit/stdout";
import { itemIds } from "./identity";
import { BOOK_ARR, run, SRC, type FindCall, type SortCall, type Vars } from "./trace";

const MAX_LEN = 7;
const VALUE_RANGE = [1, 12] as const;
const POOL = [4, 8, 1, 7, 9, 2, 11];

const INPUT = { at: Vec2(80, 92), pitch: 40, cellW: 34, cellH: 28 };
const INPUT_UNIT = 4;

/** The two lists the sort works on, side by side. */
const ARR_X = 20;
const NEW_X = 404;
const PITCH = 48;
const CELL_W = 42;
const CELL_H = 32;
const CELLS_Y = 300;
const UNIT = 9;
const DIVIDER_X = (ARR_X + (MAX_LEN - 1) * PITCH + CELL_W + NEW_X) / 2;

const STACK_TOP = 400;
const STACK: StackLayout = { width: 720, cardHeight: 40, gap: 6, exprX: 300 };

type Tone = "plain" | "current" | "pending" | "done";
const TONE: Record<Tone, Paint> = {
  plain: { fill: color.cellEmpty, stroke: color.cellBorder },
  current: CURRENT,
  pending: PENDING,
  done: DONE,
};

/**
 * The selectionSort call on screen. While the script runs before or after
 * the call, show the nearest call's lists: the input still unsorted at the
 * start, the finished lists at the end.
 */
function sortCall(frames: readonly Frame<Vars>[], step: number): SortCall | null {
  for (let k = step; k >= 0; k--) {
    const call = frames[k]!.vars.stack[0];
    if (call !== undefined) return call as SortCall;
  }
  return null;
}

/** A value as a bar standing on a cell, its top-left at the local origin. */
function item(id: string, value: number, at: Vec2, tone: Tone): Svgx {
  const barH = value * UNIT;
  const barW = 22;
  return (
    <g id={id} transform={translate(at)}>
      <rect
        transform={translate((CELL_W - barW) / 2, -4 - barH)}
        width={barW}
        height={barH}
        rx={3}
        fill={TONE[tone].fill}
        stroke={TONE[tone].stroke}
        strokeWidth={1.5}
      />
      {box(CELL_W, CELL_H, {
        fill: tone === "plain" ? color.cell : TONE[tone].fill,
        stroke: TONE[tone].stroke,
      })}
      {label(String(value), Vec2(CELL_W / 2, CELL_H / 2), { size: 14, mono: true })}
    </g>
  );
}

/** An upward pointer under column `index` of arr, named after a variable. */
function pointer(id: string, name: string, index: number, row: number, stroke: string) {
  const x = ARR_X + index * PITCH + CELL_W / 2;
  const tipY = CELLS_Y + CELL_H + 6 + row * 22;
  return (
    <g id={id} transform={translate(x, tipY)}>
      <path d="M 0 0 L 5 9 L -5 9 Z" fill={stroke} />
      {label(name, Vec2(9, 5), {
        size: 11,
        mono: true,
        fill: stroke,
        weight: 600,
        anchor: "start",
      })}
    </g>
  );
}

function cards(stack: Vars["stack"]): Card[] {
  return stack.map((call, i) => {
    const status = cardStatus<unknown>(stack, i);
    const ret = returnChip<unknown>(stack, i);
    if (call.fn === "findSmallest") {
      const { smallest, smallest_index, i: index } = call;
      return {
        id: callId(call),
        title: "findSmallest(arr)",
        locals: localsLine({ smallest, smallest_index, i: index }),
        status,
        ret,
      };
    }
    const hole = callHole<unknown>(stack, i);
    return {
      id: callId(call),
      title: "selectionSort(arr)",
      locals: localsLine({ i: call.i, smallest: call.smallest }),
      status,
      expr: hole === undefined ? undefined : { before: "smallest = ", hole },
      ret,
    };
  });
}

function draw({
  frame,
  frames,
  state,
  input,
  size,
  d,
  draggedId,
  withInput,
}: DrawArgs<ArrInput, Vars>): Svgx {
  const { stack, stdout } = frame.vars;
  const sort = sortCall(frames, state.step);
  const find = stack[1] as FindCall | undefined;
  const arr = sort?.arr ?? input.arr;
  const newArr = sort?.newArr ?? [];
  const ids = itemIds(input, newArr, arr);
  const popping = frame.line === lineOf(SRC, "smallest = findSmallest(arr)");
  const marked = find?.smallest_index ?? (popping ? sort!.smallest : null);
  const arrTone = (j: number): Tone =>
    find?.i === j ? "current" : marked === j ? "pending" : "plain";

  return (
    <g>
      {caption("input: the list the script sorts", Vec2(20, 14))}
      {arrayEditor({
        name: "arr",
        ...INPUT,
        list: input,
        idPrefix: "ss-in",
        bars: { unit: INPUT_UNIT, range: VALUE_RANGE },
        reorder: true,
        length: { range: [1, MAX_LEN], fill: (a) => POOL[a.length % POOL.length]! },
        d,
        draggedId,
        toState: withInput,
      })}
      {stdoutPanel(stdout, Vec2(420, 14), 320, 108)}

      {caption("arr", Vec2(ARR_X, 168))}
      {caption("newArr", Vec2(NEW_X, 168))}
      <line
        x1={DIVIDER_X}
        x2={DIVIDER_X}
        y1={176}
        y2={CELLS_Y + CELL_H}
        stroke={color.rule}
        strokeDasharray="3 4"
      />
      {arr.map((v, j) =>
        item(
          uid("ss-item", ids.arr[j]!),
          v,
          Vec2(ARR_X + j * PITCH, CELLS_Y),
          arrTone(j),
        ),
      )}
      {newArr.map((v, j) =>
        item(uid("ss-item", ids.newArr[j]!), v, Vec2(NEW_X + j * PITCH, CELLS_Y), "done"),
      )}
      {marked !== null &&
        pointer(
          "ss-smallest",
          find === undefined ? "smallest" : "smallest_index",
          marked,
          0,
          color.pending,
        )}
      {find !== undefined &&
        find.i !== null &&
        pointer("ss-i", "i", find.i, 1, color.current)}

      {callStack(cards(stack), Vec2(20, STACK_TOP), size.y - STACK_TOP - 14, STACK)}
    </g>
  );
}

export const selectionSortViz = defineViz<ArrInput, Vars>({
  id: "selection-sort",
  title: "Selection sort",
  book: "Grokking Algorithms",
  chapter: "2 · Selection sort",
  summary:
    "Find the smallest item, pop it out of arr and append it to newArr; repeat until arr is empty. Each pass looks at every remaining item, so n items take about n² / 2 comparisons.",
  drags: [
    "the timeline knob to step through every comparison",
    "a cell of the input sideways to reorder the list",
    "a purple dot up or down to change a value",
    "the purple ] to sort a shorter or longer list",
  ],
  sources: [SRC],
  initialInput: arrInput(BOOK_ARR),
  run,
  draw,
});
