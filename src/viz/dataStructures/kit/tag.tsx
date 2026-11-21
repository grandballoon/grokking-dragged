/**
 * The purple tag: a pill naming a pointer (`_front`, `_head`, `self`) or a
 * handle the reader drags to edit the input. Plain functions returning SVG,
 * as Dragology needs.
 */
import { translate, Vec2, type DragSpecBrand, type Svgx } from "dragology";
import { label } from "../../../ui/svg";
import { color } from "../../../ui/theme";

export const TAG_H = 18;
const TEXT_SIZE = 11;
/** Advance of one character of the monospace font, per pixel of font size. */
const MONO_ADVANCE = 0.6;

/** The width a tag needs for `text`. */
function tagWidth(text: string): number {
  return text.length * TEXT_SIZE * MONO_ADVANCE + 12;
}

export type TagOptions = {
  /** Defaults to `tagWidth(text)`; pass one to line several tags up. */
  readonly width?: number;
  readonly faded?: boolean;
};

/** A tag centred on the local origin. */
export function tag(text: string, opts: TagOptions = {}): Svgx {
  const w = opts.width ?? tagWidth(text);
  return (
    <g opacity={opts.faded ? 0.45 : undefined}>
      <rect
        transform={translate(-w / 2, -TAG_H / 2)}
        width={w}
        height={TAG_H}
        rx={TAG_H / 2}
        fill={color.pointer}
      />
      {label(text, Vec2(0, 0), { size: TEXT_SIZE, mono: true, fill: "white" })}
    </g>
  );
}

export type DragTagOptions = TagOptions & {
  readonly id: string;
  /** The tag's centre. */
  readonly at: Vec2;
  readonly text: string;
  readonly draggedId: string | null;
  readonly onDrag: () => DragSpecBrand;
};

/** A tag the reader drags to edit the input. */
export function dragTag(opts: DragTagOptions): Svgx {
  return (
    <g
      id={opts.id}
      transform={translate(opts.at)}
      dragologyZIndex={opts.draggedId === opts.id ? "/1" : 2}
      dragologyOnDrag={opts.onDrag}
      style={{ cursor: "grab" }}
    >
      {tag(opts.text, opts)}
    </g>
  );
}
