import { translate, Vec2, type Svgx } from "dragology";
import { caption, label, optional, uid } from "../../../../ui/svg";
import { color, font } from "../../../../ui/theme";
import { defineViz, type DrawArgs } from "../../../defineViz";
import { opScript, opText, type Op } from "../../opScript";
import {
  chain,
  currentStyle,
  doneStyle,
  neutral,
  pendingStyle,
  visitedStyle,
  type Style,
} from "../shared/draw";
import { dragTag } from "../../kit/tag";
import { INITIAL_INPUT } from "./input";
import { emptySlots, height, placeTree, type TreeNode } from "./layout";
import { run, SRC, STACK_SRC, type Input as TraceInput, type Vars } from "./trace";

/**
 * The editable input: the script, plus `dropping`, which marks a candidate
 * script while the insert tag is being dragged. It only moves the tag onto
 * the node the drop would add; dropping clears it.
 */
type Input = TraceInput & { readonly dropping?: true };

/** Values the script works with; nudges and drops stay inside. */
const VALUE_RANGE = [1, 99] as const;
/** Keeps the script column inside the diagram. */
const MAX_OPS = 18;

const TREE_X = 200;
const TREE_W = 540;
const TREE_TOP = 64;
const TREE_BOTTOM = 384;
const R = 17;
const MAX_COL = 64;
const MAX_LEVEL = 56;
const BOTTOM_Y = 420;
const CHIP_W = 34;
const CHIP_H = 28;
const CHIP_GAP = 8;
const NEW_NODE_AT = Vec2(670, BOTTOM_Y + 52);
const TAG_ID = "bst-insert";
const TAG_W = 96;

/** Column width and level height, fixed for a whole trace so nothing rescales between steps. */
type Grid = { readonly col: number; readonly level: number };

function grid(frames: readonly { vars: Vars }[]): Grid {
  let nodes = 1;
  let depth = 0;
  for (const { vars } of frames) {
    nodes = Math.max(nodes, placeTree(vars._root).length);
    depth = Math.max(depth, height(vars._root));
  }
  return {
    col: Math.min(MAX_COL, TREE_W / nodes),
    level: Math.min(MAX_LEVEL, (TREE_BOTTOM - TREE_TOP) / Math.max(1, depth)),
  };
}

function nodeStyle(node: TreeNode, vars: Vars): Style {
  const is = (n: { uid: string } | null) => n !== null && n.uid === node.uid;
  if (vars.done.includes(node.uid)) return doneStyle;
  if (is(vars.node) || is(vars.current))
    return vars.result === "True" ? doneStyle : currentStyle;
  if (is(vars.max_node)) return pendingStyle;
  if (is(vars.parent) || is(vars.max_node_parent)) return visitedStyle;
  if (stacked(vars).has(node.uid)) return pendingStyle;
  return neutral;
}

/** Which local points at a node, if any, for the little name above it. */
function pointerName(node: TreeNode, vars: Vars): string | null {
  const names: [string, { uid: string } | null][] = [
    ["node", vars.node],
    ["current", vars.current],
    ["max_node", vars.max_node],
    ["parent", vars.parent],
    ["max_node_parent", vars.max_node_parent],
  ];
  return names.find(([, n]) => n !== null && n.uid === node.uid)?.[0] ?? null;
}

/** The tree nodes sitting on `__len__`'s or `__iter__`'s stack. */
function stacked(vars: Vars): Set<string> {
  const out = new Set<string>();
  for (let n = vars.stack?._data._head ?? null; n !== null; n = n._next) {
    if (n._data !== null) out.add(n._data.uid);
  }
  return out;
}

function nodeCircle(node: TreeNode, at: Vec2, style: Style, name: string | null): Svgx {
  return (
    <g id={uid("bst-node", node.uid)} transform={translate(at)} dragologyZIndex={1}>
      <circle r={R} fill={style.fill} stroke={style.stroke} strokeWidth={2} />
      {label(String(node._value), Vec2(0, 0), { size: 13, mono: true, weight: 600 })}
      <text
        transform={translate(0, -R - 8)}
        fontFamily={font.mono}
        fontSize={10.5}
        fill={style.stroke}
        textAnchor="middle"
        dominantBaseline="central"
        stroke={color.panel}
        strokeWidth={3}
        paintOrder="stroke"
        opacity={name === null ? 0 : 1}
      >
        {name ?? ""}
      </text>
    </g>
  );
}

function treeView(vars: Vars, g: Grid): { svg: Svgx; positions: Map<string, Vec2> } {
  const placed = placeTree(vars._root);
  const left = TREE_X + (TREE_W - placed.length * g.col) / 2;
  const positions = new Map<string, Vec2>();
  for (const p of placed) {
    positions.set(
      p.node.uid,
      Vec2(left + (p.rank + 0.5) * g.col, TREE_TOP + p.depth * g.level),
    );
  }
  const edges = placed.flatMap((p) => {
    if (p.parent === null) return [];
    const a = positions.get(p.parent.uid)!;
    const b = positions.get(p.node.uid)!;
    const unit = b.sub(a).norm();
    const from = a.add(unit.mul(R));
    const to = b.sub(unit.mul(R));
    return [
      <path
        id={uid("bst-edge", p.node.uid)}
        d={`M ${from.str(" ")} L ${to.str(" ")}`}
        stroke={color.cellBorder}
        strokeWidth={1.6}
        fill="none"
      />,
    ];
  });
  const svg = (
    <g>
      {edges}
      {placed.map((p) =>
        nodeCircle(
          p.node,
          positions.get(p.node.uid)!,
          nodeStyle(p.node, vars),
          pointerName(p.node, vars),
        ),
      )}
    </g>
  );
  return { svg, positions };
}

/** `new_node` while it is built, before it is linked into the tree. */
function newNodeView(vars: Vars, inTree: boolean): Svgx | null {
  const n = vars.new_node;
  if (n === null || inTree) return null;
  const child = (c: TreeNode | null) => (c === null ? "None" : String(c._value));
  return (
    <g>
      {caption("new_node", Vec2(NEW_NODE_AT.x - 50, BOTTOM_Y + 8))}
      {nodeCircle(n, NEW_NODE_AT, currentStyle, null)}
      {label(
        `left ${child(n._left)} · right ${child(n._right)}`,
        NEW_NODE_AT.add(Vec2(0, R + 16)),
        {
          size: 10.5,
          mono: true,
          fill: color.muted,
        },
      )}
    </g>
  );
}

/** `__len__`'s and `__iter__`'s Stack, top first, and what they have counted or yielded. */
function traversalView(vars: Vars): Svgx | null {
  if (vars.stack === null) return null;
  const counting = vars.size !== null;
  return (
    <g>
      {caption(
        "stack: a Stack on a SinglyLinkedList, top first",
        Vec2(TREE_X, BOTTOM_Y + 8),
      )}
      {optional(
        "empty",
        vars.stack._data._head === null &&
          label("empty", Vec2(TREE_X, BOTTOM_Y + 22 + CHIP_H / 2), {
            size: 12,
            mono: true,
            anchor: "start",
            fill: color.faint,
          }),
      )}
      {chain<TreeNode | null>(vars.stack._data._head, {
        id: (n) => uid("bst-stack", n.uid),
        at: Vec2(TREE_X, BOTTOM_Y + 22),
        nodeW: CHIP_W,
        nodeH: CHIP_H,
        gap: CHIP_GAP,
        text: (v) => (v === null ? "None" : String(v._value)),
        textSize: 11,
        style: (n) =>
          n._data === null
            ? { fill: color.cellEmpty, stroke: color.cellBorder }
            : pendingStyle,
      })}
      {caption(counting ? "size" : "yielded", Vec2(TREE_X, BOTTOM_Y + 80))}
      {optional(
        "size",
        counting &&
          label(String(vars.size), Vec2(TREE_X, BOTTOM_Y + 94 + CHIP_H / 2), {
            size: 18,
            mono: true,
            weight: 700,
            anchor: "start",
            fill: color.done,
          }),
      )}
      {!counting &&
        vars.yielded.map((v, i) => (
          <g
            id={uid("bst-yield", i)}
            transform={translate(TREE_X + i * (CHIP_W + CHIP_GAP), BOTTOM_Y + 94)}
          >
            <rect
              width={CHIP_W}
              height={CHIP_H}
              rx={5}
              fill={color.doneFill}
              stroke={color.done}
              strokeWidth={1.5}
            />
            {label(String(v), Vec2(CHIP_W / 2, CHIP_H / 2), {
              size: 12,
              mono: true,
              weight: 600,
            })}
          </g>
        ))}
    </g>
  );
}

function outcome(vars: Vars, ops: readonly Op[]): Svgx {
  const op = vars.op === null ? undefined : ops[vars.op];
  const text =
    op === undefined
      ? ""
      : vars.error !== null
        ? `${opText(op)} raised ValueError`
        : vars.result !== null
          ? `${opText(op)} → ${vars.result}`
          : "";
  return label(text, Vec2(TREE_X + TREE_W - TAG_W - 20, 22), {
    size: 12.5,
    mono: true,
    anchor: "end",
    weight: 600,
    fill:
      vars.error !== null
        ? color.bad
        : vars.result === "False"
          ? color.muted
          : color.done,
  });
}

function freshId(ops: readonly Op[]): string {
  let n = ops.length;
  while (ops.some((o) => o.id === `op${n}`)) n++;
  return `op${n}`;
}

function draw({
  frame,
  frames,
  state,
  input,
  d,
  draggedId,
  setState,
  withInput,
}: DrawArgs<Input, Vars>): Svgx {
  const { vars } = frame;
  const g = grid(frames);
  const { svg, positions } = treeView(vars, g);
  const atEnd = state.step === frames.length - 1;
  const ops = input.ops;
  const clean = (i: Input): Input => ({ ops: i.ops });

  // The node the dropped insert adds takes the uid of its op, the last.
  const newest = ops.at(-1)?.id ?? "";
  // Level with the outcome label, which ends just left of it.
  const tagHome = Vec2(TREE_X + TREE_W - TAG_W / 2, 22);
  const tagAt =
    input.dropping && positions.has(newest) ? positions.get(newest)! : tagHome;

  return (
    <g>
      <g transform={translate(20, 22)}>
        {opScript({
          ops,
          current: vars.op,
          d,
          draggedId,
          setState,
          withOps: (next) => withInput({ ops: next }),
          argRange: VALUE_RANGE,
        })}
      </g>
      {caption("_root", Vec2(TREE_X, 22))}
      {optional(
        "root-none",
        vars._root === null &&
          label("None", Vec2(TREE_X + TREE_W / 2, TREE_TOP), {
            size: 13,
            mono: true,
            fill: color.faint,
          }),
      )}
      {outcome(vars, ops)}
      {svg}
      {optional(
        "new-node",
        newNodeView(vars, vars.new_node !== null && positions.has(vars.new_node.uid)),
      )}
      {optional("traversal", traversalView(vars))}
      {optional(
        "insert-tag",
        atEnd &&
          ops.length < MAX_OPS &&
          dragTag({
            id: TAG_ID,
            at: tagAt,
            text: "insert(…) ⇣",
            width: TAG_W,
            draggedId,
            onDrag: () =>
              d
                .closest(
                  emptySlots(vars._root, VALUE_RANGE[0] - 1, VALUE_RANGE[1]).map((slot) =>
                    withInput({
                      ops: [
                        ...ops,
                        { id: freshId(ops), name: "insert", args: [slot.value] },
                      ],
                      dropping: true,
                    }),
                  ),
                )
                .withFloating()
                .onDrop((preview) => ({ ...preview, input: clean(preview.input) })),
          }),
      )}
    </g>
  );
}

export const bstViz = defineViz<Input, Vars>({
  id: "ds-binary-search-tree",
  title: "Binary search tree",
  book: "Grokking Data Structures",
  chapter: "11 · Binary search trees",
  summary:
    "Every value on a node's left is no larger than it, and every value on its right is larger. Insert and search walk one path down from the root; deleting a node with two children replaces it with the largest value of its left subtree.",
  drags: [
    "the timeline knob to step through the script",
    "a call in the script to reorder it, or its − and + to change the value",
    "at the last step, the purple insert tag onto the tree to add a value that lands where you drop it",
  ],
  sources: [SRC, STACK_SRC],
  initialInput: INITIAL_INPUT,
  run,
  draw,
  diagramHeight: 600,
});
