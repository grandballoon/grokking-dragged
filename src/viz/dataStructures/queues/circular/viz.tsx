import { rotateDeg, translate, Vec2, type Svgx } from "dragology";
import { lineOf, lineText } from "../../../../core/pythonSource";
import { arrow, box, caption, label, uid } from "../../../../ui/svg";
import { color } from "../../../../ui/theme";
import { defineViz, type DrawArgs } from "../../../defineViz";
import { tag } from "../../kit/tag";
import { opScript } from "../../opScript";
import {
  exceptionBanner,
  field,
  opOutcomes,
  pickerKnob,
  pickerTrack,
  type FieldStyle,
} from "../parts";
import {
  INITIAL_INPUT,
  run,
  SRC,
  type Input,
  type QueueFields,
  type Vars,
} from "./trace";

const SIZES = [2, 3, 4, 5, 6, 7, 8] as const;
const CHIP_W = 150;

/** The ring: centre, radius of the slot centres, and slot size. */
const C = Vec2(475, 180);
const R = 100;
const SLOT_W = 44;
const SLOT_H = 40;

/** The `_data` row under the ring. */
const ROW = Vec2(300, 384);
const CELL_W = 46;
const CELL_H = 36;
const CELL_STEP = 52;

const line = (snippet: string) => lineOf(SRC, snippet);

/** The slot the current line writes or reads, if any. */
function focusSlot(q: QueueFields, at: number): number | null {
  const n = q._max_size;
  if (at === line("self._data[self._rear] = value")) return q._rear;
  if (at === line("self._rear = (self._rear + 1) % self._max_size"))
    return (q._rear - 1 + n) % n;
  if (at === line("value = self._data[self._front]")) return q._front;
  if (at === line("self._front = (self._front + 1) % self._max_size"))
    return (q._front - 1 + n) % n;
  return null;
}

/** The field the current line assigns, if any. */
function changedField(at: number): string | null {
  if (at === line("self._rear = (self._rear + 1) % self._max_size")) return "_rear";
  if (at === line("self._front = (self._front + 1) % self._max_size")) return "_front";
  if (at === line("self._size += 1") || at === line("self._size -= 1")) return "_size";
  if (at === line("value = self._data[self._front]")) return "value";
  return null;
}

type SlotStyle = { fill: string; stroke: string; text: string };

function slotStyle(q: QueueFields, i: number, focus: number | null): SlotStyle {
  const n = q._max_size;
  const live = (i - q._front + n) % n < q._size;
  if (i === focus)
    return { fill: color.currentFill, stroke: color.current, text: color.ink };
  if (live) return { fill: color.pendingFill, stroke: color.pending, text: color.ink };
  if (q._data[i] !== null)
    return { fill: color.visitedFill, stroke: color.visited, text: color.muted };
  return { fill: color.cellEmpty, stroke: color.rule, text: color.faint };
}

/** A slot's contents: the value (or a faint None) and its index below. */
function slotFace(value: number | null, i: number, w: number, h: number, ink: string) {
  return (
    <g>
      {label(value === null ? "None" : String(value), Vec2(w / 2, h / 2 - 5), {
        size: value === null ? 10 : 15,
        mono: true,
        fill: ink,
        weight: value === null ? undefined : 600,
      })}
      {label(String(i), Vec2(w / 2, h - 8), { size: 9, mono: true, fill: color.faint })}
    </g>
  );
}

/** Distance from a slot's centre to its edge along the ray at `deg` from vertical. */
function edgeDistance(deg: number): number {
  const a = (deg * Math.PI) / 180;
  const sx = Math.abs(Math.sin(a));
  const cy = Math.abs(Math.cos(a));
  return Math.min(
    sx < 1e-9 ? Infinity : SLOT_W / 2 / sx,
    cy < 1e-9 ? Infinity : SLOT_H / 2 / cy,
  );
}

/**
 * A pointer orbiting the ring at slot `index`: a tag at `radius` from the
 * centre, kept upright, with an arrow to the slot's edge.
 */
function ringPointer(name: string, index: number, n: number, outside: boolean): Svgx {
  const deg = (index * 360) / n;
  const edge = edgeDistance(deg) + 3;
  const tagR = outside ? R + 60 : R - 58;
  const from = outside ? R + 46 : R - 44;
  const to = outside ? R + edge : R - edge;
  return (
    <g id={uid("ring", name)} transform={translate(C) + rotateDeg(deg)}>
      {arrow(Vec2(0, -from), Vec2(0, -to), { stroke: color.pointer, head: 7 })}
      <g transform={translate(0, -tagR) + rotateDeg(-deg)}>{tag(name)}</g>
    </g>
  );
}

function ring(q: QueueFields, focus: number | null): Svgx {
  const n = q._max_size;
  return (
    <g>
      {caption("_data as a ring", Vec2(290, 22))}
      <circle
        transform={translate(C)}
        r={R}
        fill="none"
        stroke={color.rule}
        strokeWidth={1.5}
        strokeDasharray="3 5"
      />
      {q._data.map((value, i) => {
        const deg = (i * 360) / n;
        const style = slotStyle(q, i, focus);
        return (
          <g
            id={uid("ring-slot", i)}
            transform={
              translate(C) +
              rotateDeg(deg) +
              translate(0, -R) +
              rotateDeg(-deg) +
              translate(-SLOT_W / 2, -SLOT_H / 2)
            }
          >
            {box(SLOT_W, SLOT_H, { fill: style.fill, stroke: style.stroke })}
            {slotFace(value, i, SLOT_W, SLOT_H, style.text)}
          </g>
        );
      })}
      {ringPointer("_front", q._front, n, true)}
      {ringPointer("_rear", q._rear, n, false)}
    </g>
  );
}

function dataRow(q: QueueFields, focus: number | null): Svgx {
  const centre = (i: number) => ROW.x + i * CELL_STEP + CELL_W / 2;
  return (
    <g>
      {caption("_data", Vec2(ROW.x, ROW.y - 12))}
      {q._data.map((value, i) => {
        const style = slotStyle(q, i, focus);
        return (
          <g id={uid("row-slot", i)} transform={translate(ROW.x + i * CELL_STEP, ROW.y)}>
            {box(CELL_W, CELL_H, { fill: style.fill, stroke: style.stroke })}
            {slotFace(value, i, CELL_W, CELL_H, style.text)}
          </g>
        );
      })}
      <g id="row-front" transform={translate(centre(q._front), ROW.y + CELL_H + 14)}>
        {tag("_front")}
      </g>
      <g id="row-rear" transform={translate(centre(q._rear), ROW.y + CELL_H + 36)}>
        {tag("_rear")}
      </g>
    </g>
  );
}

function fields(q: QueueFields | null, value: number | null, at: number): Svgx {
  const changed = changedField(at);
  const style = (name: string): FieldStyle =>
    name === changed ? { fill: color.currentFill, stroke: color.current } : {};
  const rows: [string, string | null][] =
    q === null
      ? []
      : [
          ["_front", String(q._front)],
          ["_rear", String(q._rear)],
          ["_size", String(q._size)],
          ["_max_size", String(q._max_size)],
        ];
  rows.push(["value", value === null ? null : String(value)]);
  return (
    <g transform={translate(676, 20)}>
      {rows.map(([name, text], i) => (
        <g transform={translate(0, i * 50)}>{field(name, text, 70, style(name))}</g>
      ))}
    </g>
  );
}

function draw({
  frame,
  input,
  d,
  draggedId,
  setState,
  withInput,
}: DrawArgs<Input, Vars>): Svgx {
  const { vars } = frame;
  const q = vars.queue;
  const focus = q === null ? null : focusSlot(q, frame.line);
  const raising = lineText(SRC, frame.line).trim().startsWith("raise");

  return (
    <g>
      <g transform={translate(20, 20)}>
        {opScript({
          ops: input.ops,
          current: vars.op,
          d,
          draggedId,
          setState,
          withOps: (ops) => withInput({ ...input, ops }),
          width: CHIP_W,
          argRange: [0, 99],
        })}
        {opOutcomes(input.ops, vars.outcomes, CHIP_W)}
      </g>
      <g transform={translate(20, 430)}>
        {caption("Queue(max_size)", Vec2(0, 0))}
        <g transform={translate(0, 14)}>
          {pickerTrack(SIZES, input.max_size, 26, (at) => (
            <g
              id="max-size-knob"
              transform={translate(at)}
              dragologyZIndex={draggedId === "max-size-knob" ? "/1" : 1}
              dragologyOnDrag={() =>
                d
                  .closest(
                    SIZES.map((max_size) =>
                      withInput({
                        ...input,
                        max_size,
                      }),
                    ),
                  )
                  .withFloating()
              }
              style={{ cursor: "grab" }}
            >
              {pickerKnob(String(input.max_size), 26)}
            </g>
          ))}
        </g>
      </g>
      {q !== null && ring(q, focus)}
      {q !== null && dataRow(q, focus)}
      {fields(q, vars.value, frame.line)}
      {raising && <g transform={translate(300, 482)}>{exceptionBanner(frame.note)}</g>}
    </g>
  );
}

export const circularQueueViz = defineViz<Input, Vars>({
  id: "ds-queue-circular",
  title: "Queue on a circular array",
  book: "Grokking Data Structures",
  chapter: "9 · Queues",
  summary:
    "A queue in a fixed-size array. _front and _rear chase each other around the slots and wrap back to the start with % max_size, so no value ever has to move.",
  drags: [
    "an operation chip to reorder the script, or − and + to change a value",
    "the purple max_size chip to give the queue more or fewer slots",
  ],
  sources: [SRC],
  initialInput: INITIAL_INPUT,
  run,
  draw,
});
