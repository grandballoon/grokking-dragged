import { translate, Vec2, type Svgx } from "dragology";
import { lineText } from "../../../../core/pythonSource";
import { box, caption, label, optional, uid } from "../../../../ui/svg";
import { color } from "../../../../ui/theme";
import { defineViz, type DrawArgs } from "../../../defineViz";
import {
  exceptionBanner,
  pickerKnob,
  pickerTrack,
  stackColumn,
  type CallLine,
} from "../parts";
import {
  done,
  elementChip,
  heapCallLine,
  heapPicture,
  heapRoles,
  type HeapGeometry,
  type HeapLook,
} from "../heap/picture";
import {
  HEAP_SRC,
  INITIAL_INPUT,
  run,
  showPair,
  SRC,
  type Input,
  type Pair,
  type Vars,
} from "./trace";

/** The bar chart of `arr`. */
const CHART_LEFT = 30;
const SLOT = 36;
const BAR_W = 24;
const V_MIN = -50;
const V_MAX = 250;
const Y_TOP = 40;
const SCALE = 0.4;
const BASELINE = Y_TOP + V_MAX * SCALE;
const yOf = (v: number) => Y_TOP + (V_MAX - v) * SCALE;
/** The values a bar can be dragged to. */
const CANDIDATES = Array.from(
  { length: (V_MAX - V_MIN) / 5 + 1 },
  (_, n) => V_MIN + n * 5,
);

const RIGHT = 490;
const CELL_H = 40;
const ARRAY_TOP = 470;
const RESULT_TOP = 598;

const look: HeapLook<Pair> = {
  prefix: "k",
  key: ([index]) => String(index),
  main: ([, value]) => String(value),
  sub: ([index]) => `i=${index}`,
};

function cellWidth(capacity: number): number {
  return Math.min(56, Math.floor(724 / Math.max(1, capacity)) - 4);
}

function geometry(
  capacity: number,
  removedAt: Vec2 | null,
  final: boolean,
): HeapGeometry {
  const levels = Math.max(1, Math.floor(Math.log2(Math.max(1, capacity))) + 1);
  return {
    tree: {
      left: 30,
      top: 214,
      width: 420,
      levels,
      levelGap: levels <= 1 ? 0 : Math.min(60, 165 / (levels - 1)),
    },
    node: { w: 40, h: 28 },
    array: {
      left: 30,
      top: ARRAY_TOP,
      cellW: cellWidth(capacity),
      cellH: CELL_H,
      gap: 4,
    },
    removedAt,
    removedIs: final ? "result" : "discarded",
  };
}

type Style = { fill: string; stroke: string };

function barStyle(
  index: number,
  vars: Vars,
  kept: ReadonlySet<number>,
  results: ReadonlySet<number>,
): Style {
  if (results.has(index)) return { fill: color.doneFill, stroke: color.done };
  if (vars.result === null && index === vars.i)
    return { fill: color.currentFill, stroke: color.current };
  if (kept.has(index)) return { fill: color.pendingFill, stroke: color.pending };
  if (vars.i !== null && (index < vars.i || vars.result !== null))
    return { fill: color.visitedFill, stroke: color.visited };
  return { fill: color.cell, stroke: color.cellBorder };
}

function chart({ frame, input, d, withInput }: DrawArgs<Input, Vars>): Svgx {
  const { vars } = frame;
  const elements = vars.heap ?? [];
  const roles = heapRoles(elements, vars.stack, look.key);
  const kept = new Set(elements.map(([index]) => index));
  if (roles.held !== null) kept.add(roles.held[0]);
  const results = new Set([...(vars.result ?? [])].map(([index]) => index));
  if (vars.result !== null && roles.removed !== null) results.add(roles.removed[0]);

  return (
    <g>
      {caption("arr", Vec2(CHART_LEFT, 16))}
      <line
        x1={CHART_LEFT}
        y1={BASELINE}
        x2={CHART_LEFT + SLOT * input.arr.length}
        y2={BASELINE}
        stroke={color.rule}
        strokeWidth={1.5}
      />
      {input.arr.map((value, i) => {
        const style = barStyle(i, vars, kept, results);
        const h = Math.max(2, Math.abs(BASELINE - yOf(value)));
        const below = value < 0;
        return (
          <g>
            <g
              id={uid("bar", i)}
              transform={translate(
                CHART_LEFT + i * SLOT + (SLOT - BAR_W) / 2,
                yOf(value),
              )}
              dragologyOnDrag={() =>
                d.closest(
                  CANDIDATES.map((v) =>
                    withInput({
                      ...input,
                      arr: input.arr.map((x, j) => (j === i ? v : x)),
                    }),
                  ),
                )
              }
              style={{ cursor: "ns-resize" }}
            >
              <rect
                transform={translate(0, below ? -h : 0)}
                width={BAR_W}
                height={h}
                rx={3}
                fill={style.fill}
                stroke={style.stroke}
                strokeWidth={1.5}
              />
              {label(String(value), Vec2(BAR_W / 2, below ? 9 : -8), {
                size: 10,
                mono: true,
                fill: color.ink,
              })}
            </g>
            {label(String(i), Vec2(CHART_LEFT + i * SLOT + SLOT / 2, 176), {
              size: 10,
              mono: true,
              fill: color.faint,
            })}
          </g>
        );
      })}
    </g>
  );
}

function callLines(frame: DrawArgs<Input, Vars>["frame"]): CallLine[] {
  const { vars } = frame;
  const text = frame.file === SRC.file ? lineText(SRC, frame.line).trim() : "";
  const running = !text.startsWith("arr = [") && !text.startsWith("print(");
  if (!running) return [];
  return [
    {
      call: "k_largest_elements(arr, k)",
      locals: vars.i === null ? [] : [`i=${vars.i}`],
    },
    ...vars.stack.map((call) => heapCallLine(call, showPair)),
  ];
}

function draw(args: DrawArgs<Input, Vars>): Svgx {
  const { frame, frames, input, d, draggedId, withInput } = args;
  const { vars } = frame;
  const capacity = Math.max(1, ...frames.map((f) => f.vars.heap?.length ?? 0));
  const cellW = cellWidth(Math.max(capacity, input.k));
  const final = vars.result !== null;
  const removedAt = final
    ? Vec2(30 + (vars.result?.length ?? 0) * (cellW + 4), RESULT_TOP)
    : Vec2(RIGHT, 106);
  const geo = geometry(Math.max(capacity, input.k), removedAt, final);
  const raising =
    frame.file === HEAP_SRC.file &&
    lineText(HEAP_SRC, frame.line).trim().startsWith("raise");
  const ks = input.arr.map((_, n) => n + 1);
  const shown = vars.result ?? vars.returned ?? [];
  const printed = vars.stdout[0];
  const resultCaption =
    printed !== undefined
      ? `stdout: ${printed.length > 92 ? `${printed.slice(0, 91)}…` : printed}`
      : "return [heap.top() for _ in range(k)]";

  return (
    <g>
      {chart(args)}
      {caption("k", Vec2(RIGHT, 24))}
      <g transform={translate(RIGHT, 34)}>
        {pickerTrack(ks, input.k, 18, (at) => (
          <g
            id="k-knob"
            transform={translate(at)}
            dragologyZIndex={draggedId === "k-knob" ? "/1" : 1}
            dragologyOnDrag={() =>
              d.closest(ks.map((k) => withInput({ ...input, k }))).withFloating()
            }
            style={{ cursor: "grab" }}
          >
            {pickerKnob(String(input.k), 18)}
          </g>
        ))}
      </g>
      {caption("heap.top() evicts", Vec2(RIGHT, 96))}
      <g transform={translate(RIGHT, 106)}>
        {box(cellW, CELL_H, { fill: "none", stroke: color.rule, dash: "4 3" })}
      </g>
      {caption("the heap, as a tree", Vec2(30, 192))}
      <g transform={translate(RIGHT, 192)}>{stackColumn(callLines(frame))}</g>
      {caption("heap._elements", Vec2(30, 410))}
      {optional(
        "heap",
        vars.heap !== null && heapPicture(vars.heap, vars.stack, geo, look),
      )}
      {caption(resultCaption, Vec2(30, RESULT_TOP - 12), {
        fill: printed !== undefined ? color.done : color.muted,
      })}
      {shown.map((pair, n) => {
        const at = Vec2(30 + n * (cellW + 4), RESULT_TOP);
        return (
          <g
            id={uid("k", "a", look.key(pair))}
            dragologyZIndex={2}
            transform={translate(at)}
          >
            {elementChip(pair, look, cellW, CELL_H, done)}
          </g>
        );
      })}
      {optional(
        "exception",
        raising && <g transform={translate(30, 548)}>{exceptionBanner(frame.note)}</g>,
      )}
    </g>
  );
}

export const kLargestViz = defineViz<Input, Vars>({
  id: "ds-k-largest-elements",
  title: "The k largest elements",
  book: "Grokking Data Structures",
  chapter: "10 · Priority queues and heaps",
  summary:
    "Keep the k largest values seen so far in a heap whose priority is -value, so the smallest kept value sits at the root. Each new value only has to beat that root to get in.",
  drags: [
    "a bar up or down to change that value in arr",
    "the purple k chip to keep more or fewer values",
  ],
  sources: [SRC, HEAP_SRC],
  initialInput: INITIAL_INPUT,
  run,
  draw,
  diagramHeight: 650,
});
