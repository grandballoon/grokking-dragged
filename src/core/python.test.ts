/**
 * Every expected value here is what CPython prints (checked with
 * `python3 -I`), so these helpers agree with the language, not with our
 * idea of it.
 */
import { describe, expect, it } from "vitest";
import {
  dictPop,
  floorDiv,
  pyDictRepr,
  pyFloat,
  pyIndex,
  pyIndexOf,
  pyPrint,
  pyRepr,
  pySlice,
  pyStr,
  pyStrRepr,
} from "./python";

describe("pyRepr", () => {
  it("prints values the way repr does", () => {
    expect(pyRepr([1, "a", null, true, false, [2, 3]])).toBe(
      "[1, 'a', None, True, False, [2, 3]]",
    );
    expect(pyRepr(new Set())).toBe("set()");
    expect(pyRepr(new Set([1]))).toBe("{1}");
    expect(pyRepr(new Set(["a"]))).toBe("{'a'}");
    expect(pyRepr({})).toBe("{}");
    expect(pyRepr([])).toBe("[]");
    expect(pyRepr({ a: 1, b: [2] })).toBe("{'a': 1, 'b': [2]}");
    expect(pyRepr(Infinity)).toBe("inf");
    expect(pyRepr(-Infinity)).toBe("-inf");
  });

  it("quotes strs the way repr does", () => {
    expect(pyStrRepr("it's")).toBe(`"it's"`);
    expect(pyStrRepr('say "hi"')).toBe(`'say "hi"'`);
    expect(pyStrRepr(`both ' and "`)).toBe(`'both \\' and "'`);
    expect(pyStrRepr("back\\slash")).toBe(`'back\\\\slash'`);
    expect(pyStrRepr("")).toBe("''");
    expect(pyStrRepr("tab\there")).toBe("'tab\\there'");
    expect(pyStrRepr("new\nline")).toBe("'new\\nline'");
  });

  it("prints a dict with its own value format", () => {
    const book = { apple: 0.67, milk: 1.49, flour: 2 };
    expect(pyDictRepr(book, pyFloat)).toBe("{'apple': 0.67, 'milk': 1.49, 'flour': 2.0}");
  });
});

describe("pyStr and pyPrint", () => {
  it("print strs bare and everything else as its repr", () => {
    expect(pyStr("hello")).toBe("hello");
    expect(pyStr(null)).toBe("None");
    expect(pyStr([1, "x"])).toBe("[1, 'x']");
    expect(pyStr(true)).toBe("True");
  });

  it("joins print's arguments with spaces", () => {
    expect(pyPrint("hello, ", "maggie", "!")).toBe("hello,  maggie !");
    expect(pyPrint(1, "a", null)).toBe("1 a None");
    expect(pyPrint()).toBe("");
  });
});

describe("pyFloat", () => {
  it("prints floats the way repr does", () => {
    const cases: [number, string][] = [
      [0.67, "0.67"],
      [1.49, "1.49"],
      [1, "1.0"],
      [0, "0.0"],
      [-0, "-0.0"],
      [2.5, "2.5"],
      [-3, "-3.0"],
      [0.1 + 0.2, "0.30000000000000004"],
      [123.456, "123.456"],
      [0.0001, "0.0001"],
      [0.00001, "1e-05"],
      [1.5e-7, "1.5e-07"],
      [1e15, "1000000000000000.0"],
      [1e16, "1e+16"],
      [1.25e21, "1.25e+21"],
      [Infinity, "inf"],
      [-Infinity, "-inf"],
      [NaN, "nan"],
      [1 / 3, "0.3333333333333333"],
      [2 ** 53, "9007199254740992.0"],
      [5e-324, "5e-324"],
      [1.7976931348623157e308, "1.7976931348623157e+308"],
      [100, "100.0"],
      [12345678901234568, "1.2345678901234568e+16"],
      [0.25, "0.25"],
    ];
    for (const [x, repr] of cases) expect(pyFloat(x), String(x)).toBe(repr);
  });
});

describe("floorDiv", () => {
  it("rounds towards minus infinity", () => {
    const cases: [number, number, number][] = [
      [7, 2, 3],
      [-7, 2, -4],
      [7, -2, -4],
      [-7, -2, 3],
      [0, 3, 0],
      [6, 3, 2],
      [-1, 3, -1],
    ];
    for (const [a, b, q] of cases) expect(floorDiv(a, b), `${a} // ${b}`).toBe(q);
  });
});

describe("pySlice", () => {
  const list = [0, 1, 2, 3, 4];

  it("copies, counts negative bounds from the end and clamps", () => {
    expect(pySlice(list, 1)).toEqual([1, 2, 3, 4]);
    expect(pySlice(list, undefined, 2)).toEqual([0, 1]);
    expect(pySlice(list, -2)).toEqual([3, 4]);
    expect(pySlice(list, undefined, -1)).toEqual([0, 1, 2, 3]);
    expect(pySlice(list, 3, 1)).toEqual([]);
    expect(pySlice(list, 10)).toEqual([]);
    expect(pySlice(list, -10, 2)).toEqual([0, 1]);
    expect(pySlice(list, 1, 100)).toEqual([1, 2, 3, 4]);
    expect(pySlice(list)).not.toBe(list);
  });
});

describe("pyIndex", () => {
  const list = [0, 1, 2, 3, 4];

  it("counts negative indexes from the end", () => {
    expect(pyIndex(list, -1)).toBe(4);
    expect(pyIndex(list, -5)).toBe(0);
    expect(pyIndex(list, 0)).toBe(0);
    expect(pyIndexOf(-1, 4)).toBe(3);
  });

  it("raises IndexError past either end", () => {
    expect(() => pyIndex(list, 5)).toThrow("IndexError: list index out of range");
    expect(() => pyIndex(list, -6)).toThrow("IndexError: list index out of range");
  });
});

describe("dictPop", () => {
  it("removes the key in place, keeping the others' order", () => {
    const d: Record<string, number> = { a: 1, b: 2, c: 3 };
    expect(dictPop(d, "b")).toBe(2);
    expect(pyRepr(d)).toBe("{'a': 1, 'c': 3}");
  });

  it("raises KeyError for a missing key", () => {
    expect(() => dictPop({ a: 1 }, "z")).toThrow("KeyError: 'z'");
  });
});
