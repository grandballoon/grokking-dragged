import { inOrder, param, translate, Vec2, type Svgx } from "dragology";
import type { VizState } from "../../../core/stepping";
import { box, caption, label, uid } from "../../../ui/svg";
import { color } from "../../../ui/theme";
import { defineViz, type DrawArgs } from "../../defineViz";
import {
  mapItems,
  pool,
  poolMoves,
  SPARE,
  spareItems,
  USED,
  usedItems,
  type Pool,
} from "../kit/pool";
import { pyFloat } from "../../../core/python";
import { stdoutPanel } from "../kit/stdout";
import { BOOK_LITERAL, run, SRC, type Entry, type Vars } from "./trace";

/**
 * The editable input: the literal's pairs (`used`), plus spare groceries
 * that are not in it (`spare`). Each carries a stable id for dragging.
 */
type Grocery = { readonly id: string; readonly name: string; readonly price: number };
type Input = { readonly items: Pool<Grocery> };

const SPARES: readonly Entry[] = [
  ["banana", 0.25],
  ["eggs", 2.99],
];

const initialInput: Input = {
  items: pool(BOOK_LITERAL, SPARES, ([name, price], id) => ({ id, name, price }), "g"),
};

const literalOf = (input: Input): Entry[] =>
  usedItems(input.items).map((g) => [g.name, g.price] as const);

const MAX_PRICE = 3;
const ROW_TOP = 34;
const ROW = 38;
const ROW_H = 30;
const GAP = 40;
const KEY_W = 120;
const VALUE_X = 158;
const VALUE_W = 66;
const TRACK_X = 250;
const PX_PER_DOLLAR = 150;
const ITEM_COUNT = BOOK_LITERAL.length + SPARES.length;
const OUT_Y = ROW_TOP + ITEM_COUNT * ROW + GAP + 12;

type RowLook = "current" | "inserted" | "pending" | "spare";

function row(
  item: Grocery,
  key: string,
  index: number,
  y: number,
  look: RowLook,
  { input, state, d, draggedId, withInput }: DrawArgs<Input, Vars>,
): Svgx {
  const id = uid("grocery", item.id);
  const ghost = look === "pending" || look === "spare";
  const chip =
    look === "current"
      ? { fill: color.currentFill, stroke: color.current }
      : ghost
        ? { fill: color.cellEmpty, stroke: color.faint, dash: "3 3" }
        : { fill: color.cell, stroke: color.cellBorder };
  const ink = ghost ? color.muted : color.ink;
  const barW = Math.max(0, item.price) * PX_PER_DOLLAR;
  const roundCents = (s: VizState<Input>) =>
    withInput({
      items: mapItems(s.input.items, (g) => ({
        ...g,
        price: Math.round(g.price * 100) / 100,
      })),
    });

  return (
    <g
      id={id}
      transform={translate(0, y)}
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
      <g transform={translate(20, 0)}>
        {box(KEY_W, ROW_H, chip)}
        {label(`"${item.name}"`, Vec2(KEY_W / 2, ROW_H / 2), {
          size: 13,
          mono: true,
          fill: ink,
        })}
      </g>
      {label(":", Vec2(VALUE_X - 9, ROW_H / 2), { size: 13, mono: true, fill: ink })}
      <g transform={translate(VALUE_X, 0)}>
        {box(
          VALUE_W,
          ROW_H,
          ghost ? { ...chip } : { fill: color.cell, stroke: color.cellBorder },
        )}
        {label(pyFloat(item.price), Vec2(VALUE_W / 2, ROW_H / 2), {
          size: 13,
          mono: true,
          fill: ink,
        })}
      </g>
      <line
        x1={TRACK_X}
        x2={TRACK_X + MAX_PRICE * PX_PER_DOLLAR}
        y1={ROW_H / 2}
        y2={ROW_H / 2}
        stroke={color.rule}
        strokeWidth={2}
      />
      <g transform={translate(TRACK_X, ROW_H / 2 - 5)}>
        {box(barW, 10, {
          radius: 5,
          fill: ghost
            ? color.rule
            : look === "current"
              ? color.current
              : color.cellBorder,
          stroke: "none",
        })}
      </g>
      <g
        id={uid("price", item.id)}
        transform={translate(TRACK_X + barW, ROW_H / 2)}
        dragologyOnDrag={() =>
          d
            .vary(state, param("input", "items", key, index, "price"), {
              constraint: (s) =>
                inOrder([0, s.input.items[key]?.[index]?.price ?? 0, MAX_PRICE]),
            })
            .during(roundCents)
        }
        style={{ cursor: "ew-resize" }}
      >
        <circle
          r={9}
          fill={color.panel}
          stroke={ghost ? color.faint : color.ink}
          strokeWidth={1.5}
        />
      </g>
    </g>
  );
}

function draw(args: DrawArgs<Input, Vars>): Svgx {
  const { frame, input } = args;
  const { book, stdout } = frame.vars;
  const used = usedItems(input.items);
  const spare = spareItems(input.items);
  const inserted = Object.keys(book).length;
  const building = stdout.length === 0;
  const closeY = ROW_TOP + used.length * ROW;

  const look = (i: number): RowLook =>
    i >= inserted ? "pending" : building && i === inserted - 1 ? "current" : "inserted";

  return (
    <g>
      {label("book = {", Vec2(20, 16), { size: 13, mono: true, anchor: "start" })}
      {[0, 1, 2, 3].map((dollars) =>
        label(dollars.toFixed(2), Vec2(TRACK_X + dollars * PX_PER_DOLLAR, 16), {
          size: 10,
          mono: true,
          fill: color.faint,
        }),
      )}
      {label("}", Vec2(20, closeY + 4), { size: 13, mono: true, anchor: "start" })}
      {caption("spare groceries, not in the literal", Vec2(20, closeY + 24))}
      {used.map((item, i) => row(item, USED, i, ROW_TOP + i * ROW, look(i), args))}
      {spare.map((item, j) => row(item, SPARE, j, closeY + GAP + j * ROW, "spare", args))}
      {stdoutPanel(stdout, Vec2(20, OUT_Y + 14), 720, 28)}
    </g>
  );
}

export const priceOfGroceriesViz = defineViz<Input, Vars>({
  id: "price-of-groceries",
  title: "Price of groceries",
  book: "Grokking Algorithms",
  chapter: "5 · Hash tables",
  summary:
    "A dict maps each grocery to its price, so looking a price up is instant. The literal inserts its pairs in order, and printing the dict lists them in that same order.",
  drags: [
    "the timeline knob to step through the literal",
    "a price's handle along its track to change the price",
    "a grocery to reorder the literal, or between the literal and the spare groceries to add or remove it",
  ],
  sources: [SRC],
  initialInput,
  run: (input) => run(literalOf(input)),
  draw,
  diagramHeight: OUT_Y + 66,
});
