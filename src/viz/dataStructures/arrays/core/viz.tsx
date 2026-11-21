import { translate, Vec2, type Svgx } from "dragology";
import { box, caption, label, optional, uid } from "../../../../ui/svg";
import { color } from "../../../../ui/theme";
import { defineViz, type DrawArgs } from "../../../defineViz";
import { opText, withArg } from "../../opScript";
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
  slotRow,
  valueIds,
  type SlotRole,
} from "../arraySlots";
import { INITIAL_INPUT, run, SRC, type Input, type Vars } from "./trace";

const MAX_SIZE = 8;
/** The index pointer can be dragged one slot past either end. */
const INDEX_RANGE: readonly [number, number] = [-1, MAX_SIZE];
const VALUE_RANGE: readonly [number, number] = [-99, 99];
const geo = geometry(MAX_SIZE);
const STATEMENT_Y = 236;

function draw({
  frame,
  input,
  d,
  draggedId,
  setState,
  withInput,
}: DrawArgs<Input, Vars>): Svgx {
  const v = frame.vars;
  const self = v.self;
  const at = Vec2(LAYOUT.arrayX, LAYOUT.rowY);
  const [ids] = valueIds([self]);
  const opIndex = v.op;
  const op = opIndex === null ? null : input.ops[opIndex]!;
  const role = (i: number): SlotRole =>
    i === v.index && v.error === null ? (v.returned ? "found" : "current") : "used";

  const statement = op === null ? null : opText(op);

  return (
    <g>
      {scriptColumn({
        ops: input.ops,
        current: v.op,
        d,
        draggedId,
        setState,
        withOps: (ops) => withInput({ ...input, ops }),
        // `a[index] = val`: the index, then the value.
        argRange: [INDEX_RANGE, VALUE_RANGE],
      })}
      {caption(
        `self._array   typecode 'l'   self._size = ${self._size}`,
        Vec2(LAYOUT.arrayX, LAYOUT.captionY),
      )}
      {optional(
        "pending",
        v.val !== null &&
          op !== null &&
          !isStored([self], op.id) &&
          pendingValue(LAYOUT.pendingAt, "val", v.val, "pending", op.id),
      )}
      {optional(
        "reserved",
        self._array.length < self._size && (
          <g>
            {Array.from({ length: self._size }, (_, i) => (
              <g
                id={uid("reserved", i)}
                transform={translate(at.x + i * geo.pitch, at.y)}
              >
                {box(geo.w, geo.h, {
                  fill: "none",
                  stroke: color.cellBorder,
                  dash: "4 3",
                  radius: 5,
                })}
              </g>
            ))}
          </g>
        ),
      )}
      {slotRow({ array: self, ids: ids!, at, geo, role })}
      {capacityHandle(at, geo, input.size, draggedId === "capacity-handle", () =>
        d
          .closest(
            capacityRange(1, MAX_SIZE).map((size) => withInput({ ...input, size })),
          )
          .withFloating(),
      )}
      {optional(
        "index",
        v.index !== null &&
          opIndex !== null &&
          pointers(
            "row",
            at,
            geo,
            [
              {
                name: "index",
                index: v.index,
                stroke:
                  v.error !== null ? color.bad : v.returned ? color.done : color.current,
                onDrag: () =>
                  d
                    .closest(
                      capacityRange(...INDEX_RANGE).map((index) =>
                        withInput({
                          ...input,
                          ops: withArg(input.ops, opIndex, 0, index),
                        }),
                      ),
                    )
                    .withFloating(),
              },
            ],
            draggedId,
          ),
      )}
      {optional(
        "statement",
        statement !== null && (
          <g>
            {caption("statement", Vec2(LAYOUT.outcomeX, STATEMENT_Y - 24))}
            {label(statement, Vec2(LAYOUT.outcomeX, STATEMENT_Y), {
              size: 15,
              mono: true,
              anchor: "start",
              weight: 600,
            })}
          </g>
        ),
      )}
      {optional(
        "outcome",
        outcome(
          Vec2(LAYOUT.outcomeX, 264),
          LAYOUT.outcomeWidth,
          op?.args ?? [],
          v.returned,
          v.error,
        ),
      )}
    </g>
  );
}

export const staticArrayViz = defineViz<Input, Vars>({
  id: "ds-static-array",
  title: "Static array",
  book: "Grokking Data Structures",
  chapter: "2 · Static arrays",
  summary:
    "A fixed-size array of numbers: all its slots are allocated and filled with 0 up front, any slot can be read or written in one step, and an index outside 0..size-1 raises IndexError.",
  drags: [
    "the timeline knob to step through the script",
    "a call in the script to reorder it, or its − and + to change its index or the value stored",
    "the index arrow to another slot, or off either end",
    "the purple handle at the end of the array to change its size",
  ],
  sources: [SRC],
  initialInput: INITIAL_INPUT,
  run,
  draw,
  diagramHeight: 320,
});
