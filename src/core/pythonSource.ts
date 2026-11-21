/**
 * A Python file from the repo, held as text, plus pure queries over it.
 *
 * Every visualization traces a TypeScript port of a Python function. Each
 * recorded step points back at a line of the original file, found by a
 * snippet of that line's text rather than a hard-coded number, so the
 * highlight in the code panel follows the real source. `lineOf` throws when
 * a snippet is missing or ambiguous, and the tests run every trace, so a
 * drifted snippet fails loudly instead of highlighting the wrong line.
 */

export type PythonSource = {
  /** Repo-relative path, shown in the code panel header. */
  readonly file: string;
  /** The file's lines; index 0 is line 1. */
  readonly lines: readonly string[];
  /** Line numbers (1-based) that are part of a docstring. */
  readonly docstringLines: ReadonlySet<number>;
};

export function pythonSource(file: string, text: string): PythonSource {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  return { file, lines, docstringLines: findDocstringLines(lines) };
}

/**
 * Lines that belong to a docstring: a statement that is just a triple-quoted
 * string. In the files this app reads, every such string is a docstring.
 */
function findDocstringLines(lines: readonly string[]): Set<number> {
  const result = new Set<number>();
  let i = 0;
  while (i < lines.length) {
    const trimmed = (lines[i] ?? "").trim();
    const quote = trimmed.startsWith('"""')
      ? '"""'
      : trimmed.startsWith("'''")
        ? "'''"
        : null;
    if (quote === null) {
      i++;
      continue;
    }
    const rest = trimmed.slice(3);
    let end = i;
    if (!rest.includes(quote)) {
      end = i + 1;
      while (end < lines.length && !(lines[end] ?? "").includes(quote)) end++;
    }
    for (let k = i; k <= end; k++) result.add(k + 1);
    i = end + 1;
  }
  return result;
}

export type LineQuery = {
  /** Only consider lines after the first line containing this text. */
  after?: string;
};

const lineCache = new WeakMap<PythonSource, Map<string, number>>();

/**
 * The 1-based number of the single line containing `snippet` (after
 * `query.after`, if given, counting only code lines). Throws if there is no
 * such line or more than one.
 */
export function lineOf(
  src: PythonSource,
  snippet: string,
  query: LineQuery = {},
): number {
  const cacheKey = `${query.after ?? ""}\u0000${snippet}`;
  let cache = lineCache.get(src);
  if (cache === undefined) {
    cache = new Map();
    lineCache.set(src, cache);
  }
  const cached = cache.get(cacheKey);
  if (cached !== undefined) return cached;

  let start = 0;
  if (query.after !== undefined) {
    const anchor = codeLineNumbers(src).find((n) =>
      lineText(src, n).includes(query.after!),
    );
    if (anchor === undefined) {
      throw new Error(`${src.file}: anchor not found: ${JSON.stringify(query.after)}`);
    }
    start = anchor;
  }
  const matches = codeLineNumbers(src).filter(
    (n) => n > start && lineText(src, n).includes(snippet),
  );
  if (query.after !== undefined && matches.length > 0) {
    // With an anchor, the first match after it is the one meant.
    matches.length = 1;
  }
  if (matches.length !== 1) {
    throw new Error(
      `${src.file}: snippet ${JSON.stringify(snippet)}` +
        (query.after ? ` after ${JSON.stringify(query.after)}` : "") +
        ` matched ${matches.length} lines`,
    );
  }
  cache.set(cacheKey, matches[0]!);
  return matches[0]!;
}

export function lineText(src: PythonSource, line: number): string {
  return src.lines[line - 1] ?? "";
}

/** Lines that are neither blank, comments, nor docstrings. */
function codeLineNumbers(src: PythonSource): number[] {
  const result: number[] = [];
  src.lines.forEach((text, i) => {
    const trimmed = text.trim();
    if (trimmed === "" || trimmed.startsWith("#") || src.docstringLines.has(i + 1))
      return;
    result.push(i + 1);
  });
  return result;
}

function indentOf(text: string): number {
  return text.length - text.trimStart().length;
}

/**
 * Which lines the code panel shows while `line` executes: the whole file if
 * it is short, otherwise the innermost `def` around `line`. Docstrings are
 * dropped and runs of blank lines collapsed. At most `maxLines` lines are
 * returned, kept centred on `line`.
 */
export function displayWindow(
  src: PythonSource,
  line: number,
  maxLines: number,
): number[] {
  const visible = (from: number, to: number): number[] => {
    const result: number[] = [];
    for (let n = from; n <= to; n++) {
      if (src.docstringLines.has(n)) continue;
      const blank = lineText(src, n).trim() === "";
      const prevBlank =
        result.length === 0 || lineText(src, result[result.length - 1]!).trim() === "";
      if (blank && prevBlank) continue;
      result.push(n);
    }
    while (result.length > 0 && lineText(src, result[result.length - 1]!).trim() === "") {
      result.pop();
    }
    return result;
  };

  let shown = visible(1, src.lines.length);
  if (shown.length > maxLines) {
    const [from, to] = enclosingDef(src, line);
    shown = visible(from, to);
  }
  if (shown.length <= maxLines) return shown;
  const at = Math.max(0, shown.indexOf(line));
  const start = Math.min(
    Math.max(0, at - Math.floor(maxLines / 2)),
    shown.length - maxLines,
  );
  return shown.slice(start, start + maxLines);
}

/** The line range of the innermost `def` containing `line`. */
function enclosingDef(src: PythonSource, line: number): [number, number] {
  const isDef = (text: string) => /^\s*def\s/.test(text);
  let start: number | null = isDef(lineText(src, line)) ? line : null;
  let indent = indentOf(lineText(src, line));
  for (let n = line - 1; n >= 1 && start === null; n--) {
    const text = lineText(src, n);
    if (text.trim() === "" || src.docstringLines.has(n) || indentOf(text) >= indent)
      continue;
    if (isDef(text)) start = n;
    indent = indentOf(text);
  }
  if (start === null) return [1, src.lines.length];
  const defIndent = indentOf(lineText(src, start));
  let end = start;
  for (let k = start + 1; k <= src.lines.length; k++) {
    const text = lineText(src, k);
    if (text.trim() === "" || src.docstringLines.has(k)) continue;
    if (indentOf(text) <= defIndent) break;
    end = k;
  }
  return [start, end];
}
