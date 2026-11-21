import { translate, Vec2, type Svgx } from "dragology";
import { displayWindow, lineText, type PythonSource } from "../core/pythonSource";
import { tokenizePython, type TokenKind } from "../core/pythonTokens";
import { box, label, uid } from "./svg";
import { color, font } from "./theme";

const ROW = 17;
const FONT_SIZE = 11;
const CHAR_WIDTH = FONT_SIZE * 0.6;
const HEADER = 34;
const GUTTER = 40;

const TOKEN_COLOR: Record<TokenKind, string> = {
  keyword: color.codeKeyword,
  builtin: color.codeBuiltin,
  string: color.codeString,
  number: color.codeNumber,
  comment: color.codeComment,
  plain: color.ink,
};

function truncate(text: string, maxChars: number): string {
  return text.length <= maxChars ? text : text.slice(0, maxChars - 1) + "…";
}

/**
 * The Python source being traced, with the current line highlighted. Each
 * row has an id, so as the window scrolls between steps, rows slide rather
 * than jump.
 */
export function codePanel(
  sources: readonly PythonSource[],
  file: string,
  line: number,
  size: Vec2,
): Svgx {
  const src = sources.find((s) => s.file === file);
  if (src === undefined) throw new Error(`No source registered for ${file}`);
  const maxLines = Math.floor((size.y - HEADER - 10) / ROW);
  const shown = displayWindow(src, line, maxLines);
  const maxChars = Math.floor((size.x - GUTTER - 14) / CHAR_WIDTH);
  const rowY = (i: number) => HEADER + 6 + i * ROW;
  const at = shown.indexOf(line);

  return (
    <g>
      {box(size.x, size.y, {
        fill: color.codeBg,
        stroke: color.panelBorder,
        radius: 10,
        strokeWidth: 1,
      })}
      {label(truncate(src.file, maxChars + 4), Vec2(14, 18), {
        size: 11,
        fill: color.muted,
        anchor: "start",
        mono: true,
      })}
      <line
        x1={0}
        x2={size.x}
        y1={HEADER - 4}
        y2={HEADER - 4}
        stroke={color.panelBorder}
      />
      {at >= 0 && (
        <g id="code-highlight" transform={translate(4, rowY(at))}>
          <rect width={size.x - 8} height={ROW} rx={3} fill={color.codeHighlight} />
          <rect width={3} height={ROW} rx={1.5} fill={color.codeHighlightEdge} />
        </g>
      )}
      {shown.map((n, i) => (
        <g
          id={uid("code", src.file, n)}
          dragologyZIndex={1}
          transform={translate(0, rowY(i) + ROW / 2)}
        >
          {label(String(n), Vec2(GUTTER - 10, 0), {
            size: 10,
            fill: n === line ? color.ink : color.codeLineNo,
            anchor: "end",
            mono: true,
          })}
          <text
            transform={translate(GUTTER, 0)}
            fontFamily={font.mono}
            fontSize={FONT_SIZE}
            dominantBaseline="central"
            style={{ whiteSpace: "pre" }}
          >
            {tokenizePython(truncate(lineText(src, n), maxChars)).map((tok) => (
              <tspan fill={TOKEN_COLOR[tok.kind]}>{tok.text}</tspan>
            ))}
          </text>
        </g>
      ))}
    </g>
  );
}
