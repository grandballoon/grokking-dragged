/**
 * Drawing helpers shared by this folder's visualizations: a singly linked
 * list as a row of boxes, and the node styles. Plain functions returning
 * SVG, as Dragology needs.
 */
import { translate, Vec2, type Svgx } from "dragology";
import { arrow, box, label } from "../../../../ui/svg";
import { color } from "../../../../ui/theme";
import type { Node } from "../../ports/singly_linked_list";

/** A node as it appears in a frame: plain data, its methods gone. */
export type NodeData<T> = Pick<Node<T>, "uid" | "_data"> & { _next: NodeData<T> | null };

/** The nodes of a list, head first. */
function chainNodes<T>(head: NodeData<T> | null): NodeData<T>[] {
  const nodes: NodeData<T>[] = [];
  for (let n = head; n !== null; n = n._next) nodes.push(n);
  return nodes;
}

export type Style = { readonly fill: string; readonly stroke: string };

export const neutral: Style = { fill: color.cell, stroke: color.cellBorder };
export const currentStyle: Style = { fill: color.currentFill, stroke: color.current };
export const pendingStyle: Style = { fill: color.pendingFill, stroke: color.pending };
export const doneStyle: Style = { fill: color.doneFill, stroke: color.done };
export const visitedStyle: Style = { fill: color.visitedFill, stroke: color.visited };

export type ChainOptions<T> = {
  /** Prefix of each node's id; the node's uid completes it. */
  readonly id: (node: NodeData<T>) => string;
  readonly at: Vec2;
  readonly nodeW: number;
  readonly nodeH: number;
  /** Space between one node and the next, which the link arrow spans. */
  readonly gap: number;
  readonly text: (value: T) => string;
  readonly style: (node: NodeData<T>) => Style;
  readonly textSize?: number;
};

/**
 * A linked list as boxes left to right, head first, each with an arrow to
 * its successor. Every node is its own layer, so a node keeps its place in
 * the picture as nodes are added in front of it or unlinked around it.
 */
export function chain<T>(head: NodeData<T> | null, opts: ChainOptions<T>): Svgx[] {
  const { nodeW, nodeH, gap } = opts;
  return chainNodes(head).map((node, i) => {
    const style = opts.style(node);
    return (
      <g
        id={opts.id(node)}
        transform={translate(opts.at.add(Vec2(i * (nodeW + gap), 0)))}
      >
        {arrow(Vec2(nodeW, nodeH / 2), Vec2(nodeW + gap, nodeH / 2), {
          head: 6,
          opacity: node._next === null ? 0 : 1,
        })}
        {box(nodeW, nodeH, { fill: style.fill, stroke: style.stroke, radius: 5 })}
        {label(opts.text(node._data), Vec2(nodeW / 2, nodeH / 2), {
          size: opts.textSize ?? 13,
          mono: true,
          weight: 600,
        })}
      </g>
    );
  });
}
