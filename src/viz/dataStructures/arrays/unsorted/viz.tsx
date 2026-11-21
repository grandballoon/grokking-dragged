import { Vec2, type Svgx } from "dragology";
import { caption, cell, optional, uid } from "../../../../ui/svg";
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
  type SlotRole,
} from "../arraySlots";
import { INITIAL_INPUT, run, SRC, type Input, type Vars } from "./trace";

const MAX_SIZE = 8;
const geo = geometry(MAX_SIZE);

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
  const found = v.returned !== null && v.returned.text !== "None";
  const role = (i: number): SlotRole =>
    i === v.slot ? (found ? "found" : "current") : i < v._size ? "used" : "unused";

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
        v.new_entry !== null &&
          op !== null &&
          !isStored([v._array], op.id) &&
          pendingValue(LAYOUT.pendingAt, "new_entry", v.new_entry, "pending", op.id),
      )}
      {optional(
        "target",
        v.target !== null &&
          pendingValue(LAYOUT.pendingAt, "target", v.target, "target", null),
      )}
      {slotRow({ array: v._array, ids: ids!, at, geo, role })}
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
      {optional(
        "index",
        v.index !== null &&
          pointers("row", at, geo, [
            {
              name: "index",
              index: v.index,
              stroke: v.error !== null ? color.bad : color.current,
            },
          ]),
      )}
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
      {caption("stdout", Vec2(LAYOUT.outcomeX, 296))}
      {v.stdout.map((line, k) => (
        <g dragologyKey={uid("stdout", k)}>
          {cell(Vec2(LAYOUT.outcomeX + k * 50, 310), 44, 26, {
            id: uid("stdout", k),
            text: line,
            radius: 5,
            textOptions: { size: 12 },
          })}
        </g>
      ))}
    </g>
  );
}

export const unsortedArrayViz = defineViz<Input, Vars>({
  id: "ds-unsorted-array",
  title: "Unsorted array",
  book: "Grokking Data Structures",
  chapter: "2 · Static arrays",
  summary:
    "An unsorted array on top of a fixed-size core Array. Insert appends in one step, delete fills the hole with the last element, and find has to scan every element.",
  drags: [
    "the timeline knob to step through the script",
    "a call in the script to reorder it, or − and + to change its argument",
    "the purple handle at the end of the array to change max_size",
  ],
  sources: [SRC, ARRAY_CORE],
  initialInput: INITIAL_INPUT,
  run,
  draw,
  diagramHeight: 420,
});
