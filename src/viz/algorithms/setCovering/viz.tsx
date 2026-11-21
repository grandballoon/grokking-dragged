import { translate, Vec2, type Svgx } from "dragology";
import {
  moveItem,
  moveTargets,
  type KeyedLists,
  type Slot,
} from "../../../core/keyedLists";
import { box, caption, cell, label, uid } from "../../../ui/svg";
import { color } from "../../../ui/theme";
import { lineText } from "../../../core/pythonSource";
import { defineViz, type DrawArgs } from "../../defineViz";
import { CURRENT, DONE, PENDING, PLAIN, type Paint } from "../kit/paint";
import { stdoutPanel } from "../kit/stdout";
import { varCell } from "../kit/varCell";
import { BOOK_INPUT, run, SRC, type Vars } from "./trace";

/**
 * The editable input: the Python's `states_needed` and `stations`, held
 * together as one dict of lists under the key "states_needed" plus one key
 * per station, so a state chip can be dragged between any two of them. A
 * parallel dict gives each chip a stable id while it moves.
 */
type Input = {
  readonly states_needed: readonly string[];
  readonly stations: KeyedLists<string>;
  readonly ids: KeyedLists<string>;
};

const NEEDED = "states_needed";
const MAX_STATES = 8;

function lists(input: Input): KeyedLists<string> {
  return { [NEEDED]: input.states_needed, ...input.stations };
}

function fromLists(all: KeyedLists<string>, ids: KeyedLists<string>): Input {
  const { [NEEDED]: states_needed = [], ...stations } = all;
  return { states_needed, stations, ids };
}

const initialInput: Input = {
  ...BOOK_INPUT,
  ids: Object.fromEntries(
    Object.entries(lists({ ...BOOK_INPUT, ids: {} })).map(([key, states]) => [
      key,
      states.map((s) => `${key}-${s}`),
    ]),
  ),
};

const SCAN_LINES = [
  "covered = states_needed & states_for_station",
  "states_covered = covered",
];

const CHIP_W = 44;
const CHIP_H = 28;
const CHIP_GAP = 4;
const ROW_H = 46;
const STATIONS_Y = 104;
const RIGHT = 528;

function draw({ frame, input, d, draggedId, withInput }: DrawArgs<Input, Vars>): Svgx {
  const { vars } = frame;
  // `station` and `covered` keep their last values after the loop, as in
  // Python; they are highlighted only while the loop is looking at a station.
  const scanning = SCAN_LINES.includes(lineText(SRC, frame.line).trim());
  const lookingAt = scanning ? vars.covered : null;
  const all = lists(input);

  /** A draggable state chip at `slot` in the combined input lists. */
  const chip = (slot: Slot, at: Vec2, paint: Paint, opacity = 1) => {
    const id = uid("state", input.ids[slot.key]![slot.index]!);
    const state = all[slot.key]![slot.index]!;
    return cell(at, CHIP_W, CHIP_H, {
      id,
      text: state,
      radius: 14,
      textOptions: { size: 13, weight: 600 },
      opacity,
      ...paint,
      zIndex: draggedId === id ? "/1" : 1,
      onDrag: () => {
        const accepts = (_key: string, list: readonly string[], item: string) =>
          !list.includes(item) && list.length < MAX_STATES;
        return d
          .closest(
            moveTargets(all, slot, accepts).map((to) =>
              withInput(
                fromLists(moveItem(all, slot, to), moveItem(input.ids, slot, to)),
              ),
            ),
          )
          .withFloating();
      },
    });
  };
  const chipX = (k: number) => k * (CHIP_W + CHIP_GAP);

  const needed = (
    <g transform={translate(20, 0)}>
      {caption("states_needed — drag a state into or out of any set", Vec2(0, 22))}
      {input.states_needed.map((state, k) => {
        const stillNeeded = vars.states_needed.has(state);
        const paint = !stillNeeded ? DONE : lookingAt?.has(state) ? CURRENT : PENDING;
        return chip({ key: NEEDED, index: k }, Vec2(chipX(k), 36), paint);
      })}
    </g>
  );

  const stationRows = (
    <g transform={translate(20, STATIONS_Y)}>
      {caption("stations", Vec2(0, -18))}
      {Object.keys(input.stations).map((name, row) => {
        const popped = !(name in vars.stations);
        const current = scanning && vars.station === name;
        const best = vars.best_station === name && !popped;
        const frameStroke = current ? color.current : best ? color.pending : "none";
        return (
          <g transform={translate(0, row * ROW_H)}>
            <g transform={translate(-8, -6)}>
              {box(492, CHIP_H + 12, {
                fill: popped ? color.doneFill : color.panel,
                stroke: frameStroke,
                strokeWidth: 2,
                radius: 10,
              })}
            </g>
            {label(name, Vec2(4, CHIP_H / 2), {
              size: 13,
              mono: true,
              weight: 600,
              anchor: "start",
              fill: popped ? color.done : current ? color.current : color.ink,
            })}
            <g transform={translate(84, 0)}>
              {input.stations[name]!.map((state, k) => {
                const useful = vars.states_needed.has(state);
                const paint = popped
                  ? DONE
                  : current && lookingAt?.has(state)
                    ? CURRENT
                    : PLAIN;
                return chip(
                  { key: name, index: k },
                  Vec2(chipX(k), 0),
                  paint,
                  useful || popped ? 1 : 0.4,
                );
              })}
            </g>
          </g>
        );
      })}
    </g>
  );

  /** A set drawn as chips, `perRow` to a row. */
  const setChips = (
    set: Set<string> | null,
    at: Vec2,
    prefix: string,
    paint: Paint,
    w = CHIP_W,
    perRow = 4,
  ) =>
    [...(set ?? [])].map((item, k) =>
      cell(
        at.add(Vec2((k % perRow) * (w + 6), Math.floor(k / perRow) * (CHIP_H + 6))),
        w,
        CHIP_H,
        {
          id: uid(prefix, item),
          text: item,
          radius: 14,
          textOptions: { size: 12.5, weight: 600 },
          ...paint,
        },
      ),
    );

  const right = (
    <g>
      {varCell(
        "best_station",
        vars.best_station === null ? "None" : `'${vars.best_station}'`,
        Vec2(RIGHT, STATIONS_Y - 12),
        120,
        {
          paint: vars.best_station === null ? PLAIN : PENDING,
        },
      )}
      {caption("states_covered", Vec2(RIGHT, STATIONS_Y + 52))}
      {setChips(
        vars.states_covered,
        Vec2(RIGHT, STATIONS_Y + 64),
        "covered-best",
        PENDING,
      )}
      {caption("covered", Vec2(RIGHT, STATIONS_Y + 140))}
      {setChips(vars.covered, Vec2(RIGHT, STATIONS_Y + 152), "covered-now", CURRENT)}
      {caption("final_stations", Vec2(RIGHT, STATIONS_Y + 228))}
      {setChips(vars.final_stations, Vec2(RIGHT, STATIONS_Y + 240), "final", DONE, 64, 3)}
    </g>
  );

  return (
    <g>
      {needed}
      {stationRows}
      {right}
      {stdoutPanel(vars.stdout, Vec2(20, 446), 720, 30)}
    </g>
  );
}

export const setCoveringViz = defineViz<Input, Vars>({
  id: "set-covering",
  title: "Set covering",
  book: "Grokking Algorithms",
  chapter: "10 · Greedy algorithms",
  summary:
    "Choose radio stations until every state is covered. The greedy rule takes, each round, the station covering the most states still needed: fast, and close to the best answer, but not always the best.",
  drags: [
    "the timeline knob to step through the rounds",
    "a state chip between stations, or into or out of states_needed",
  ],
  sources: [SRC],
  initialInput,
  run,
  draw,
  diagramHeight: 500,
});
