import { pyRepr } from "../../../core/python";
import { translate, Vec2, type Svgx } from "dragology";
import { box, caption, label, optional, uid } from "../../../ui/svg";
import { color } from "../../../ui/theme";
import { defineViz, type DrawArgs } from "../../defineViz";
import { arrayEditor, cellX, type ArrayGeometry } from "../kit/arrayEditor";
import { arrInput, type ArrInput } from "../kit/arrayEdits";
import { numberSlider } from "../kit/numberSlider";
import { stdoutPanel } from "../kit/stdout";
import { BOOK_INPUT, run, SRC, type Vars } from "./trace";

/** The ports see `my_list`; `arr` and `ids` are the editor's view of it. */
type Input = ArrInput & { readonly items: readonly [number, number] };

const GEO: ArrayGeometry = { at: Vec2(150, 250), pitch: 62, cellW: 50, cellH: 36 };
const UNIT = 14;
const VALUE_RANGE = [1, 12] as const;
const MAX_LEN = 8;
const ITEMS = Array.from({ length: 15 }, (_, k) => k - 2);
const INDEX_Y = GEO.at.y + GEO.cellH + 16;
const POINTER_Y = INDEX_Y + 26;
const LOCALS_Y = POINTER_Y + 58;
const SLIDER_Y = LOCALS_Y + 64;
const SLIDER_W = 280;

const initialInput: Input = { ...arrInput(BOOK_INPUT.my_list), items: BOOK_INPUT.items };

const toPort = (input: Input) => ({ my_list: input.arr, items: input.items });

const centerX = (i: number) => cellX(GEO, i) + GEO.cellW / 2;

/** The part of the list still being searched, as a band under the cells. */
function searchBand(low: number, high: number): Svgx {
  const left = cellX(GEO, low) - 4;
  const right = high >= low ? cellX(GEO, high) + GEO.cellW + 4 : left;
  return (
    <g id="bs1-band" transform={translate(left, GEO.at.y - 6)}>
      {box(Math.max(0, right - left), GEO.cellH + 12, {
        fill: color.pendingFill,
        stroke: color.pending,
        radius: 8,
        strokeWidth: 1,
      })}
    </g>
  );
}

/** A pointer chip under column `index`, on its own row so chips never collide. */
function pointer(name: string, index: number, row: number, tone: string): Svgx {
  return (
    <g
      id={uid("bs1-ptr", name)}
      transform={translate(centerX(index), POINTER_Y + row * 20)}
    >
      {box(44, 17, { fill: tone, stroke: "none", radius: 8.5 })}
      {label(name, Vec2(22, 8.5), { size: 11, mono: true, weight: 600, fill: "white" })}
    </g>
  );
}

function draw({ frame, input, d, draggedId, withInput }: DrawArgs<Input, Vars>): Svgx {
  const v = frame.vars;
  const n = input.arr.length;
  const searching = v.item !== null && v.low !== null && v.high !== null;
  const found = v.returned !== null && v.returned.value !== null;
  const outside = (i: number) => searching && (i < v.low! || i > v.high!);
  const locals: [string, number | null][] = [
    ["item", v.item],
    ["low", v.low],
    ["high", v.high],
    ["mid", v.mid],
    ["guess", v.guess],
  ];

  const itemSlider = (k: 0 | 1) => (
    <g opacity={v.call === null || v.call === k ? 1 : 0.45}>
      {caption(`print ${k + 1}: search_iterative(my_list, item)`, Vec2(0, -22))}
      {numberSlider({
        id: uid("bs1-item", k),
        at: Vec2(0, 0),
        width: SLIDER_W,
        values: ITEMS,
        value: input.items[k],
        d,
        draggedId,
        toState: (item) =>
          withInput({
            ...input,
            items: k === 0 ? [item, input.items[1]] : [input.items[0], item],
          }),
      })}
    </g>
  );

  return (
    <g>
      {caption("my_list: drag a dot to change a value (it stays sorted)", Vec2(20, 14))}
      {optional("band", searching && searchBand(v.low!, v.high!))}
      {arrayEditor({
        name: "my_list",
        ...GEO,
        list: input,
        idPrefix: "bs1-in",
        bars: { unit: UNIT, range: VALUE_RANGE, sorted: true },
        length: {
          range: [1, MAX_LEN],
          fill: (arr) => Math.min(VALUE_RANGE[1], (arr.at(-1) ?? 0) + 1),
        },
        d,
        draggedId,
        toState: (list) => withInput({ ...input, ...list }),
      })}
      <g>
        {input.arr.map((_, i) => (
          <g id={uid("bs1-col", input.ids[i]!)} transform={translate(cellX(GEO, i), 0)}>
            <rect
              transform={translate(-2, GEO.at.y - 4 - VALUE_RANGE[1] * UNIT - 8)}
              width={GEO.cellW + 4}
              height={VALUE_RANGE[1] * UNIT + GEO.cellH + 14}
              fill={color.panel}
              opacity={outside(i) ? 0.65 : 0}
              pointerEvents="none"
            />
            {label(String(i), Vec2(GEO.cellW / 2, INDEX_Y), {
              size: 11,
              mono: true,
              fill: color.faint,
            })}
          </g>
        ))}
      </g>
      {optional(
        "mid",
        searching && v.mid !== null && v.mid <= n - 1 && (
          <g id="bs1-mid" transform={translate(cellX(GEO, v.mid), GEO.at.y)}>
            {box(GEO.cellW, GEO.cellH, {
              fill: "none",
              stroke: found ? color.done : color.current,
              strokeWidth: 3,
              radius: 4,
            })}
          </g>
        ),
      )}
      {optional("low", searching && pointer("low", v.low!, 0, color.pending))}
      {optional(
        "mid-ptr",
        searching && v.mid !== null && pointer("mid", v.mid, 1, color.current),
      )}
      {optional("high", searching && pointer("high", v.high!, 2, color.pending))}
      <g transform={translate(20, LOCALS_Y)}>
        {locals.map(([name, value], i) => (
          <g id={uid("bs1-local", name)} transform={translate(i * 112, 0)}>
            {label(`${name} = ${value === null ? "·" : String(value)}`, Vec2(0, 0), {
              size: 13,
              mono: true,
              anchor: "start",
              fill: value === null ? color.faint : color.ink,
            })}
          </g>
        ))}
        {optional(
          "returned",
          v.returned !== null &&
            label(`returns ${pyRepr(v.returned.value)}`, Vec2(580, 0), {
              size: 13,
              mono: true,
              anchor: "start",
              weight: 600,
              fill: found ? color.done : color.bad,
            }),
        )}
      </g>
      <g transform={translate(40, SLIDER_Y)}>{itemSlider(0)}</g>
      <g transform={translate(420, SLIDER_Y)}>{itemSlider(1)}</g>
      {stdoutPanel(v.stdout, Vec2(650, 14), 100, 80)}
    </g>
  );
}

export const binarySearchViz = defineViz<Input, Vars>({
  id: "binary-search",
  title: "Binary search",
  book: "Grokking Algorithms",
  chapter: "1 · Introduction to algorithms",
  summary:
    "Search a sorted list by guessing the middle and throwing away the half the guess rules out. low and high bound what's left; when low passes high, the item isn't there.",
  drags: [
    "the timeline knob to watch low, mid and high close in",
    "a purple item knob to search for another value, including one that isn't in the list",
    "a purple dot on a bar to change a value (it can't pass its neighbours, so the list stays sorted)",
    "the purple ] to make the list shorter or longer",
  ],
  sources: [SRC],
  initialInput,
  run: (input) => run(toPort(input)),
  draw,
  diagramHeight: 470,
});
