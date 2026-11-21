import { Vec2, type Svgx } from "dragology";
import { arrow, caption, cell, label, uid } from "../../../../ui/svg";
import { color } from "../../../../ui/theme";
import { defineViz, type DrawArgs } from "../../../defineViz";
import type { Call } from "../../opScript";
import { band, DIAGRAM_HEIGHT, PALETTE_CENTER } from "../shared/band";
import { addOpState, canAddOp, nextValue, type ScriptInput } from "../shared/edits";
import { legend } from "../shared/listViz";
import { NODE_H, ROW_LEFT, ROW_Y, STYLE } from "../shared/linkedRow";
import { INITIAL_INPUT, run, SRC, type ArrayStackVars } from "./trace";

const PREFIX = "astack";
const CELL_W = 56;
const PITCH = 60;

const slotId = (i: number) => uid(PREFIX, "slot", i);

function draw(args: DrawArgs<ScriptInput, ArrayStackVars>): Svgx {
  const { frame, input, state, d, draggedId } = args;
  const { vars } = frame;
  const items = vars.obj._data;
  const top = items.length - 1;
  const canAdd = canAddOp(input.ops);
  const add = (call: Call) => addOpState(input, vars.op, call, args.trace);
  const innermost = vars.stack.at(-1)?.fn;
  const taking = vars.found === null && (innermost === "pop" || innermost === "peek");

  const cells = items.map((value, i) => {
    const style =
      vars.found === String(i)
        ? STYLE.done
        : taking && i === top
          ? STYLE.current
          : STYLE.plain;
    const id = slotId(i);
    const pop = i === top && canAdd;
    return cell(Vec2(ROW_LEFT + i * PITCH, ROW_Y), CELL_W, NODE_H, {
      id,
      text: String(value),
      ...style,
      zIndex: draggedId === id ? "/1" : 1,
      onDrag: pop
        ? () =>
            d
              .closest([state])
              .whenFar(add(["pop"]), { gap: 40 })
              .withFloating()
        : undefined,
    });
  });

  const indexes = items.map((_, i) =>
    label(String(i), Vec2(ROW_LEFT + i * PITCH + CELL_W / 2, ROW_Y + NODE_H + 14), {
      id: uid(PREFIX, "index", i),
      size: 11,
      mono: true,
      fill: color.muted,
    }),
  );

  const topX = ROW_LEFT + top * PITCH + CELL_W / 2;
  const topMarker = items.length > 0 && (
    <g id={uid(PREFIX, "top")}>
      {arrow(Vec2(topX, ROW_Y - 13), Vec2(topX, ROW_Y - 1), {
        stroke: color.ink,
        head: 6,
        width: 1.5,
      })}
      {label("_data[-1]", Vec2(topX, ROW_Y - 21), {
        size: 11.5,
        mono: true,
        weight: 600,
      })}
    </g>
  );

  const empty = items.length === 0 && (
    <g id={uid(PREFIX, "empty")}>
      {label("_data = []", Vec2(ROW_LEFT, ROW_Y + NODE_H / 2), {
        size: 13,
        mono: true,
        anchor: "start",
        fill: color.muted,
      })}
    </g>
  );

  const value = nextValue(input.ops);
  const chip = cell(PALETTE_CENTER.sub(Vec2(CELL_W / 2, NODE_H / 2)), CELL_W, NODE_H, {
    id: slotId(items.length),
    text: String(value),
    ...STYLE.plain,
    opacity: canAdd ? 1 : 0.4,
    zIndex: draggedId === slotId(items.length) ? "/1" : 1,
    onDrag: canAdd
      ? () =>
          d
            .closest([add(["push", value])])
            .whenFar(state)
            .withFloating()
      : undefined,
  });

  return (
    <g>
      {caption("stack._data: a Python list; the top is its end", Vec2(ROW_LEFT, 20))}
      {legend([
        ["about to be taken", STYLE.current],
        ["new or returned", STYLE.done],
      ])}
      {cells}
      {indexes}
      {topMarker}
      {empty}
      {band({
        ...args,
        prefix: PREFIX,
        vars,
        chip,
        hint: canAdd ? "onto the top" : "the script is full",
      })}
    </g>
  );
}

export const stackDynamicArrayViz = defineViz({
  id: "ds-stack-dynamic-array",
  title: "Stack on a dynamic array",
  book: "Grokking Data Structures",
  chapter: "8 · Stacks",
  summary:
    "The same stack on a Python list: push appends at the end and pop removes from the end, so the list grows and shrinks to the right and its last item, _data[-1], is the top.",
  drags: [
    "the timeline knob to step through the script",
    "a call in the script to reorder it, or its − and + to change its argument",
    "the value in the palette onto the end of the list to push it",
    "the top item off the end to pop it",
  ],
  sources: [SRC],
  initialInput: INITIAL_INPUT,
  run,
  diagramHeight: DIAGRAM_HEIGHT,
  draw,
});
