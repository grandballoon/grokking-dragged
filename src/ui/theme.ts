/**
 * Shared visual vocabulary. Every diagram uses these roles, so one color
 * means one thing across the whole app: blue is "the algorithm is looking at
 * this right now", green is "done / found", amber is "waiting its turn",
 * grey is "already handled".
 */
export const color = {
  paper: "#fbfaf7",
  panel: "#ffffff",
  panelBorder: "#e4e1d8",
  ink: "#1f2328",
  muted: "#6b6f76",
  faint: "#a3a7ad",
  rule: "#d9d6cc",

  cell: "#ffffff",
  cellBorder: "#b9b5aa",
  cellEmpty: "#f1efe9",

  current: "#2563eb",
  currentFill: "#dbe7ff",
  pending: "#d97706",
  pendingFill: "#fdefd3",
  done: "#15803d",
  doneFill: "#dcf3e3",
  visited: "#7c8592",
  visitedFill: "#e9ebee",
  bad: "#c2410c",
  badFill: "#fde3d6",
  pointer: "#7c3aed",

  codeBg: "#f6f5f1",
  codeHighlight: "#fff1b8",
  codeHighlightEdge: "#e3b505",
  codeKeyword: "#a626a4",
  codeString: "#50a14f",
  codeNumber: "#b76b01",
  codeComment: "#9a9da3",
  codeBuiltin: "#0f6fc6",
  codeLineNo: "#b3b0a6",
} as const;

export const font = {
  ui: "Inter, ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif",
  mono: "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
} as const;
