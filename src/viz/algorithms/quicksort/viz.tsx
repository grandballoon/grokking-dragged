import { translate, Vec2, type Svgx } from "dragology";
import { pyRepr } from "../../../core/python";
import { box, caption, label, uid } from "../../../ui/svg";
import { color } from "../../../ui/theme";
import { defineViz, type DrawArgs } from "../../defineViz";
import { arrayEditor } from "../kit/arrayEditor";
import { arrInput, type ArrInput } from "../kit/arrayEdits";
import { CURRENT, DONE, PENDING, type Paint } from "../kit/paint";
import { stdoutPanel } from "../kit/stdout";
import { centerSlot, placeCalls, type Place } from "./layout";
import { BOOK_ARRAY, run, SRC, type Call, type Vars } from "./trace";

const INPUT = { at: Vec2(80, 92), pitch: 40, cellW: 34, cellH: 28 };
const VALUE_RANGE = [0, 19] as const;
const MAX_LEN = 6;
const POOL = [7, 3, 14, 8, 1, 12];
const CENTER_X = 380;
const MAX_SLOT = 720 / MAX_LEN;
const TREE_TOP = INPUT.at.y + INPUT.cellH + 34;
const LEVEL = 52;
const NODE_H = 34;
const CELL_H = 26;
const EMPTY_W = 30;
const OUT_Y = TREE_TOP + (MAX_LEN - 1) * LEVEL + NODE_H + 12;

type Geometry = { readonly slot: number; readonly x0: number };

function geometry(n: number): Geometry {
  const slot = Math.min(MAX_SLOT, 720 / Math.max(1, n));
  return { slot, x0: CENTER_X - (n * slot) / 2 };
}

type Status = "current" | "waiting" | "returned";

const STATUS_PAINT: Record<Status, Paint> = {
  current: CURRENT,
  waiting: PENDING,
  returned: DONE,
};

/** One call's box: its array, or its sorted result once it has returned. */
function node(call: Call, place: Place, status: Status, g: Geometry): Svgx {
  const y = TREE_TOP + place.depth * LEVEL;
  const colors = STATUS_PAINT[status];
  const values = call.returns ?? call.array;
  if (values.length === 0) {
    const cx = g.x0 + centerSlot(place) * g.slot;
    return (
      <g id={uid("node", call.uid)} transform={translate(cx - EMPTY_W / 2, y)}>
        {box(EMPTY_W, NODE_H, { ...colors, radius: 6 })}
        {label("[]", Vec2(EMPTY_W / 2, NODE_H / 2), {
          size: 12,
          mono: true,
          fill: color.muted,
        })}
      </g>
    );
  }
  const left = g.x0 + place.lo * g.slot + 3;
  const cellW = Math.min(40, g.slot - 10);
  const showPivot = call.pivot !== null && call.returns === null;
  return (
    <g id={uid("node", call.uid)} transform={translate(left, y)}>
      {box((place.hi - place.lo) * g.slot - 6, NODE_H, { ...colors, radius: 7 })}
      {values.map((value, i) => {
        const pivot = showPivot && i === 0;
        return (
          <g
            id={uid("node", call.uid, "item", i)}
            transform={translate(
              (i + 0.5) * g.slot - 3 - cellW / 2,
              (NODE_H - CELL_H) / 2,
            )}
          >
            {box(cellW, CELL_H, {
              fill: color.panel,
              stroke: pivot
                ? color.pointer
                : call.returns
                  ? color.done
                  : color.cellBorder,
              strokeWidth: pivot ? 2.5 : 1.5,
              radius: 5,
            })}
            {label(String(value), Vec2(cellW / 2, CELL_H / 2), {
              size: 13,
              mono: true,
              weight: pivot ? 700 : undefined,
              fill: pivot ? color.pointer : color.ink,
            })}
          </g>
        );
      })}
    </g>
  );
}

function draw({
  frame,
  frames,
  input,
  d,
  draggedId,
  withInput,
}: DrawArgs<ArrInput, Vars>): Svgx {
  const { stack, finished, stdout } = frame.vars;
  // Lay out the whole tree from the last frame, so nothing moves as it grows.
  const places = placeCalls(frames.at(-1)!.vars.finished);
  const g = geometry(input.arr.length);
  const calls: [Call, Status][] = [
    ...finished.map((c): [Call, Status] => [c, "returned"]),
    ...stack.map((c, i): [Call, Status] => [
      c,
      i === stack.length - 1 ? "current" : "waiting",
    ]),
  ];

  const edges = calls
    .filter(([c]) => c.uid.length > 1)
    .map(([c]) => {
      const place = places.get(c.uid)!;
      const x = g.x0 + centerSlot(place) * g.slot;
      const y = TREE_TOP + place.depth * LEVEL;
      return (
        <line
          id={uid("edge", c.uid)}
          x1={x}
          x2={x}
          y1={y - (LEVEL - NODE_H)}
          y2={y}
          stroke={color.faint}
          strokeWidth={1.5}
        />
      );
    });

  return (
    <g>
      {caption(`print(quicksort(${pyRepr(input.arr)}))`, Vec2(20, 14), {
        fill: color.ink,
      })}
      {arrayEditor({
        ...INPUT,
        list: input,
        name: "array",
        idPrefix: "qs-in",
        bars: { unit: 3, range: VALUE_RANGE },
        reorder: true,
        length: { range: [0, MAX_LEN], fill: (a) => POOL[a.length % POOL.length]! },
        d,
        draggedId,
        toState: withInput,
      })}
      {caption(
        "calls: each covers the positions its elements end up in; pivot in purple",
        Vec2(20, TREE_TOP - 16),
      )}
      {edges}
      {calls.map(([c, status]) => node(c, places.get(c.uid)!, status, g))}
      {stdoutPanel(stdout, Vec2(20, OUT_Y + 14), 720, 28)}
    </g>
  );
}

export const quicksortViz = defineViz<ArrInput, Vars>({
  id: "quicksort",
  title: "Quicksort",
  book: "Grokking Algorithms",
  chapter: "4 · Quicksort",
  summary:
    "Pick the first element as the pivot, split the rest into the elements no bigger and the elements bigger than it, sort each part the same way, and glue them together around the pivot. Each call is drawn over the positions its elements end up in.",
  drags: [
    "the timeline knob to step through the calls",
    "a purple dot up or down to change a value and reshape the recursion",
    "a cell sideways to reorder the array",
    "the purple ] to sort a shorter or longer array",
  ],
  sources: [SRC],
  initialInput: arrInput(BOOK_ARRAY),
  run: (input) => run(input.arr),
  draw,
  diagramHeight: OUT_Y + 66,
});
