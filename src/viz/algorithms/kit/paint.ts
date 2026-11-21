/**
 * The colour roles of `src/ui/theme.ts` as fill and stroke pairs, so a
 * drawing names what an element means (`CURRENT`) rather than its colours.
 */
import { color } from "../../../ui/theme";

export type Paint = { readonly fill: string; readonly stroke: string };

export const PLAIN: Paint = { fill: color.cell, stroke: color.cellBorder };
/** A slot with nothing in it yet, e.g. an unassigned variable. */
export const EMPTY: Paint = { fill: color.cellEmpty, stroke: color.rule };
/** Looking at this now. */
export const CURRENT: Paint = { fill: color.currentFill, stroke: color.current };
/** Waiting its turn. */
export const PENDING: Paint = { fill: color.pendingFill, stroke: color.pending };
/** Done, or found. */
export const DONE: Paint = { fill: color.doneFill, stroke: color.done };
/** Already handled. */
export const VISITED: Paint = { fill: color.visitedFill, stroke: color.visited };
/** Looked at, but not the main focus: a blue outline on white. */
export const TOUCHED: Paint = { fill: color.cell, stroke: color.current };
