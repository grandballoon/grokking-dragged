import { Vec2, type Svgx } from "dragology";
import { caption, label, optional, uid } from "../../../../ui/svg";
import { color } from "../../../../ui/theme";
import { defineViz, type DrawArgs } from "../../../defineViz";
import {
  chain,
  currentStyle,
  neutral,
  pendingStyle,
  visitedStyle,
  type Style,
} from "../shared/draw";
import {
  adjacencyView,
  argTag,
  dictTable,
  graphView,
  local,
  scriptView,
  type EdgeLook,
} from "./draw";
import type { Colour, Key, StackEntry } from "./graph";
import { DFS_INPUT } from "./input";
import {
  runDfs,
  SLL_SRC,
  SRC,
  STACK_SRC,
  type Edge,
  type Input,
  type Vars,
} from "./trace";

/**
 * The search's own colours, drawn as they are named: white is not visited
 * yet, grey is on the current path, black is finished.
 */
const COLOUR: Readonly<Record<Colour, Style & { ink: string }>> = {
  white: { fill: color.cell, stroke: color.cellBorder, ink: color.ink },
  grey: { fill: "#c4c8ce", stroke: color.visited, ink: color.ink },
  black: { fill: color.ink, stroke: color.ink, ink: color.panel },
};

/** The popped vertex is ringed: blue while it is handled, red when it closes a cycle. */
function ring(vars: Vars, key: Key): string | undefined {
  if (key !== vars.v) return undefined;
  return vars.acyclic === false && vars.col === "grey" ? color.bad : color.current;
}

function vertexStyle(vars: Vars, key: Key) {
  const c = vars.color?.get(key);
  const base = c === undefined ? { ...neutral, ink: color.ink } : COLOUR[c];
  return { ...base, ring: ring(vars, key) };
}

function edgeLook(vars: Vars, e: Edge, inserted: boolean): EdgeLook {
  if (!inserted) return { stroke: color.faint, width: 1.4, dash: "4 4" };
  if (e.from === vars.v && e.to === vars.w) return { stroke: color.current, width: 2.4 };
  return { stroke: color.muted, width: 1.6 };
}

const BOTTOM_X = 200;

function stackView(vars: Vars, y: number): Svgx | null {
  if (vars.stack === null) return null;
  return (
    <g>
      {caption("stack: (mark_as_black, v) pairs, top first", Vec2(BOTTOM_X, y - 14))}
      {optional(
        "empty",
        vars.stack._data._head === null &&
          label("empty", Vec2(BOTTOM_X, y + 11), {
            size: 12,
            mono: true,
            anchor: "start",
            fill: color.faint,
          }),
      )}
      {chain<StackEntry>(vars.stack._data._head, {
        id: (n) => uid("g-stack", n.uid),
        at: Vec2(BOTTOM_X, y),
        nodeW: 44,
        nodeH: 22,
        gap: 8,
        text: ([black, v]) => `(${black ? "T" : "F"},${v})`,
        textSize: 10.5,
        style: (n) => (n._data[0] ? visitedStyle : pendingStyle),
      })}
      {label("T, F = True, False", Vec2(BOTTOM_X + 540, y - 14), {
        size: 10.5,
        mono: true,
        anchor: "end",
        fill: color.faint,
      })}
    </g>
  );
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
  const bool = (b: boolean) => (b ? "True" : "False");
  return (
    <g>
      {scriptView({
        search: "dfs",
        input,
        op: vars.op,
        d,
        setState,
        draggedId,
        withInput,
      })}
      {graphView({
        input,
        vars,
        vertexStyle: (key) => vertexStyle(vars, key),
        edgeLook: (e, inserted) => edgeLook(vars, e, inserted),
        d,
        draggedId,
        withInput,
      })}
      {argTag({
        id: "g-start",
        text: "start",
        at: input.start,
        below: false,
        candidates: (start) => ({ ...input, start }),
        input,
        d,
        draggedId,
        withInput,
      })}
      {adjacencyView(vars, input, (from, to) =>
        from === vars.v && to === vars.w ? currentStyle : neutral,
      )}
      <g>
        {optional(
          "v",
          vars.v !== null && local("v", String(vars.v), Vec2(520, 276), color.current),
        )}
        {optional("w", vars.w !== null && local("w", String(vars.w), Vec2(600, 276)))}
        {optional(
          "mark_as_black",
          vars.mark_as_black !== null &&
            local("mark_as_black", bool(vars.mark_as_black), Vec2(520, 300)),
        )}
        {optional(
          "col",
          vars.col !== null && local("col", `'${vars.col}'`, Vec2(520, 324)),
        )}
        {optional(
          "acyclic",
          vars.acyclic !== null &&
            local(
              "acyclic",
              bool(vars.acyclic),
              Vec2(520, 352),
              vars.acyclic ? color.done : color.bad,
            ),
        )}
      </g>
      {optional(
        "color-pending",
        vars.color === null &&
          caption("color is made when dfs starts", Vec2(BOTTOM_X, 410)),
      )}
      {optional(
        "color",
        vars.color !== null &&
          dictTable(Vec2(BOTTOM_X, 400), input.vertices, [
            {
              name: "color",
              cell: (k) => {
                const c = vars.color!.get(k) ?? "white";
                return { text: c, style: COLOUR[c], ink: COLOUR[c].ink };
              },
            },
          ]),
      )}
      {optional("stack", stackView(vars, 480))}
    </g>
  );
}

export const dfsGraphViz = defineViz<Input, Vars>({
  id: "ds-graph-dfs",
  title: "Graph: depth-first search",
  book: "Grokking Data Structures",
  chapter: "13 · Graphs",
  summary:
    "Search the graph depth first with a stack of (mark_as_black, vertex) pairs. A vertex turns grey while its neighbours are explored and black once they are done; reaching a grey vertex again means there is a cycle.",
  drags: [
    "the timeline knob to step through the build and the search",
    "an insert_edge call in the script to reorder the edges, and with them the order dfs goes deep",
    "a purple dot on an arrowhead to rewire that edge: point 4 → 1 elsewhere and the cycle is gone",
    "the purple start tag onto another vertex",
  ],
  sources: [SRC, SLL_SRC, STACK_SRC],
  initialInput: DFS_INPUT,
  run: runDfs,
  draw,
  diagramHeight: 560,
});
