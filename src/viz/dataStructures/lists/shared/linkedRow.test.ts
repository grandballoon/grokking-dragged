import { describe, expect, it } from "vitest";
import { NODE_W, ROW_LEFT, rowFit } from "./linkedRow";

describe("rowFit", () => {
  it("keeps full spacing while the row fits", () => {
    expect(rowFit("singly", 1)).toEqual({ pitch: 100, scale: 1 });
    expect(rowFit("doubly", 6)).toEqual({ pitch: 116, scale: 1 });
  });

  it("tightens spacing, then scales, never overflowing the diagram", () => {
    for (const kind of ["singly", "doubly"] as const) {
      for (let slots = 1; slots <= 14; slots++) {
        const { pitch, scale } = rowFit(kind, slots);
        expect(pitch - NODE_W[kind]).toBeGreaterThanOrEqual(18);
        const right = ROW_LEFT + ((slots - 1) * pitch + NODE_W[kind]) * scale;
        expect(right).toBeLessThanOrEqual(736 + 1e-9);
      }
    }
  });
});
