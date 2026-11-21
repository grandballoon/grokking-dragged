import { describe, expect, it } from "vitest";
import { memoByValue, valueKey } from "./trace";

describe("valueKey", () => {
  it("ignores object key order but not array or set order", () => {
    expect(valueKey({ a: 1, b: [2, 3] })).toBe(valueKey({ b: [2, 3], a: 1 }));
    expect(valueKey([1, 2])).not.toBe(valueKey([2, 1]));
    expect(valueKey(new Set(["a", "b"]))).not.toBe(valueKey(new Set(["b", "a"])));
  });

  it("tells apart values JSON would merge", () => {
    expect(valueKey(new Set([1]))).not.toBe(valueKey(new Set([2])));
    expect(valueKey(new Map([["a", 1]]))).not.toBe(valueKey(new Map([["a", 2]])));
    expect(valueKey([undefined])).not.toBe(valueKey([null]));
    expect(valueKey("1")).not.toBe(valueKey(1));
    expect(valueKey(-0)).not.toBe(valueKey(0));
  });

  it("refuses values that are not plain data", () => {
    expect(() => valueKey(new Date(0))).toThrow(TypeError);
    expect(() => valueKey({ f: () => 1 })).toThrow(TypeError);
  });
});

describe("memoByValue", () => {
  it("runs once per distinct value", () => {
    const calls: number[] = [];
    const f = memoByValue((input: { n: number }) => {
      calls.push(input.n);
      return { double: input.n * 2 };
    });
    const first = f({ n: 2 });
    expect(f({ n: 2 })).toBe(first);
    expect(f({ n: 3 })).toEqual({ double: 6 });
    expect(calls).toEqual([2, 3]);
  });

  it("evicts the least recently used value beyond its capacity", () => {
    const calls: number[] = [];
    const f = memoByValue((input: { n: number }) => calls.push(input.n), 2);
    f({ n: 1 });
    f({ n: 2 });
    f({ n: 1 });
    f({ n: 3 });
    f({ n: 1 });
    f({ n: 2 });
    expect(calls).toEqual([1, 2, 3, 2]);
  });
});
