import { translate, Vec2, type Svgx } from "dragology";
import { moveItem, moveTargets, type KeyedLists } from "../../../core/keyedLists";
import type { Frame } from "../../../core/trace";
import { box, caption, label, uid } from "../../../ui/svg";
import { color } from "../../../ui/theme";
import { defineViz, type DrawArgs } from "../../defineViz";
import { callStack, type Card, type StackLayout } from "../kit/callStack";
import { callId, cardStatus, returnChip } from "../kit/linearCalls";
import { stdoutPanel } from "../kit/stdout";
import { BOOK_CONTENTS, KEY, ROOT, run, SRC, type Input, type Vars } from "./trace";

const TREE_X = 24;
const TREE_TOP = 56;
const ROW_H = 40;
const INDENT = 26;
const PILL_W = 96;
const PILL_H = 28;

const STACK_X = 370;
const STACK: StackLayout = { width: 370, cardHeight: 44, gap: 6, exprX: 200 };

type Row = {
  readonly name: string;
  readonly depth: number;
  readonly parent: string | null;
};

/** The tree as an outline, like the docstring in the Python file. */
function outline(contents: KeyedLists<string>): Row[] {
  const rows: Row[] = [];
  const visit = (name: string, depth: number, parent: string | null) => {
    rows.push({ name, depth, parent });
    for (const child of contents[name] ?? []) visit(child, depth + 1, name);
  };
  visit(ROOT, 0, null);
  return rows;
}

/** Is `name` inside box `outer`, at any depth? */
function isInside(contents: KeyedLists<string>, name: string, outer: string): boolean {
  return (contents[outer] ?? []).some((c) => c === name || isInside(contents, name, c));
}

/** Boxes whose search has finished by `step`: opened earlier, no longer on the stack. */
function searched(frames: readonly Frame<Vars>[], step: number): Set<string> {
  const onStack = new Set(frames[step]!.vars.stack.map((c) => c.box));
  const result = new Set<string>();
  for (let k = 0; k <= step; k++) {
    for (const call of frames[k]!.vars.stack) {
      if (!onStack.has(call.box)) result.add(call.box);
    }
  }
  return result;
}

type Style = { fill: string; stroke: string };
const STYLE = {
  plain: { fill: color.cell, stroke: color.cellBorder },
  current: { fill: color.currentFill, stroke: color.current },
  waiting: { fill: color.pendingFill, stroke: color.pending },
  searched: { fill: color.visitedFill, stroke: color.visited },
  found: { fill: color.doneFill, stroke: color.done },
} satisfies Record<string, Style>;

function boxIcon(stroke: string): Svgx {
  return (
    <g
      transform={translate(9, PILL_H / 2 - 5)}
      fill="none"
      stroke={stroke}
      strokeWidth={1.4}
    >
      <rect width={12} height={10} rx={1.5} />
      <line x1={-1.5} x2={13.5} y1={3} y2={3} />
    </g>
  );
}

function keyIcon(stroke: string): Svgx {
  return (
    <g
      transform={translate(13, PILL_H / 2)}
      fill="none"
      stroke={stroke}
      strokeWidth={1.6}
    >
      <circle r={4} />
      <path d="M 4 0 H 13 M 10 0 V 4 M 13 0 V 3" />
    </g>
  );
}

function pill(name: string, style: Style): Svgx {
  const isKey = name === KEY;
  return (
    <g>
      {box(PILL_W, PILL_H, { ...style, radius: isKey ? PILL_H / 2 : 6 })}
      {isKey ? keyIcon(style.stroke) : boxIcon(style.stroke)}
      {label(name, Vec2(isKey ? 34 : 28, PILL_H / 2), {
        size: 12,
        mono: true,
        anchor: "start",
      })}
    </g>
  );
}

function legend(at: Vec2): Svgx {
  const entries: [Style, string][] = [
    [STYLE.current, "searching now"],
    [STYLE.waiting, "paused mid-loop"],
    [STYLE.searched, "fully searched"],
    [STYLE.found, "key found"],
  ];
  return (
    <g transform={translate(at)}>
      {entries.map(([style, text], k) => (
        <g transform={translate((k % 2) * 150, Math.floor(k / 2) * 24)}>
          {box(14, 14, { ...style, radius: 3 })}
          {label(text, Vec2(22, 7), { size: 11.5, fill: color.muted, anchor: "start" })}
        </g>
      ))}
    </g>
  );
}

function cards(stack: Vars["stack"]): Card[] {
  return stack.map((call, i) => ({
    id: callId(call),
    title: `look_for_key(${call.box})`,
    locals: call.item === null ? undefined : `item = ${call.item}`,
    status: cardStatus(stack, i),
    ret: returnChip(stack, i),
  }));
}

function draw({
  frame,
  frames,
  state,
  input,
  d,
  draggedId,
  withInput,
}: DrawArgs<Input, Vars>): Svgx {
  const { stack, stdout } = frame.vars;
  const { contents } = input;
  const rows = outline(contents);
  const rowOf = new Map(rows.map((r, k) => [r.name, k]));
  const pos = (name: string) => {
    const k = rowOf.get(name)!;
    return Vec2(TREE_X + rows[k]!.depth * INDENT, TREE_TOP + k * ROW_H - PILL_H / 2);
  };
  const top = stack.at(-1);
  const waiting = new Set(stack.slice(0, -1).map((c) => c.box));
  const done = searched(frames, state.step);
  const styleOf = (name: string): Style => {
    if (name === KEY) return stdout.length > 0 ? STYLE.found : STYLE.plain;
    if (top?.box === name) return STYLE.current;
    if (waiting.has(name)) return STYLE.waiting;
    return done.has(name) ? STYLE.searched : STYLE.plain;
  };
  const accepts = (key: string, _list: readonly string[], item: string) =>
    key !== item && !isInside(contents, key, item);

  return (
    <g>
      {caption("main_box and everything packed inside it", Vec2(TREE_X, 18))}
      {rows
        .filter((r) => r.parent !== null)
        .map((r) => {
          const parent = pos(r.parent!);
          const child = pos(r.name);
          return (
            <path
              id={uid("lfk-link", r.name)}
              d={`M ${parent.x + 14} ${parent.y + PILL_H} V ${child.y + PILL_H / 2} H ${child.x}`}
              fill="none"
              stroke={color.rule}
              strokeWidth={1.5}
            />
          );
        })}
      {rows.map((r) => {
        const id = uid("lfk", r.name);
        const parent = r.parent;
        return (
          <g
            id={id}
            transform={translate(pos(r.name))}
            dragologyZIndex={draggedId === id ? "/1" : 1}
            dragologyOnDrag={
              parent === null
                ? undefined
                : () => {
                    const from = {
                      key: parent,
                      index: contents[parent]!.indexOf(r.name),
                    };
                    return d
                      .closest(
                        moveTargets(contents, from, accepts).map((to) =>
                          withInput({ contents: moveItem(contents, from, to) }),
                        ),
                      )
                      .withFloating();
                  }
            }
            style={parent === null ? undefined : { cursor: "grab" }}
          >
            {pill(r.name, styleOf(r.name))}
          </g>
        );
      })}
      {top !== undefined && top.item !== null && (
        <g id="lfk-item" transform={translate(pos(top.item))} dragologyZIndex={2}>
          <rect
            transform={translate(-4, -4)}
            width={PILL_W + 8}
            height={PILL_H + 8}
            rx={9}
            fill="none"
            stroke={color.current}
            strokeWidth={1.5}
            strokeDasharray="4 3"
          />
          {label("item", Vec2(PILL_W + 10, PILL_H / 2), {
            size: 11,
            mono: true,
            weight: 600,
            fill: color.current,
            anchor: "start",
          })}
        </g>
      )}
      {legend(Vec2(TREE_X, 452))}
      {callStack(cards(stack), Vec2(STACK_X, 20), 360, STACK)}
      {stdoutPanel(stdout, Vec2(STACK_X, 402), 370, 92)}
    </g>
  );
}

export const lookForKeyViz = defineViz<Input, Vars>({
  id: "look-for-key",
  title: "Look for the key",
  book: "Grokking Algorithms",
  chapter: "3 · Recursion",
  summary:
    "Search boxes inside boxes: look_for_key loops over a box and calls itself on every box it finds. Finding the key prints a message but doesn't stop the loop, so every box still gets opened.",
  drags: [
    "the timeline knob to follow the search in and out of boxes",
    "the key into another box (or earlier in its box) to find it sooner or later",
    "a box, with everything in it, into another box to change the nesting",
  ],
  sources: [SRC],
  initialInput: { contents: BOOK_CONTENTS },
  run,
  draw,
});
