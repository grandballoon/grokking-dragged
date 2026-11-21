import { describe, expect, it } from "vitest";
import { itemIds } from "./identity";

describe("selection sort item identity", () => {
  const input = { arr: [3, 1, 3, 1], ids: ["a", "b", "c", "d"] };

  it("follows each item from arr into newArr", () => {
    expect(itemIds(input, [], [3, 1, 3, 1])).toEqual({
      newArr: [],
      arr: ["a", "b", "c", "d"],
    });
    expect(itemIds(input, [1], [3, 3, 1])).toEqual({
      newArr: ["b"],
      arr: ["a", "c", "d"],
    });
    expect(itemIds(input, [1, 1, 3], [3])).toEqual({
      newArr: ["b", "d", "a"],
      arr: ["c"],
    });
  });
});
