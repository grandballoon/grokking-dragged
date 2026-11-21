import { translate, Vec2, type Svgx } from "dragology";
import { lineOf } from "../../../core/pythonSource";
import { box, caption, label, uid } from "../../../ui/svg";
import { color } from "../../../ui/theme";
import { defineViz, type DrawArgs } from "../../defineViz";
import {
  pool,
  poolMoves,
  SPARE,
  spareItems,
  USED,
  usedItems,
  type Pool,
} from "../kit/pool";
import { BOOK_CALLS, get, run, SRC, type Vars } from "./trace";

/**
 * The editable input: the names the script calls `check_voter` with
 * (`used`), plus spare calls (`spare`). Each carries a stable id, since the
 * same name can be called more than once.
 */
type Voter = { readonly id: string; readonly name: string };
type Input = { readonly items: Pool<Voter> };

const SPARES = ["anna", "tom", "lee"];

const initialInput: Input = {
  items: pool(BOOK_CALLS, SPARES, (name, id) => ({ id, name }), "v"),
};

const namesOf = (input: Input): string[] => usedItems(input.items).map((v) => v.name);

const ROW_TOP = 30;
const ROW = 34;
const ROW_H = 28;
const GAP = 32;
const CALL_W = 196;
const DICT_X = 250;
const KEY_W = 86;
const VALUE_X = DICT_X + 102;
const VALUE_W = 60;
const OUT_X = 460;
const OUT_W = 280;
const ITEM_COUNT = BOOK_CALLS.length + SPARES.length;

type ChipLook = { fill: string; stroke: string; dash?: string; ink: string };

function callLook(key: string, index: number, current: number | null): ChipLook {
  if (key === SPARE) {
    return { fill: color.cellEmpty, stroke: color.faint, dash: "3 3", ink: color.muted };
  }
  if (index === current)
    return { fill: color.currentFill, stroke: color.current, ink: color.ink };
  if (current !== null && index < current) {
    return { fill: color.visitedFill, stroke: color.visited, ink: color.muted };
  }
  return { fill: color.cell, stroke: color.cellBorder, ink: color.ink };
}

function draw({ frame, input, d, draggedId, withInput }: DrawArgs<Input, Vars>): Svgx {
  const { voted, call, name, stdout } = frame.vars;
  const used = usedItems(input.items);
  const spare = spareItems(input.items);
  const closeY = ROW_TOP + used.length * ROW;
  const looking = frame.line === lineOf(SRC, "if voted.get(name):");
  const storing = frame.line === lineOf(SRC, "voted[name] = True");
  const keys = Object.keys(voted);
  const dictEnd = ROW_TOP + keys.length * ROW;

  const chip = (voter: Voter, key: string, index: number, y: number): Svgx => {
    const id = uid("voter", voter.id);
    const look = callLook(key, index, call);
    return (
      <g
        id={id}
        transform={translate(20, y)}
        dragologyZIndex={draggedId === id ? "/1" : 1}
        dragologyOnDrag={() =>
          d
            .closest(
              poolMoves(input.items, { key, index }, {}).map((items) =>
                withInput({ items }),
              ),
            )
            .withFloating()
        }
        style={{ cursor: "grab" }}
      >
        {box(CALL_W, ROW_H, look)}
        {label(`check_voter("${voter.name}")`, Vec2(12, ROW_H / 2), {
          size: 12,
          mono: true,
          anchor: "start",
          fill: look.ink,
          weight: index === call && key === USED ? 600 : undefined,
        })}
      </g>
    );
  };

  return (
    <g>
      {caption("calls, in order", Vec2(20, 16))}
      {used.map((v, i) => chip(v, USED, i, ROW_TOP + i * ROW))}
      {caption("spare calls", Vec2(20, closeY + 13))}
      {spare.map((v, j) => chip(v, SPARE, j, closeY + GAP + j * ROW))}

      {label("voted = {", Vec2(DICT_X, 16), { size: 13, mono: true, anchor: "start" })}
      {keys.map((k, i) => {
        const touched = k === name && (looking || storing);
        const look = touched
          ? { fill: color.currentFill, stroke: color.current }
          : { fill: color.cell, stroke: color.cellBorder };
        return (
          <g id={uid("voted", k)} transform={translate(DICT_X, ROW_TOP + i * ROW)}>
            {box(KEY_W, ROW_H, look)}
            {label(`"${k}"`, Vec2(KEY_W / 2, ROW_H / 2), { size: 12, mono: true })}
            {label(":", Vec2(VALUE_X - DICT_X - 8, ROW_H / 2), { size: 13, mono: true })}
            <g transform={translate(VALUE_X - DICT_X, 0)}>
              {box(VALUE_W, ROW_H, look)}
              {label("True", Vec2(VALUE_W / 2, ROW_H / 2), { size: 12, mono: true })}
            </g>
          </g>
        );
      })}
      {label("}", Vec2(DICT_X, dictEnd + 4), { size: 13, mono: true, anchor: "start" })}
      {looking &&
        name !== null &&
        label(
          `voted.get("${name}") → ${get(voted, name) ? "True" : "None"}`,
          Vec2(DICT_X, dictEnd + 30),
          {
            size: 12,
            mono: true,
            anchor: "start",
            fill: get(voted, name) ? color.current : color.muted,
          },
        )}

      {caption("stdout", Vec2(OUT_X, 16))}
      {stdout.map((text, i) => {
        const kick = text.startsWith("kick");
        return (
          <g id={uid("stdout", i)} transform={translate(OUT_X, ROW_TOP + i * ROW)}>
            {box(OUT_W, ROW_H, {
              fill: kick ? color.badFill : color.doneFill,
              stroke: kick ? color.bad : color.done,
            })}
            {label(text, Vec2(12, ROW_H / 2), {
              size: 12,
              mono: true,
              anchor: "start",
              fill: kick ? color.bad : color.done,
              weight: 600,
            })}
          </g>
        );
      })}
    </g>
  );
}

export const checkVoterViz = defineViz<Input, Vars>({
  id: "check-voter",
  title: "Check voter",
  book: "Grokking Algorithms",
  chapter: "5 · Hash tables",
  summary:
    "Use a dict to catch people voting twice: look the name up, and if it is already there, kick them out; otherwise record it and let them vote. Each lookup takes constant time, however many people have voted.",
  drags: [
    "the timeline knob to step through the calls",
    "a call to reorder the script, or between the script and the spare calls to add or remove it",
  ],
  sources: [SRC],
  initialInput,
  run: (input) => run(namesOf(input)),
  draw,
  diagramHeight: ROW_TOP + ITEM_COUNT * ROW + GAP + 10,
});
