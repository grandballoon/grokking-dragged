import { translate, Vec2, type Svgx } from "dragology";
import { box, caption, uid } from "../../../ui/svg";
import { color, font } from "../../../ui/theme";

const LINE = 18;
/** Gap between the caption's centre line and the top of the box. */
const BOX_TOP = 12;
/** Centre of the first line, below the box's top edge. */
const FIRST = 14;

/** How many lines fit in a box `h` tall (at least one). */
function stdoutRoom(h: number): number {
  return Math.max(1, Math.floor((h - FIRST + LINE - 7) / LINE));
}

/**
 * What the program has printed so far, one `print` per line, in a
 * terminal-styled box `w` by `h` under a "stdout" caption at `at` (the
 * caption's left end, as with `varCell`). Whitespace is kept exactly, since
 * `print("hello, ", name)` puts two spaces in a row. When the lines outgrow
 * the box, the most recent ones are shown.
 */
export function stdoutPanel(
  lines: readonly string[],
  at: Vec2,
  w: number,
  h: number,
): Svgx {
  const first = Math.max(0, lines.length - stdoutRoom(h));
  return (
    <g transform={translate(at)}>
      {caption("stdout", Vec2(0, 0))}
      <g transform={translate(0, BOX_TOP)}>
        {box(w, h, {
          fill: color.codeBg,
          stroke: color.panelBorder,
          radius: 8,
          strokeWidth: 1,
        })}
        {lines.slice(first).map((text, i) => (
          <text
            id={uid("stdout", first + i)}
            transform={translate(10, FIRST + i * LINE)}
            fontFamily={font.mono}
            fontSize={12}
            fill={color.ink}
            dominantBaseline="central"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
          >
            {text}
          </text>
        ))}
      </g>
    </g>
  );
}
