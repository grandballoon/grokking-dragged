import { translate, Vec2, type Svgx } from "dragology";
import { lineOf, lineText } from "../../../../core/pythonSource";
import type { Frame } from "../../../../core/trace";
import { arrow, box, label, optional, uid } from "../../../../ui/svg";
import { color } from "../../../../ui/theme";
import { defineViz, type DrawArgs } from "../../../defineViz";
import { tag } from "../../kit/tag";
import { opScript } from "../../opScript";
import { exceptionBanner, opOutcomes, stackPanel, type CallLine } from "../parts";
import {
  INITIAL_INPUT,
  LIST_SRC,
  run,
  SRC,
  type Call,
  type Input,
  type NodeFields,
  type Vars,
} from "./trace";

const CHIP_W = 150;
const X0 = 300;
const X_MAX = 745;
const ROW_Y = 150;
const NODE_W = 50;
const NODE_H = 36;
/** Vertical offset of the `_next` (above) and `_prev` (below) links. */
const LINK_DY = 7;

/** Pointers drawn above a node, nearest first, and below it. */
const ABOVE = ["_head", "self"] as const;
const BELOW = ["_tail", "old_tail", "prev_node"] as const;
type PointerName = (typeof ABOVE)[number] | (typeof BELOW)[number];

const tagY = (name: PointerName): number => {
  const above = ABOVE.indexOf(name as (typeof ABOVE)[number]);
  if (above >= 0) return ROW_Y - NODE_H / 2 - 34 - above * 24;
  return ROW_Y + NODE_H / 2 + 34 + BELOW.indexOf(name as (typeof BELOW)[number]) * 24;
};

/** The innermost active call of `fn`, if any. */
function innermost(stack: readonly Call[], fn: string): Call | undefined {
  return stack.findLast((call) => call.fn === fn);
}

/** A node-valued local of `call`: undefined while it is unassigned. */
function nodeLocal(call: Call | undefined, name: string): NodeFields | null | undefined {
  return call?.locals[name] as NodeFields | null | undefined;
}

/** Every pointer in the frame, by name: the list's fields and the locals that hold nodes. */
function pointers(vars: Vars): Record<PointerName, NodeFields | null | undefined> {
  const prepend = innermost(vars.stack, "Node.prepend");
  return {
    _head: vars._head,
    _tail: vars._tail,
    old_tail: nodeLocal(innermost(vars.stack, "insert_to_back"), "old_tail"),
    self: nodeLocal(prepend, "self"),
    prev_node: nodeLocal(prepend, "prev_node"),
  };
}

/**
 * The nodes to draw, left to right: each chain the frame can reach, from
 * its first node (found by following `_prev`) to its last. A node nothing
 * reaches any more, like a dequeued head, is no longer drawn.
 */
function displayNodes(vars: Vars): NodeFields[] {
  const seen = new Set<string>();
  const result: NodeFields[] = [];
  for (const start of Object.values(pointers(vars))) {
    if (start === null || start === undefined || seen.has(start.uid)) continue;
    let first = start;
    const back = new Set([first.uid]);
    while (
      first._prev !== null &&
      !seen.has(first._prev.uid) &&
      !back.has(first._prev.uid)
    ) {
      first = first._prev;
      back.add(first.uid);
    }
    for (let n: NodeFields | null = first; n !== null && !seen.has(n.uid); n = n._next) {
      seen.add(n.uid);
      result.push(n);
    }
  }
  return result;
}

/** Uids of the nodes in the queue: the chain from `_head` forwards. */
function inQueue(vars: Vars): Set<string> {
  const result = new Set<string>();
  for (let n = vars._head; n !== null && !result.has(n.uid); n = n._next)
    result.add(n.uid);
  return result;
}

function nodeSpacing(frames: readonly Frame<Vars>[]): number {
  const most = Math.max(1, ...frames.map((f) => displayNodes(f.vars).length));
  return most <= 1 ? 100 : Math.min(100, (X_MAX - X0 - NODE_W) / (most - 1));
}

const nodeName = (n: NodeFields | null | undefined) =>
  n === null || n === undefined ? "None" : `Node(${n._data})`;

function callLines(stack: readonly Call[]): CallLine[] {
  return stack.map((call): CallLine => {
    const { locals } = call;
    switch (call.fn) {
      case "enqueue":
        return { call: `enqueue(${String(locals.value)})`, locals: [] };
      case "insert_to_back":
        return {
          call: `insert_to_back(${String(locals.data)})`,
          locals:
            locals.old_tail === undefined
              ? []
              : [`old_tail=${nodeName(nodeLocal(call, "old_tail"))}`],
        };
      case "delete_from_front":
        return {
          call: "delete_from_front()",
          locals: locals.data === undefined ? [] : [`data=${String(locals.data)}`],
        };
      case "Node.prepend":
        return {
          call: `${nodeName(nodeLocal(call, "self"))}.prepend(${nodeName(nodeLocal(call, "prev_node"))})`,
          locals: [],
        };
      case "__init__":
        return {
          call: call.file === SRC.file ? "Queue()" : "DoublyLinkedList()",
          locals: [],
        };
      default:
        return { call: `${call.fn}()`, locals: [] };
    }
  });
}

type Style = { fill: string; stroke: string };

function draw({
  frame,
  frames,
  input,
  d,
  draggedId,
  setState,
  withInput,
}: DrawArgs<Input, Vars>): Svgx {
  const { vars } = frame;
  const nodes = displayNodes(vars);
  const spacing = nodeSpacing(frames);
  const xOf = new Map(nodes.map((n, i) => [n.uid, X0 + i * spacing]));
  const queued = inQueue(vars);
  const ptrs = pointers(vars);
  const listLine = (snippet: string) =>
    frame.file === LIST_SRC.file && frame.line === lineOf(LIST_SRC, snippet);
  const newPrev = listLine("self._prev = prev_node") ? ptrs.self?.uid : undefined;
  const newNext = listLine("prev_node._next = self") ? ptrs.prev_node?.uid : undefined;
  const reading = listLine("data = self._head.data()") ? vars._head?.uid : undefined;
  const raising = lineText(frame.file === SRC.file ? SRC : LIST_SRC, frame.line)
    .trim()
    .startsWith("raise");

  const inserting = innermost(vars.stack, "insert_to_back") !== undefined;
  const style = (n: NodeFields): Style => {
    const current =
      n.uid === reading ||
      n.uid === ptrs.self?.uid ||
      (inserting && n.uid === ptrs._tail?.uid && !queued.has(n.uid));
    if (current) return { fill: color.currentFill, stroke: color.current };
    if (queued.has(n.uid)) return { fill: color.pendingFill, stroke: color.pending };
    return { fill: color.visitedFill, stroke: color.visited };
  };

  const links = nodes.flatMap((n) => {
    const x = xOf.get(n.uid)!;
    const parts: Svgx[] = [];
    const next = n._next === null ? undefined : xOf.get(n._next.uid);
    const prev = n._prev === null ? undefined : xOf.get(n._prev.uid);
    if (next !== undefined) {
      const fresh = n.uid === newNext;
      parts.push(
        arrow(Vec2(x + NODE_W, ROW_Y - LINK_DY), Vec2(next, ROW_Y - LINK_DY), {
          id: uid("next", n.uid),
          stroke: fresh ? color.current : color.muted,
          width: fresh ? 2.2 : 1.6,
          head: 7,
        }),
      );
    } else if (n._next === null) {
      parts.push(
        label("None", Vec2(x + NODE_W + 5, ROW_Y - LINK_DY), {
          id: uid("next-none", n.uid),
          size: 9,
          mono: true,
          anchor: "start",
          fill: color.faint,
        }),
      );
    }
    if (prev !== undefined) {
      const fresh = n.uid === newPrev;
      parts.push(
        arrow(Vec2(x, ROW_Y + LINK_DY), Vec2(prev + NODE_W, ROW_Y + LINK_DY), {
          id: uid("prev", n.uid),
          stroke: fresh ? color.current : color.muted,
          width: fresh ? 2.2 : 1.6,
          head: 7,
        }),
      );
    } else if (n._prev === null) {
      parts.push(
        label("None", Vec2(x - 5, ROW_Y + LINK_DY), {
          id: uid("prev-none", n.uid),
          size: 9,
          mono: true,
          anchor: "end",
          fill: color.faint,
        }),
      );
    }
    return parts;
  });

  const nodeViews = nodes.map((n) => {
    const s = style(n);
    return (
      <g
        id={uid("node", n.uid)}
        dragologyZIndex={1}
        transform={translate(xOf.get(n.uid)!, ROW_Y - NODE_H / 2)}
      >
        {box(NODE_W, NODE_H, { fill: s.fill, stroke: s.stroke })}
        {label(String(n._data), Vec2(NODE_W / 2, NODE_H / 2), {
          size: 15,
          mono: true,
          weight: 600,
        })}
      </g>
    );
  });

  // Pointers that share a node stack up; only the nearest tag gets an arrow.
  const tagViews = ([...ABOVE, ...BELOW] as PointerName[]).flatMap((name) => {
    const target = ptrs[name];
    if (target === undefined) return [];
    if (target === null && name !== "_head" && name !== "_tail") return [];
    const x = (target === null ? X0 : (xOf.get(target.uid) ?? X0)) + NODE_W / 2;
    const y = tagY(name);
    const above = (ABOVE as readonly string[]).includes(name);
    const side = above ? ABOVE : BELOW;
    const nearer = side.slice(0, side.indexOf(name as never)).some((other) => {
      const t = ptrs[other as PointerName];
      return t !== null && t !== undefined && target !== null && t.uid === target.uid;
    });
    const dir = above ? 1 : -1;
    return [
      <g id={uid("ptr", name)} dragologyZIndex={2} transform={translate(x, y)}>
        {optional(
          "none",
          target === null &&
            label("None", Vec2(0, dir * 20), { size: 10, mono: true, fill: color.faint }),
        )}
        {optional(
          "arrow",
          target !== null &&
            !nearer &&
            arrow(Vec2(0, dir * 9), Vec2(0, dir * 32), {
              stroke: color.pointer,
              head: 7,
            }),
        )}
        {tag(name)}
      </g>,
    ];
  });

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
      {links}
      {nodeViews}
      {tagViews}
      <g transform={translate(X0, 300)}>{stackPanel(callLines(vars.stack))}</g>
      {optional(
        "exception",
        raising && <g transform={translate(X0, 20)}>{exceptionBanner(frame.note)}</g>,
      )}
    </g>
  );
}

export const linkedQueueViz = defineViz<Input, Vars>({
  id: "ds-queue-linked-list",
  title: "Queue on a doubly-linked list",
  book: "Grokking Data Structures",
  chapter: "9 · Queues",
  summary:
    "A queue that keeps its elements in a doubly-linked list: enqueue links a new node in after the tail, dequeue unlinks the head. Neither ever walks the list, so both take constant time.",
  drags: ["an operation chip to reorder the script, or − and + to change a value"],
  sources: [SRC, LIST_SRC],
  initialInput: INITIAL_INPUT,
  run,
  draw,
  diagramHeight: 400,
});
