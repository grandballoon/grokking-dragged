import { pyRepr } from "../../../core/python";
import { translate, Vec2, type Svgx } from "dragology";
import { caption, cell, label, uid } from "../../../ui/svg";
import { color } from "../../../ui/theme";
import { lineText } from "../../../core/pythonSource";
import type { Frame } from "../../../core/trace";
import { defineViz, type DrawArgs } from "../../defineViz";
import {
  CURRENT,
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
import {
  entryRepr,
  INITIAL_INPUT,
  run,
  SRC,
  type Entry,
  type Input,
  type Vars,
} from "./trace";

const TOP = 262;

/**
 * The neighbour being relaxed, while the frame is on one of the lines that
 * relax it. (`neighbor` keeps its last value after the loop, as in Python.)
 */
function relaxed(frame: Frame<Vars>): string | null {
  return RELAX_LINES.includes(lineText(SRC, frame.line).trim())
    ? frame.vars.neighbor
    : null;
}
const RELAX_LINES = [
  "distance = current_distance + weight",
  "if distance < distances[neighbor]:",
  "distances[neighbor] = distance",
  "heapq.heappush(pq, (distance, neighbor))",
];

/** An entry whose vertex is already known to be closer: `continue` will skip it. */
const isStale = ([dist, vertex]: Entry, vars: Vars) =>
  dist > (vars.distances[vertex] ?? Infinity);

function nodePaint(node: NodeName, vars: Vars, neighbor: string | null): Paint {
  if (node === vars.current_vertex) return CURRENT;
  if (node === neighbor) return TOUCHED;
  if (vars.pq.some((e) => e[1] === node && !isStale(e, vars))) return PENDING;
  if ((vars.distances[node] ?? Infinity) < Infinity) return VISITED;
  return PLAIN;
}

const relaxing = (edge: Edge, vars: Vars, neighbor: string | null) =>
  neighbor !== null && edge.from === vars.current_vertex && edge.to === neighbor;

function edgeStroke(edge: Edge, vars: Vars, neighbor: string | null): Stroke {
  return relaxing(edge, vars, neighbor)
    ? { stroke: color.current, width: 2.6 }
    : FAINT_EDGE;
}

function entryPaint(entry: Entry, vars: Vars): Paint {
  return isStale(entry, vars) ? VISITED : PENDING;
}

/** Heap tree layout: centres of positions 0..6 (three levels). */
const HEAP_X = 420;
const HEAP_W = 320;
const HEAP_CHIP = Vec2(74, 28);
function heapCentre(k: number): Vec2 {
  const level = Math.floor(Math.log2(k + 1));
  const first = 2 ** level - 1;
  const slots = 2 ** level;
  const slotW = HEAP_W / slots;
  return Vec2(HEAP_X + slotW * (k - first + 0.5), TOP + 38 + level * 48);
}

const PQ_CHIP_W = 78;

function draw({ frame, input, d, withInput }: DrawArgs<Input, Vars>): Svgx {
  const { vars } = frame;
  const stateFor = (edges: Input["edges"]) => withInput({ edges });
  const neighbor = relaxed(frame);

  const graph = (
    <g transform={translate(20, 24)}>
      {graphView({
        edges: input.edges,
        d,
        stateFor,
        accepts: () => true,
        nodePaint: (node) => nodePaint(node, vars, neighbor),
        edgeStroke: (edge) => edgeStroke(edge, vars, neighbor),
      })}
    </g>
  );

  const weights = (
    <g transform={translate(400, 0)}>
      {caption("example_graph — drag a knob to reweigh an edge", Vec2(0, 16))}
      <g transform={translate(0, 44)}>
        {weightSliders({
          edges: input.edges,
          d,
          stateFor,
          name: (e) => `graph['${e.from}']['${e.to}']`,
          ink: (e) => (relaxing(e, vars, neighbor) ? color.current : color.ink),
          trackX: 160,
          trackW: 165,
        })}
      </g>
    </g>
  );

  const distances = (
    <g transform={translate(20, TOP + 10)}>
      {caption("distances", Vec2(0, 0))}
      {NODES.map((v, k) => {
        const known = v in vars.distances;
        return (
          <g transform={translate(0, 16 + k * 34)}>
            {label(pyRepr(v), Vec2(0, 14), {
              size: 12,
              mono: true,
              anchor: "start",
              fill: color.muted,
            })}
            {cell(Vec2(56, 0), 64, 28, {
              text: known ? pyRepr(vars.distances[v]) : "",
              textOptions: { size: 13 },
              ...(!known
                ? EMPTY
                : v === vars.current_vertex
                  ? CURRENT
                  : v === neighbor
                    ? TOUCHED
                    : PLAIN),
            })}
          </g>
        );
      })}
    </g>
  );

  const locals = (
    <g>
      {varCell(
        "current_distance",
        reprOrNull(vars.current_distance),
        Vec2(160, TOP + 10),
        118,
        {
          paint: CURRENT,
        },
      )}
      {varCell(
        "current_vertex",
        reprOrNull(vars.current_vertex),
        Vec2(290, TOP + 10),
        104,
        {
          paint: CURRENT,
        },
      )}
      {varCell("neighbor", reprOrNull(vars.neighbor), Vec2(160, TOP + 68), 80, {
        paint: TOUCHED,
      })}
      {varCell("weight", reprOrNull(vars.weight), Vec2(252, TOP + 68), 60)}
      {varCell("distance", reprOrNull(vars.distance), Vec2(324, TOP + 68), 70)}
    </g>
  );

  const tree = (
    <g>
      {caption("pq as a heap: each parent ≤ its children", Vec2(HEAP_X, TOP + 10))}
      {vars.pq.map((_, k) => {
        if (k === 0) return <g id={uid("heap-link", k)} />;
        const parent = heapCentre((k - 1) >> 1).add(Vec2(0, HEAP_CHIP.y / 2));
        const child = heapCentre(k).sub(Vec2(0, HEAP_CHIP.y / 2));
        return (
          <line
            id={uid("heap-link", k)}
            {...parent.xy1()}
            {...child.xy2()}
            stroke={color.rule}
            strokeWidth={1.5}
          />
        );
      })}
      {vars.pq.map((entry, k) =>
        cell(heapCentre(k).sub(HEAP_CHIP.div(2)), HEAP_CHIP.x, HEAP_CHIP.y, {
          id: uid("heap", entry[0], entry[1]),
          text: entryRepr(entry),
          textOptions: { size: 11 },
          strokeWidth: k === 0 ? 2.2 : 1.5,
          ...entryPaint(entry, vars),
        }),
      )}
    </g>
  );

  const list = (
    <g transform={translate(160, TOP + 162)}>
      {caption("pq (list) — heappop takes pq[0]", Vec2(0, 0))}
      {vars.pq.length === 0 &&
        label("[]", Vec2(4, 27), {
          size: 13,
          mono: true,
          anchor: "start",
          fill: color.muted,
        })}
      {vars.pq.map((entry, k) => (
        <g
          id={uid("pq", entry[0], entry[1])}
          transform={translate(k * (PQ_CHIP_W + 6), 12)}
        >
          {cell(Vec2(0, 0), PQ_CHIP_W, 30, {
            text: entryRepr(entry),
            textOptions: { size: 11.5 },
            ...entryPaint(entry, vars),
          })}
          {label(String(k), Vec2(PQ_CHIP_W / 2, 40), {
            size: 10,
            mono: true,
            fill: color.faint,
          })}
        </g>
      ))}
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
      {distances}
      {locals}
      {tree}
      {list}
      {stdoutPanel(vars.stdout, Vec2(20, TOP + 222), 720, 28)}
    </g>
  );
}

export const dijkstraPqViz = defineViz<Input, Vars>({
  id: "dijkstras-algorithm-priority-queue",
  title: "Dijkstra's algorithm with a priority queue",
  book: "Grokking Algorithms",
  chapter: "9 · Dijkstra's algorithm",
  summary:
    "The same search, with a heap instead of a scan: pop the closest vertex off a priority queue, push every neighbour it brings closer, and skip stale entries as they surface.",
  drags: [
    "the timeline knob to step through the algorithm",
    "a purple knob to change an edge's weight",
    "an arrowhead or a purple tail dot onto another node to rewire an edge",
  ],
  sources: [SRC],
  initialInput: INITIAL_INPUT,
  run,
  draw,
  diagramHeight: 536,
});
