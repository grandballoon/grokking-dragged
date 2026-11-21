import { pyRepr } from "../../../core/python";
import { translate, Vec2, type Svgx } from "dragology";
import { box, cell, caption, label, uid } from "../../../ui/svg";
import { color } from "../../../ui/theme";
import { defineViz, type DrawArgs } from "../../defineViz";
import { chipWidth } from "../kit/measure";
import {
  CURRENT,
  DONE,
  PENDING,
  PLAIN,
  TOUCHED,
  VISITED,
  type Paint,
} from "../kit/paint";
import { stdoutPanel } from "../kit/stdout";
import { children, entryAt, join, moves, ROOT, type Entry, type Tree } from "./fs";
import { INITIAL_INPUT, run, SRC, type Call, type Input, type Vars } from "./trace";

/**
 * Where a path stands in the traversal the stack describes: the entry the
 * innermost call is on is "current", folders whose calls are open are
 * "open", entries a call has already passed are "done", entries a call has
 * listed but not reached are "pending", and everything else is "idle".
 */
type Status = "current" | "open" | "done" | "pending" | "idle";

export function statusOf(path: string, vars: Vars): Status {
  if (vars.finished) return "done";
  const { stack } = vars;
  if (stack.length > 0 && path === stack[0]!.dir) return "open";
  for (const [depth, call] of stack.entries()) {
    if (call.listing === null || !path.startsWith(`${call.dir}/`)) continue;
    const rest = path.slice(call.dir.length + 1);
    const head = rest.split("/")[0]!;
    const at = call.listing.indexOf(head);
    if (at < call.index) return "done";
    if (at > call.index) return rest === head ? "pending" : "idle";
    if (depth === stack.length - 1) return rest === head ? "current" : "idle";
    if (rest === head) return "open";
  }
  return "idle";
}

function paintFor(status: Status, kind: Entry["kind"]): Paint {
  switch (status) {
    case "current":
      return CURRENT;
    case "open":
      return TOUCHED;
    case "pending":
      return PENDING;
    case "done":
      return kind === "file" ? DONE : VISITED;
    case "idle":
      return PLAIN;
  }
}

const ROW_H = 30;
const ROW_BOX_H = 24;
const INDENT = 22;
const TREE_W = 310;

/** Children in the order a file browser (and `sorted`) lists them. */
function sortedChildren(tree: Tree, id: string): Entry[] {
  return children(tree, id).sort((a, b) =>
    a.name < b.name ? -1 : a.name > b.name ? 1 : 0,
  );
}

function subtreeRows(tree: Tree, id: string): number {
  return 1 + sortedChildren(tree, id).reduce((n, e) => n + subtreeRows(tree, e.id), 0);
}

function icon(kind: Entry["kind"], stroke: string): Svgx {
  return kind === "dir" ? (
    <path
      d="M -7 -5 h 5 l 2 2 h 7 v 8 h -14 z"
      fill={color.pendingFill}
      stroke={stroke}
      strokeWidth={1.2}
    />
  ) : (
    <path
      d="M -5 -6 h 7 l 3 3 v 9 h -10 z"
      fill={color.panel}
      stroke={stroke}
      strokeWidth={1.2}
    />
  );
}

const CALL_W = 380;
const CHIP_H = 24;
const CHIP_GAP = 6;

/** Chip positions for a listing, wrapping onto new rows inside the call box. */
function chipLayout(names: readonly string[], width: number): { at: Vec2; w: number }[] {
  let x = 0;
  let y = 0;
  return names.map((name) => {
    const w = chipWidth(name, 11.5, 14);
    if (x > 0 && x + w > width) {
      x = 0;
      y += CHIP_H + CHIP_GAP;
    }
    const at = Vec2(x, y);
    x += w + CHIP_GAP;
    return { at, w };
  });
}

function callHeight(call: Call): number {
  const layout = chipLayout(call.listing ?? [], CALL_W - 24);
  const rows = layout.length === 0 ? 1 : layout.at(-1)!.at.y / (CHIP_H + CHIP_GAP) + 1;
  return 34 + rows * (CHIP_H + CHIP_GAP) + (call.fullpath === null ? 2 : 22);
}

function draw({ frame, input, d, draggedId, withInput }: DrawArgs<Input, Vars>): Svgx {
  const { vars } = frame;
  const { tree } = input;

  const entryView = (entry: Entry, path: string, depth: number, at: Vec2): Svgx => {
    const paint = paintFor(statusOf(path, vars), entry.kind);
    const id = uid("fs", entry.id);
    const isRoot = entry.parent === null;
    let offset = 1;
    const kids = sortedChildren(tree, entry.id).map((child) => {
      const view = entryView(
        child,
        join(path, child.name),
        depth + 1,
        Vec2(INDENT, offset * ROW_H),
      );
      offset += subtreeRows(tree, child.id);
      return view;
    });
    return (
      <g
        id={id}
        transform={translate(at)}
        dragologyZIndex={draggedId === id ? "/1" : false}
        dragologyOnDrag={
          isRoot
            ? undefined
            : () =>
                d
                  .closest(
                    moves(tree, entry.id).map((moved) => withInput({ tree: moved })),
                  )
                  .withFloating()
        }
        style={isRoot ? undefined : { cursor: "grab" }}
      >
        {box(TREE_W - depth * INDENT, ROW_BOX_H, { ...paint, radius: 7 })}
        <g transform={translate(14, ROW_BOX_H / 2)}>{icon(entry.kind, paint.stroke)}</g>
        {label(
          entry.kind === "dir" ? `${entry.name}/` : entry.name,
          Vec2(28, ROW_BOX_H / 2),
          {
            size: 12.5,
            mono: true,
            anchor: "start",
            weight: entry.kind === "dir" ? 600 : undefined,
          },
        )}
        {kids}
      </g>
    );
  };

  const root = tree.find((e) => e.parent === null)!;
  const treeView = (
    <g>
      {caption(`${ROOT}/ — drag entries between folders`, Vec2(20, 22))}
      {entryView(root, ROOT, 0, Vec2(20, 38))}
    </g>
  );

  const tops = vars.stack.map(
    (_, k) => 38 + vars.stack.slice(0, k).reduce((sum, c) => sum + callHeight(c) + 8, 0),
  );
  const stackView = (
    <g>
      {caption("call stack — innermost printnames at the bottom", Vec2(360, 22))}
      {vars.stack.map((call, depth) => {
        const top = depth === vars.stack.length - 1;
        const h = callHeight(call);
        const at = Vec2(360, tops[depth]!);
        const layout = chipLayout(call.listing ?? [], CALL_W - 24);
        const lastRowY = layout.length === 0 ? 0 : layout.at(-1)!.at.y;
        return (
          <g id={uid("call", call.dir)} transform={translate(at)}>
            {box(CALL_W, h, {
              fill: top ? color.panel : color.paper,
              stroke: top ? color.current : color.panelBorder,
              strokeWidth: top ? 1.6 : 1,
              radius: 8,
            })}
            {label(`printnames(${pyRepr(call.dir)})`, Vec2(12, 16), {
              size: 12.5,
              mono: true,
              weight: 600,
              anchor: "start",
              fill: top ? color.current : color.ink,
            })}
            {(call.listing ?? []).length === 0 &&
              label("[]  (empty folder)", Vec2(12, 34 + CHIP_H / 2), {
                size: 12,
                mono: true,
                anchor: "start",
                fill: color.muted,
              })}
            {(call.listing ?? []).map((name, k) => {
              const path = join(call.dir, name);
              const kind = entryAt(tree, path)?.kind ?? "file";
              return cell(Vec2(12, 30).add(layout[k]!.at), layout[k]!.w, CHIP_H, {
                id: uid("ls", path),
                text: name,
                radius: 12,
                textOptions: { size: 11.5 },
                ...paintFor(statusOf(path, vars), kind),
              });
            })}
            {call.fullpath !== null &&
              label(
                `fullpath = ${pyRepr(call.fullpath)}`,
                Vec2(12, 30 + lastRowY + CHIP_H + 16),
                {
                  size: 12,
                  mono: true,
                  anchor: "start",
                  fill: color.muted,
                },
              )}
          </g>
        );
      })}
    </g>
  );

  return (
    <g>
      {treeView}
      {stackView}
      {stdoutPanel(vars.stdout, Vec2(20, 360), 310, 128)}
    </g>
  );
}

export const filesystemDfsViz = defineViz<Input, Vars>({
  id: "filesystem-dfs",
  title: "Printing a folder tree, depth first",
  book: "Grokking Algorithms",
  chapter: "7 · Trees",
  summary:
    "printnames walks a folder in sorted order, printing each file's name and calling itself on each subfolder, so it finishes a whole subfolder before moving on: depth-first search over a tree.",
  drags: [
    "the timeline knob to step through the calls",
    "a file or folder into another folder to change the tree",
  ],
  sources: [SRC],
  initialInput: INITIAL_INPUT,
  run,
  draw,
  diagramHeight: 512,
});
