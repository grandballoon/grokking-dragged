import { translate, Vec2, type Svgx } from "dragology";
import { arrow, box, caption, label, optional, uid } from "../../../../ui/svg";
import { color } from "../../../../ui/theme";
import { defineViz, type DrawArgs } from "../../../defineViz";
import { opScript, opText } from "../../opScript";
import { decStr } from "../shared/decimal";
import {
  chain,
  currentStyle,
  doneStyle,
  neutral,
  visitedStyle,
  type NodeData,
  type Style,
} from "../shared/draw";
import { dragTag } from "../../kit/tag";
import { A } from "./hashing";
import { INITIAL_INPUT } from "./input";
import { run, SLL_SRC, SRC, type Input, type Vars } from "./trace";

/** The table sizes the HashTable(m) tag can be dragged between. */
const BUCKET_RANGE = [2, 3, 4, 5, 6, 7] as const;

const TABLE_X = 200;
const TABLE_RIGHT = 740;
const ROW0 = 44;
const ROW_H = 44;
const INDEX_W = 36;
const NODE_W = 46;
const NODE_H = 32;
const NODE_GAP = 20;
const HEAD_X = TABLE_X + INDEX_W + 24;
const PANEL_Y = 390;
const PANEL_H = 120;

const rowY = (i: number) => ROW0 + i * ROW_H;

/** Whether the op returned something found: a value, or True. */
function returnedValue(vars: Vars): boolean {
  return vars.result !== null && vars.result !== "None" && vars.result !== "False";
}

function nodeStyle(node: NodeData<number>, vars: Vars): Style {
  if (node.uid === vars.current?.uid) {
    return returnedValue(vars) ? doneStyle : currentStyle;
  }
  if (node.uid === vars.previous?.uid) return visitedStyle;
  return neutral;
}

function bucketRow(vars: Vars, i: number): Svgx {
  const list = vars._data[i]!;
  const y = rowY(i);
  const active = vars.index === i;
  return (
    <g id={uid("ht-bucket", i)}>
      <g transform={translate(TABLE_X, y)}>
        {box(INDEX_W, NODE_H, {
          fill: active ? color.currentFill : color.cellEmpty,
          stroke: active ? color.current : color.cellBorder,
          radius: 5,
        })}
        {label(String(i), Vec2(INDEX_W / 2, NODE_H / 2), {
          size: 13,
          mono: true,
          fill: active ? color.current : color.muted,
          weight: 600,
        })}
        {arrow(Vec2(INDEX_W, NODE_H / 2), Vec2(HEAD_X - TABLE_X, NODE_H / 2), {
          head: 6,
          opacity: list._head === null ? 0 : 1,
        })}
        {label("None", Vec2(HEAD_X - TABLE_X + 2, NODE_H / 2), {
          size: 12,
          mono: true,
          anchor: "start",
          fill: color.faint,
          opacity: list._head === null ? 1 : 0,
        })}
      </g>
      {chain(list._head, {
        id: (node) => uid("ht-node", node.uid),
        at: Vec2(HEAD_X, y),
        nodeW: NODE_W,
        nodeH: NODE_H,
        gap: NODE_GAP,
        text: String,
        style: (node) => nodeStyle(node, vars),
      })}
    </g>
  );
}

/** The four steps of `_hash`, with the exact Decimal values Python computes. */
function hashPanel(vars: Vars): Svgx {
  const h = vars.hashing;
  const lineY = (k: number) => 42 + k * 21;
  const rows: [string, string][] =
    h === null
      ? []
      : [
          [`Decimal(${h.key}) * A`, decStr(h.product)],
          ["% 1", decStr(h.fraction)],
          [`${h.m} * (…)`, decStr(h.scaled)],
          ["floor(abs(…))", String(h.index)],
        ];
  return (
    <g transform={translate(TABLE_X, PANEL_Y)}>
      {box(TABLE_RIGHT - TABLE_X, PANEL_H, {
        fill: color.panel,
        stroke: color.panelBorder,
        radius: 10,
        strokeWidth: 1,
      })}
      {caption(h === null ? "_hash(key)" : `_hash(${h.key})`, Vec2(12, 16))}
      {caption(`A = ${decStr(A)}`, Vec2(TABLE_RIGHT - TABLE_X - 12, 16), {
        anchor: "end",
        size: 11,
        fill: color.faint,
      })}
      {optional(
        "no-key",
        h === null &&
          label("No key hashed yet.", Vec2(12, lineY(1)), {
            size: 12,
            anchor: "start",
            fill: color.faint,
          }),
      )}
      {rows.map(([lhs, rhs], k) => {
        const last = k === rows.length - 1;
        const fill = last ? color.current : color.ink;
        return (
          <g transform={translate(0, lineY(k))}>
            {label(lhs, Vec2(170, 0), {
              size: 12,
              mono: true,
              anchor: "end",
              fill: color.muted,
            })}
            {label("=", Vec2(182, 0), { size: 12, mono: true, fill: color.muted })}
            {label(rhs, Vec2(194, 0), {
              size: 12,
              mono: true,
              anchor: "start",
              fill,
              weight: last ? 700 : undefined,
            })}
          </g>
        );
      })}
    </g>
  );
}

/** What the running op returned or raised, top right of the table. */
function outcome(vars: Vars, input: Input): Svgx {
  const op = vars.op === null ? undefined : input.ops[vars.op];
  const text =
    op === undefined
      ? ""
      : vars.error !== null
        ? `${opText(op)} raised ${vars.error.split(":")[0]}`
        : vars.result !== null
          ? `${opText(op)} → ${vars.result}`
          : "";
  return label(text, Vec2(TABLE_RIGHT, 22), {
    size: 12.5,
    mono: true,
    anchor: "end",
    weight: 600,
    fill:
      vars.error !== null ? color.bad : returnedValue(vars) ? color.done : color.muted,
  });
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
  const m = vars._data.length;
  return (
    <g>
      <g transform={translate(20, 22)}>
        {opScript({
          ops: input.ops,
          current: vars.op,
          d,
          draggedId,
          setState,
          withOps: (ops) => withInput({ ...input, ops }),
          title: "script",
        })}
      </g>
      {caption(`_data: ${m} buckets, each a SinglyLinkedList`, Vec2(TABLE_X, 22))}
      {outcome(vars, input)}
      {vars._data.map((_, i) => bucketRow(vars, i))}
      {dragTag({
        id: "ht-buckets",
        at: Vec2(TABLE_X + 56, rowY(m) + 12),
        text: `HashTable(${input.buckets}) ⇕`,
        width: 112,
        draggedId,
        onDrag: () =>
          d
            .closest(BUCKET_RANGE.map((buckets) => withInput({ ...input, buckets })))
            .withFloating(),
      })}
      {hashPanel(vars)}
    </g>
  );
}

export const hashTableViz = defineViz<Input, Vars>({
  id: "ds-hash-table",
  title: "Hash table",
  book: "Grokking Data Structures",
  chapter: "12 · Dictionaries and hash tables",
  summary:
    "A hash table with chaining: _hash multiplies the key by the golden ratio's fractional part, keeps the fractional part of that, and scales it to a bucket. Each bucket is a linked list, and new values go in front.",
  drags: [
    "the timeline knob to step through the script",
    "a call in the script to reorder it, or its − and + to change the value",
    "the purple HashTable(m) tag up or down to change the number of buckets",
  ],
  sources: [SRC, SLL_SRC],
  initialInput: INITIAL_INPUT,
  run,
  draw,
});
