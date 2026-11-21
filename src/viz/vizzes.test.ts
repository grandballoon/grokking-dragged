/**
 * Renders every step of every visualization and checks the rules Dragology
 * relies on: element ids are unique and slash-free, no React `key`s or
 * fragments appear, and every drag spec can be built. Building a spec runs
 * the trace for every candidate input, so this also exercises each port on
 * every input the reader can drag to from these states.
 *
 * It also drags the timeline knob half-way between each pair of neighbouring
 * steps. Mid-drag, Dragology blends the two steps' drawings element by
 * element and throws if they don't line up (an element changing type, or an
 * optional child appearing without a `dragologyKey`), which rendering each
 * step on its own never shows.
 */
import {
  dragSpecToBehavior,
  getElementPositionCheap,
  renderStateReadOnly,
  Vec2,
  type DragInitContext,
  type DragSpecBrand,
  type DragSpecData,
  type Draggable,
  type Svgx,
} from "dragology";
import { Fragment, isValidElement, type ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { VIZZES } from "../app/registry";
import type { VizState } from "../core/stepping";

type Props = {
  id?: unknown;
  children?: ReactNode;
  dragologyOnDrag?: () => DragSpecBrand;
};

function walk(
  node: ReactNode,
  visit: (el: Svgx & { key: unknown; props: Props }) => void,
) {
  if (Array.isArray(node)) {
    node.forEach((child) => walk(child, visit));
    return;
  }
  if (!isValidElement(node)) return;
  const el = node as Svgx & { key: unknown; props: Props };
  visit(el);
  walk(el.props.children, visit);
}

/**
 * Render a state the way Dragology does (which validates the tree), and hand
 * back the raw tree the draggable returned, whose drag specs close over
 * Dragology's real spec builder.
 */
function render(entry: (typeof VIZZES)[number], state: VizState<unknown>): Svgx {
  let tree: Svgx | undefined;
  const capture: Draggable<VizState<unknown>> = (props) => {
    tree = entry.draggable(props);
    return tree;
  };
  renderStateReadOnly({ ...dragContext(entry, state, null), draggable: capture }, state);
  if (tree === undefined) throw new Error("draggable was not called");
  return tree;
}

function dragContext(
  entry: (typeof VIZZES)[number],
  state: VizState<unknown>,
  draggedId: string | null,
): DragInitContext<VizState<unknown>> {
  return {
    draggable: entry.draggable,
    draggedPath: draggedId === null ? "" : `${draggedId}/`,
    draggedId,
    anchorPos: Vec2(0, 0),
    startState: state,
    debug: { varyVisualizer: false },
  };
}

function findById(node: ReactNode, id: string): Props | undefined {
  let hit: Props | undefined;
  walk(node, (el) => {
    if (hit === undefined && el.props.id === id) hit = el.props;
  });
  return hit;
}

/**
 * Each test walks every step of a visualization, and building its drag
 * specs runs the trace of every candidate input: about two seconds for the
 * biggest on an idle machine, which the default 5 s timeout doesn't cover
 * once the whole suite runs in parallel.
 */
const TIMEOUT_MS = 30_000;

describe.each(VIZZES.map((v) => [v.id, v] as const))(
  "%s",
  { timeout: TIMEOUT_MS },
  (_, entry) => {
    const count = entry.frameCount(entry.initialState);

    it("has at least two steps", () => {
      expect(count).toBeGreaterThan(1);
    });

    it("renders every step with valid ids, no keys and buildable drag specs", () => {
      for (let step = 0; step < count; step++) {
        const state = { ...entry.initialState, step };
        const ids = new Set<string>();
        walk(render(entry, state), (el) => {
          expect(el.type, `fragment at step ${step}`).not.toBe(Fragment);
          expect(el.key, `key at step ${step}`).toBeNull();
          if (el.props.id !== undefined) {
            const id = String(el.props.id);
            expect(id, "slash in id").not.toContain("/");
            expect(ids.has(id), `duplicate id ${id} at step ${step}`).toBe(false);
            ids.add(id);
          }
          el.props.dragologyOnDrag?.();
        });
      }
    });

    it("blends cleanly half-way between every pair of neighbouring steps", () => {
      const start = entry.initialState;
      const ctx = dragContext(entry, start, "scrub-knob");
      const knob = findById(render(entry, start), "scrub-knob");
      expect(knob?.dragologyOnDrag).toBeDefined();
      const spec = knob!.dragologyOnDrag!() as unknown as DragSpecData<VizState<unknown>>;
      const behavior = dragSpecToBehavior(spec, ctx);
      const at = (step: number) => getElementPositionCheap(ctx, { ...start, step })!;
      for (let step = 0; step + 1 < count; step++) {
        const pointer = at(step).lerp(at(step + 1), 0.5);
        expect(
          () => behavior({ pointer }).preview(),
          `steps ${step}-${step + 1}`,
        ).not.toThrow();
      }
    });
  },
);
