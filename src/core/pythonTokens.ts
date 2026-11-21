/** A tiny, line-at-a-time Python highlighter for the code panel. */

export type TokenKind = "keyword" | "builtin" | "string" | "number" | "comment" | "plain";
export type Token = { readonly text: string; readonly kind: TokenKind };

const KEYWORDS = new Set(
  (
    "and as assert break class continue def del elif else except False " +
    "finally for from if import in is lambda None not or pass raise return " +
    "True try while with yield"
  ).split(" "),
);

const BUILTINS = new Set(
  (
    "abs deque dict enumerate float floor hash heapq int isfile join len " +
    "list listdir map max min print range repr self set sorted str sum " +
    "super tuple type"
  ).split(" "),
);

const PATTERN =
  /(#.*$)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')|(\b\d+(?:\.\d+)?\b)|([A-Za-z_][A-Za-z0-9_]*)|(\s+)|(.)/g;

export function tokenizePython(line: string): Token[] {
  const tokens: Token[] = [];
  const push = (text: string, kind: TokenKind) => {
    const last = tokens[tokens.length - 1];
    if (last && last.kind === kind) {
      tokens[tokens.length - 1] = { text: last.text + text, kind };
    } else {
      tokens.push({ text, kind });
    }
  };
  for (const m of line.matchAll(PATTERN)) {
    const [text, comment, str, num, word] = m;
    if (comment !== undefined) push(text, "comment");
    else if (str !== undefined) push(text, "string");
    else if (num !== undefined) push(text, "number");
    else if (word !== undefined) {
      push(
        text,
        KEYWORDS.has(word) ? "keyword" : BUILTINS.has(word) ? "builtin" : "plain",
      );
    } else push(text, "plain");
  }
  return tokens;
}
