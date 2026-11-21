import { translate, Vec2, type Svgx } from "dragology";
import { caption, cell } from "../../../ui/svg";
import { pyRepr } from "../../../core/python";
import { EMPTY, PLAIN, type Paint } from "./paint";

/** Python's repr of a variable's value, or null while it is unset. */
export function reprOrNull(value: unknown): string | null {
  return value === null || value === undefined ? null : pyRepr(value);
}

export type VarCellOptions = {
  readonly paint?: Paint;
  readonly id?: string;
  /** Text size; 13 by default. */
  readonly size?: number;
  readonly weight?: number;
  /** Cell height; 30 by default. */
  readonly h?: number;
};

/**
 * A Python variable: its name as a caption, its value in a cell below. `at`
 * is the caption's left end; the cell's top sits 12px under it. An unset
 * variable (`null` text) shows an empty cell.
 */
export function varCell(
  name: string,
  text: string | null,
  at: Vec2,
  w: number,
  opts: VarCellOptions = {},
): Svgx {
  const paint = text === null ? EMPTY : (opts.paint ?? PLAIN);
  return (
    <g transform={translate(at)}>
      {caption(name, Vec2(0, 0))}
      {cell(Vec2(0, 12), w, opts.h ?? 30, {
        id: opts.id,
        text: text ?? "",
        textOptions: { size: opts.size ?? 13, weight: opts.weight },
        ...paint,
      })}
    </g>
  );
}
