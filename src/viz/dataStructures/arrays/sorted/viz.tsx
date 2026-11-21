import { Vec2, type Svgx } from "dragology";
import { caption, optional } from "../../../../ui/svg";
import { color } from "../../../../ui/theme";
import { defineViz, type DrawArgs } from "../../../defineViz";
import { ARRAY_CORE } from "../../sources";
import {
  capacityHandle,
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
import { INITIAL_INPUT, run, SRC, type Input, type Vars } from "./trace";

const MAX_SIZE = 8;
const geo = geometry(MAX_SIZE);

/** The index variables in scope, as pointers under their slots. */
function indexPointers(v: Vars): Pointer[] {
  const named: [string, number | null, string][] = [
    ["left", v.left, color.ink],
    ["mid_index", v.mid_index, color.current],
    ["right", v.right, color.ink],
    ["index", v.index, color.muted],
    ["i", v.i, color.current],
  ];
  return named.flatMap(([name, index, stroke]) =>
    index === null ? [] : [{ name, index, stroke }],
  );
}

function slotRole(v: Vars, i: number): SlotRole {
  if (i === v.slot) {
    return v.returned !== null && v.returned.text !== "None" ? "found" : "current";
  }
  if (i >= v._size) return "unused";
  const searching = v.left !== null && v.right !== null;
  if (searching && (i < v.left! || i > v.right!)) return "discarded";
  return "used";
}

function draw({
  frame,
  input,
  d,
  draggedId,
  setState,
  withInput,
}: DrawArgs<Input, Vars>): Svgx {
  const v = frame.vars;
  const at = Vec2(LAYOUT.arrayX, LAYOUT.rowY);
  const [ids] = valueIds([v._array]);
  const op = v.op === null ? null : input.ops[v.op]!;

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
      {caption(
        `self._array   _max_size = ${input.max_size}`,
        Vec2(LAYOUT.arrayX, LAYOUT.captionY),
      )}
      {optional(
        "pending",
        v.value !== null &&
          op !== null &&
          !isStored([v._array], op.id) &&
          pendingValue(LAYOUT.pendingAt, "value", v.value, "pending", op.id),
      )}
      {optional(
        "target",
        v.target !== null &&
          pendingValue(LAYOUT.pendingAt, "target", v.target, "target", null),
      )}
      {slotRow({ array: v._array, ids: ids!, at, geo, role: (i) => slotRole(v, i) })}
      {sizeMarker(at, geo, v._size)}
      {capacityHandle(at, geo, input.max_size, draggedId === "capacity-handle", () =>
        d
          .closest(
            capacityRange(1, MAX_SIZE).map((max_size) =>
              withInput({ ...input, max_size }),
            ),
          )
          .withFloating(),
      )}
      {pointers("row", at, geo, indexPointers(v))}
      {optional(
        "outcome",
        outcome(
          Vec2(LAYOUT.outcomeX, LAYOUT.outcomeY),
          LAYOUT.outcomeWidth,
          op?.args ?? [],
          v.returned,
          v.error,
        ),
      )}
    </g>
  );
}

export const sortedArrayViz = defineViz<Input, Vars>({
  id: "ds-sorted-array",
  title: "Sorted array",
  book: "Grokking Data Structures",
  chapter: "3 · Sorted arrays",
  summary:
    "Keeping an array sorted makes insert and delete shift elements, but lets linear search stop early and binary search halve the range at every step.",
  drags: [
    "the timeline knob to step through the script",
    "a call in the script to reorder it, or − and + to change its argument",
    "the purple handle at the end of the array to change max_size",
  ],
  sources: [SRC, ARRAY_CORE],
  initialInput: INITIAL_INPUT,
  run,
  draw,
  diagramHeight: 450,
});
