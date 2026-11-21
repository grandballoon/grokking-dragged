import { translate, Vec2, type Svgx } from "dragology";
import { box, caption, label, optional } from "../../../../ui/svg";
import { color } from "../../../../ui/theme";
import { defineViz, type DrawArgs } from "../../../defineViz";
import { ARRAY_CORE } from "../../sources";
import {
  capacityRange,
  geometry,
  isStored,
  LAYOUT,
  outcome,
  pendingValue,
  pointers,
  scriptColumn,
  sizeMarker,
  slotRow,
  valueIds,
  type Pointer,
  type SlotRole,
} from "../arraySlots";
import type { ArrayData } from "../coreArray";
import { INITIAL_INPUT, run, SRC, type Input, type Vars } from "./trace";

const ROW_A_Y = LAYOUT.rowY;
/** The second row, for the array a resize is building. */
const ROW_B_Y = 280;
const OUTCOME_Y = 400;
const SLIDER_Y = 456;
const MAX_INITIAL = 4;
const TICK = 26;
const TICK_PITCH = 32;
/** Left of the first tick, clear of the slider's caption. */
const SLIDER_X = 470;

/**
 * Which array goes in which row. Normally `self._array` sits alone in the
 * top row. During a resize, the top row holds `old_array` and the bottom row
 * the new array: first while core.py builds it, then as `self._array`.
 */
type Rows = {
  readonly top: ArrayData;
  readonly bottom: ArrayData | null;
  /** Whether `self._array` is the bottom row's array. */
  readonly selfInBottom: boolean;
};

function rows(v: Vars): Rows {
  const moved = v.old_array !== null && v.old_array._id !== v._array._id;
  return {
    top: v.old_array ?? v._array,
    bottom: v.allocating ?? (moved ? v._array : null),
    selfInBottom: moved,
  };
}

function topCaption(v: Vars, r: Rows): string {
  const fields = `_capacity = ${v._capacity}`;
  if (v.old_array === null) return `self._array   ${fields}`;
  return r.selfInBottom ? "old_array" : `self._array, old_array   ${fields}`;
}

function bottomCaption(v: Vars): string {
  return v.allocating !== null
    ? `core.Array(${v.allocating._size}), being allocated`
    : `self._array   _capacity = ${v._capacity}`;
}

/** Roles in the row that holds `self._array` outside a copy loop. */
function selfRole(v: Vars, i: number): SlotRole {
  if (i === v.slot) {
    return v.returned !== null && v.returned.text !== "None" ? "found" : "current";
  }
  return i < v._size ? "used" : "unused";
}

/** Roles in `old_array` during a resize: the slot being copied is current. */
function oldRole(v: Vars, i: number): SlotRole {
  if (i === v.i) return "current";
  return i < v._size ? "used" : "unused";
}

/** Roles in the new array during a resize: only copied slots are in use. */
function newRole(v: Vars, i: number): SlotRole {
  if (v.allocating !== null) return "unused";
  if (i === v.i) return "current";
  return v.i !== null && i < v.i ? "used" : "unused";
}

function indexPointers(v: Vars): Pointer[] {
  const named: [string, number | null, string][] = [
    ["index", v.index, color.muted],
    ["i", v.i, color.current],
  ];
  return named.flatMap(([name, index, stroke]) =>
    index === null ? [] : [{ name, index, stroke }],
  );
}

function draw({
  frame,
  frames,
  input,
  d,
  draggedId,
  setState,
  withInput,
}: DrawArgs<Input, Vars>): Svgx {
  const v = frame.vars;
  const r = rows(v);
  const widest = Math.max(
    ...frames.map((f) => Math.max(f.vars._capacity, f.vars.allocating?._size ?? 0)),
  );
  const geo = geometry(widest);
  const top = Vec2(LAYOUT.arrayX, ROW_A_Y);
  const bottom = Vec2(LAYOUT.arrayX, ROW_B_Y);
  const shown = r.bottom === null ? [r.top] : [r.top, r.bottom];
  const [topIds, bottomIds] = valueIds(shown);
  const op = v.op === null ? null : input.ops[v.op]!;
  const resizing = v.old_array !== null;
  const ptrs = indexPointers(v);

  const slider = (
    <g>
      {caption("DynamicArray(initial_capacity)", Vec2(LAYOUT.outcomeX, SLIDER_Y))}
      {capacityRange(1, MAX_INITIAL).map((n) => (
        <g transform={translate(SLIDER_X + (n - 1) * TICK_PITCH, SLIDER_Y - TICK / 2)}>
          {box(TICK, TICK, { fill: color.cellEmpty, stroke: color.rule, radius: 5 })}
          {label(String(n), Vec2(TICK / 2, TICK / 2), {
            size: 12,
            mono: true,
            fill: color.muted,
          })}
        </g>
      ))}
      <g
        id="initial-capacity-handle"
        dragologyZIndex={draggedId === "initial-capacity-handle" ? "/1" : 2}
        transform={translate(
          SLIDER_X + (input.initial_capacity - 1) * TICK_PITCH,
          SLIDER_Y - TICK / 2,
        )}
        dragologyOnDrag={() =>
          d
            .closest(
              capacityRange(1, MAX_INITIAL).map((initial_capacity) =>
                withInput({ ...input, initial_capacity }),
              ),
            )
            .withFloating()
        }
        style={{ cursor: "ew-resize" }}
      >
        {box(TICK, TICK, { fill: color.pointer, stroke: color.pointer, radius: 5 })}
        {label(String(input.initial_capacity), Vec2(TICK / 2, TICK / 2), {
          size: 12,
          mono: true,
          weight: 600,
          fill: "white",
        })}
      </g>
    </g>
  );

  return (
    <g>
      {scriptColumn({
        ops: input.ops,
        current: v.op,
        d,
        draggedId,
        setState,
        withOps: (ops) => withInput({ ...input, ops }),
      })}
      {caption(topCaption(v, r), Vec2(LAYOUT.arrayX, LAYOUT.captionY))}
      {optional(
        "pending",
        v.value !== null &&
          op !== null &&
          !isStored(shown, op.id) &&
          pendingValue(LAYOUT.pendingAt, "value", v.value, "pending", op.id),
      )}
      {optional(
        "target",
        v.target !== null &&
          pendingValue(LAYOUT.pendingAt, "target", v.target, "target", null),
      )}
      {slotRow({
        array: r.top,
        ids: topIds!,
        at: top,
        geo,
        role: (i) => (resizing ? oldRole(v, i) : selfRole(v, i)),
      })}
      {optional(
        "bottom-row",
        r.bottom !== null && (
          <g>
            {caption(
              bottomCaption(v),
              Vec2(LAYOUT.arrayX, ROW_B_Y - (ROW_A_Y - LAYOUT.captionY)),
            )}
            {slotRow({
              array: r.bottom,
              ids: bottomIds!,
              at: bottom,
              geo,
              role: (i) => newRole(v, i),
            })}
          </g>
        ),
      )}
      {sizeMarker(r.selfInBottom ? bottom : top, geo, v._size)}
      {pointers("top", top, geo, ptrs)}
      {optional(
        "bottom-pointers",
        resizing && r.bottom !== null && pointers("bottom", bottom, geo, ptrs),
      )}
      {optional(
        "outcome",
        outcome(
          Vec2(LAYOUT.outcomeX, OUTCOME_Y),
          LAYOUT.outcomeWidth,
          op?.args ?? [],
          v.returned,
          v.error,
        ),
      )}
      {slider}
    </g>
  );
}

export const dynamicArrayViz = defineViz<Input, Vars>({
  id: "ds-dynamic-array",
  title: "Dynamic array",
  book: "Grokking Data Structures",
  chapter: "5 · Dynamic arrays",
  summary:
    "A dynamic array grows by copying everything into a static array twice the size when it fills up, and shrinks to half the size once it is three quarters empty, so inserts and deletes stay cheap on average.",
  drags: [
    "the timeline knob to step through the script",
    "a call in the script to reorder it, or − and + to change its argument",
    "the purple box to start from another initial_capacity",
  ],
  sources: [SRC, ARRAY_CORE],
  initialInput: INITIAL_INPUT,
  run,
  draw,
  diagramHeight: 490,
});
