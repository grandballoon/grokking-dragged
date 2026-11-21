/**
 * Drawing and drag specs for the weighted graph both Dijkstra pages edit:
 * the graph itself, whose edge ends can be rewired, and a list of weight
 * sliders, one per edge. Both are plain functions over the edge list; the
 * caller supplies the colours (from its own frame) and `stateFor`, which
 * turns an edited edge list into the viz state to preview.
 */
import { translate, Vec2, type DragSpecBuilder, type Svgx } from "dragology";
import { arrow, box, label, uid } from "../../../ui/svg";
import { color } from "../../../ui/theme";
import type { Paint } from "../kit/paint";
import {
  MAX_WEIGHT,
  MIN_WEIGHT,
  NODES,
  rewirings,
  toGraphOrder,
  withWeight,
  type Accepts,
  type Edge,
  type Edges,
  type End,
  type NodeName,
} from "./graph";

export const NODE_R = 24;

/** Node centres, relative to the graph's origin; the graph fits in 360×230. */
export const POSITIONS: Readonly<Record<NodeName, Vec2>> = {
  start: Vec2(45, 115),
  a: Vec2(180, 40),
  b: Vec2(180, 190),
  fin: Vec2(315, 115),
};

export type Stroke = { readonly stroke: string; readonly width: number };

export const FAINT_EDGE: Stroke = { stroke: color.faint, width: 1.6 };

const INSET = NODE_R + 2;
const BEND = 22;

type Geometry = {
  readonly tail: Vec2;
  readonly tip: Vec2;
  readonly bend: number;
  /** Where the weight tag sits: 40% of the way along, so crossing edges' tags don't meet. */
  readonly tag: Vec2;
};

/** The same curve `arrow` draws: ends pulled in by INSET, bowed when the pair is two-way. */
function geometry(edge: Edge, edges: Edges): Geometry {
  const a = POSITIONS[edge.from];
  const b = POSITIONS[edge.to];
  const twoWay = edges.some((e) => e.from === edge.to && e.to === edge.from);
  const bend = twoWay ? BEND : 0;
  const unit = b.sub(a).norm();
  const tail = a.add(unit.mul(INSET));
  const tip = b.sub(unit.mul(INSET));
  const control = tail.mid(tip).add(unit.perp().mul(bend));
  const t = 0.4;
  const tag = tail
    .mul((1 - t) * (1 - t))
    .add(control.mul(2 * t * (1 - t)))
    .add(tip.mul(t * t));
  return { tail, tip, bend, tag };
}

export type GraphViewArgs<T extends object> = {
  readonly edges: Edges;
  readonly d: DragSpecBuilder<T>;
  readonly stateFor: (edges: Edges) => T;
  readonly accepts: Accepts;
  readonly nodePaint: (node: NodeName) => Paint;
  readonly edgeStroke: (edge: Edge) => Stroke;
};

/**
 * The graph, with every edge's tail dot and arrowhead draggable onto
 * another node. Positioned at the local origin.
 */
export function graphView<T extends object>(args: GraphViewArgs<T>): Svgx {
  const { edges, d, stateFor, accepts } = args;
  const rewire = (edge: Edge, end: End) => () =>
    d.closest(rewirings(edges, edge.id, end, accepts).map(stateFor));

  return (
    <g>
      {edges.map((edge) => {
        const g = geometry(edge, edges);
        const stroke = args.edgeStroke(edge);
        return (
          <g id={uid("edge", edge.id)}>
            {arrow(POSITIONS[edge.from], POSITIONS[edge.to], {
              inset: INSET,
              bend: g.bend,
              stroke: stroke.stroke,
              width: stroke.width,
            })}
            <g transform={translate(g.tag)}>
              <g transform={translate(-11, -9)}>
                {box(22, 18, {
                  radius: 5,
                  fill: color.panel,
                  stroke: stroke.stroke,
                  strokeWidth: 1,
                })}
              </g>
              {label(String(edge.weight), Vec2(0, 0), {
                size: 11.5,
                mono: true,
                weight: 600,
                fill: stroke.stroke === color.faint ? color.muted : stroke.stroke,
              })}
            </g>
          </g>
        );
      })}
      {NODES.map((node) => {
        const paint = args.nodePaint(node);
        return (
          <g id={uid("node", node)} transform={translate(POSITIONS[node])}>
            <circle r={NODE_R} fill={paint.fill} stroke={paint.stroke} strokeWidth={2} />
            {label(node, Vec2(0, 0), { size: 12, weight: 600 })}
          </g>
        );
      })}
      {edges.map((edge) => {
        const g = geometry(edge, edges);
        return (
          <g id={uid("ends", edge.id)} dragologyZIndex={2}>
            <g
              id={uid("tail", edge.id)}
              transform={translate(g.tail)}
              dragologyOnDrag={rewire(edge, "from")}
              style={{ cursor: "grab" }}
            >
              <circle r={9} fill="transparent" />
              <circle r={3.5} fill={color.pointer} />
            </g>
            <g
              id={uid("head", edge.id)}
              transform={translate(g.tip)}
              dragologyOnDrag={rewire(edge, "to")}
              style={{ cursor: "grab" }}
            >
              <circle r={10} fill="transparent" />
            </g>
          </g>
        );
      })}
    </g>
  );
}

export type SliderArgs<T extends object> = {
  readonly edges: Edges;
  readonly d: DragSpecBuilder<T>;
  readonly stateFor: (edges: Edges) => T;
  /** How the Python names this weight, e.g. `graph["start"]["a"]`. */
  readonly name: (edge: Edge) => string;
  /** The colour of an edge's name: e.g. blue while the algorithm reads it. */
  readonly ink: (edge: Edge) => string;
  /** Where the track starts, relative to the names. */
  readonly trackX: number;
  readonly trackW: number;
};

const SLIDER_ROW = 28;

/**
 * One row per edge, in the order the Python dict lists them: the weight's
 * Python name and a slider whose knob snaps to whole weights. Positioned
 * with the first row's centre at the local origin.
 */
export function weightSliders<T extends object>(args: SliderArgs<T>): Svgx {
  const { edges, d, stateFor, trackX, trackW } = args;
  const span = MAX_WEIGHT - MIN_WEIGHT;
  const xOf = (w: number) => trackX + ((w - MIN_WEIGHT) / span) * trackW;
  const weights = Array.from({ length: span + 1 }, (_, k) => MIN_WEIGHT + k);

  return (
    <g>
      {toGraphOrder(edges).map((edge, row) => (
        <g id={uid("weight-row", edge.id)} transform={translate(0, row * SLIDER_ROW)}>
          {label(args.name(edge), Vec2(0, 0), {
            size: 11.5,
            mono: true,
            anchor: "start",
            fill: args.ink(edge),
          })}
          <line
            {...Vec2(xOf(MIN_WEIGHT), 0).xy1()}
            {...Vec2(xOf(MAX_WEIGHT), 0).xy2()}
            stroke={color.rule}
            strokeWidth={4}
            strokeLinecap="round"
          />
          {weights.map((w) => (
            <circle transform={translate(xOf(w), 0)} r={1.5} fill={color.faint} />
          ))}
          <g
            id={uid("knob", edge.id)}
            transform={translate(xOf(edge.weight), 0)}
            dragologyZIndex={1}
            dragologyOnDrag={() =>
              d.closest(weights.map((w) => stateFor(withWeight(edges, edge.id, w))))
            }
            style={{ cursor: "grab" }}
          >
            <circle r={9.5} fill={color.pointer} />
            {label(String(edge.weight), Vec2(0, 0), {
              size: 11,
              mono: true,
              weight: 700,
              fill: "white",
            })}
          </g>
        </g>
      ))}
    </g>
  );
}
