import { describe, expect, it } from "vitest";
import { tokenizePython } from "./pythonTokens";

describe("tokenizePython", () => {
  it("classifies keywords, builtins, strings, numbers and comments", () => {
    expect(tokenizePython("    if len(x) > 1:  # big")).toEqual([
      { text: "    ", kind: "plain" },
      { text: "if", kind: "keyword" },
      { text: " ", kind: "plain" },
      { text: "len", kind: "builtin" },
      { text: "(x) > ", kind: "plain" },
      { text: "1", kind: "number" },
      { text: ":  ", kind: "plain" },
      { text: "# big", kind: "comment" },
    ]);
  });

  it("keeps a # inside a string out of the comment", () => {
    expect(tokenizePython('print("a#b")')).toEqual([
      { text: "print", kind: "builtin" },
      { text: "(", kind: "plain" },
      { text: '"a#b"', kind: "string" },
      { text: ")", kind: "plain" },
    ]);
  });

  it("round-trips the text", () => {
    const line = "    return (mid + 1) + recursive_response if x is not None else 'n'";
    expect(
      tokenizePython(line)
        .map((t) => t.text)
        .join(""),
    ).toBe(line);
  });
});
