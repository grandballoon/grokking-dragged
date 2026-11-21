import { pyRepr } from "../../../core/python";
import { translate, Vec2, type Svgx } from "dragology";
import { box, caption, cell, label, uid } from "../../../ui/svg";
import { color } from "../../../ui/theme";
import { lineText } from "../../../core/pythonSource";
import type { Frame } from "../../../core/trace";
import { defineViz, type DrawArgs } from "../../defineViz";
import {
  CURRENT,
  DONE,
  EMPTY,
  PENDING,
  PLAIN,
  TOUCHED,
  VISITED,
  type Paint,
} from "../kit/paint";
import { stdoutPanel } from "../kit/stdout";
import { reprOrNull, varCell } from "../kit/varCell";
import { NODES, type Edge, type NodeName } from "../weightedGraph/graph";
import { FAINT_EDGE, graphView, weightSliders, type Stroke } from "../weightedGraph/draw";
import { acceptsEdge, INITIAL_INPUT, run, SRC, type Input, type Vars } from "./trace";

const OTHERS = NODES.filter((v) => v !== "start");

/** The node the algorithm is looking at: inside find_lowest_cost_node, its loop's node. */
function focus(vars: Vars): string | null {
  return vars.call !== null ? vars.call.node : vars.node;
}

/**
 * The neighbour being relaxed, while the frame is on one of the lines that
 * relax it. (`n` itself keeps its last value after the loop, as in Python.)
 */
function relaxed(frame: Frame<Vars>): string | null {
  return RELAX_LINES.includes(lineText(SRC, frame.line).trim()) ? frame.vars.n : null;
}
const RELAX_LINES = [
  "new_cost = cost + neighbors[n]",
  "if costs[n] > new_cost:",
  "parents[n] = node",
];

function nodePaint(node: NodeName, vars: Vars, n: string | null): Paint {
  if (node === "start") return DONE;
  if (node === focus(vars)) return CURRENT;
  if (node === n) return TOUCHED;
  if (vars.processed.includes(node)) return VISITED;
  if ((vars.costs[node] ?? Infinity) < Infinity) return PENDING;
  return PLAIN;
}

function edgeStroke(edge: Edge, vars: Vars, n: string | null): Stroke {
  if (n !== null && edge.from === vars.node && edge.to === n) {
    return { stroke: color.current, width: 2.6 };
  }
  if (vars.parents[edge.to] === edge.from) {
    return vars.processed.includes(edge.to)
      ? { stroke: color.done, width: 2.6 }
      : { stroke: color.pending, width: 2.2 };
  }
  return FAINT_EDGE;
}

/** A costs or parents row: highlighted while the algorithm reads or writes it. */
function rowPaint(node: string, vars: Vars, n: string | null): Paint {
  if (node === focus(vars)) return CURRENT;
  if (node === n) return TOUCHED;
  if (vars.processed.includes(node)) return VISITED;
  return PLAIN;
}

const ROW = 36;
const TOP = 262;

function draw({ frame, input, d, withInput }: DrawArgs<Input, Vars>): Svgx {
  const { vars } = frame;
  const stateFor = (edges: Input["edges"]) => withInput({ edges });
  const seeding = vars.processed.length === 0 && vars.node === null && vars.call === null;
  const n = relaxed(frame);

  const graph = (
    <g transform={translate(20, 24)}>
      {graphView({
        edges: input.edges,
        d,
        stateFor,
        accepts: acceptsEdge,
        nodePaint: (node) => nodePaint(node, vars, n),
        edgeStroke: (edge) => edgeStroke(edge, vars, n),
      })}
    </g>
  );

  const weights = (
    <g transform={translate(400, 0)}>
      {caption("graph — drag a knob to reweigh an edge", Vec2(0, 16))}
      <g transform={translate(0, 44)}>
        {weightSliders({
          edges: input.edges,
          d,
          stateFor,
          name: (e) => `graph["${e.from}"]["${e.to}"]`,
          ink: (e) =>
            n !== null && e.from === vars.node && e.to === n ? color.current : color.ink,
          trackX: 160,
          trackW: 165,
        })}
      </g>
      {label("costs and parents start out as the script hard-codes", Vec2(0, 196), {
        size: 11.5,
        anchor: "start",
        italic: true,
        fill: seeding ? color.ink : color.muted,
      })}
      {label("them: start's edge weights, else infinity and None.", Vec2(0, 213), {
        size: 11.5,
        anchor: "start",
        italic: true,
        fill: seeding ? color.ink : color.muted,
      })}
    </g>
  );

  /** A dict keyed by every node but start, drawn as rows of key and value. */
  const table = (
    name: string,
    dict: Record<string, unknown>,
    x: number,
    cellW: number,
  ) => (
    <g transform={translate(x, TOP + 10)}>
      {caption(name, Vec2(0, 0))}
      {OTHERS.map((v, k) => (
        <g transform={translate(0, 16 + k * ROW)}>
          {label(pyRepr(v), Vec2(0, 15), {
            size: 12,
            mono: true,
            anchor: "start",
            fill: color.muted,
          })}
          {cell(Vec2(42, 0), cellW, 30, {
            text: v in dict ? pyRepr(dict[v]) : "",
            textOptions: { size: 13 },
            ...(v in dict ? rowPaint(v, vars, n) : EMPTY),
          })}
        </g>
      ))}
    </g>
  );

  const call = vars.call;
  const findPanel = (
    <g transform={translate(300, 388)}>
      {box(440, 86, {
        fill: call === null ? color.paper : color.panel,
        stroke: call === null ? color.panelBorder : color.current,
        strokeWidth: call === null ? 1 : 1.5,
        radius: 8,
        dash: call === null ? "4 3" : undefined,
      })}
      {caption(
        call === null
          ? "find_lowest_cost_node(costs) — not running"
          : "find_lowest_cost_node(costs)",
        Vec2(12, 16),
        { fill: call === null ? color.faint : color.current },
      )}
      {varCell("lowest_cost", call && pyRepr(call.lowest_cost), Vec2(12, 34), 90, {
        size: 12,
      })}
      {varCell(
        "lowest_cost_node",
        call && pyRepr(call.lowest_cost_node),
        Vec2(122, 34),
        116,
        {
          size: 12,
          paint: call?.lowest_cost_node ? PENDING : PLAIN,
        },
      )}
      {varCell("node", reprOrNull(call?.node), Vec2(258, 34), 76, {
        size: 12,
        paint: CURRENT,
      })}
      {varCell("cost", reprOrNull(call?.cost), Vec2(354, 34), 74, { size: 12 })}
    </g>
  );

  const main = (
    <g>
      {varCell("node", reprOrNull(vars.node), Vec2(300, TOP + 10), 70, {
        paint: vars.call === null ? CURRENT : PLAIN,
      })}
      {varCell("cost", reprOrNull(vars.cost), Vec2(382, TOP + 10), 60)}
      {varCell("neighbors", reprOrNull(vars.neighbors), Vec2(454, TOP + 10), 286, {
        size: 12,
      })}
      {varCell("n", reprOrNull(vars.n), Vec2(300, TOP + 68), 70)}
      {varCell("new_cost", reprOrNull(vars.new_cost), Vec2(382, TOP + 68), 60)}
      {caption("processed", Vec2(454, TOP + 68))}
      {vars.processed.map((v, k) =>
        cell(Vec2(454 + k * 62, TOP + 80), 56, 30, {
          id: uid("processed", v),
          text: pyRepr(v),
          textOptions: { size: 12 },
          ...VISITED,
        }),
      )}
    </g>
  );

  return (
    <g>
      {graph}
      {weights}
      <line
        {...Vec2(20, 250).xy1()}
        {...Vec2(740, 250).xy2()}
        stroke={color.panelBorder}
      />
      {table("costs", vars.costs, 20, 60)}
      {table("parents", vars.parents, 150, 84)}
      {main}
      {findPanel}
      {stdoutPanel(vars.stdout, Vec2(20, TOP + 164), 260, 50)}
    </g>
  );
}

export const dijkstraViz = defineViz<Input, Vars>({
  id: "dijkstras-algorithm",
  title: "Dijkstra's algorithm",
  book: "Grokking Algorithms",
  chapter: "9 · Dijkstra's algorithm",
  summary:
    "Find the cheapest path from start to every node of a weighted graph. Each round processes the cheapest unprocessed node and checks whether going through it makes any neighbour cheaper.",
  drags: [
    "the timeline knob to step through the algorithm",
    "a purple knob to change an edge's weight",
    "an arrowhead or a purple tail dot onto another node to rewire an edge",
  ],
  sources: [SRC],
  initialInput: INITIAL_INPUT,
  run,
  draw,
  diagramHeight: 500,
});
