import { describe, expect, it } from "vitest";
import { decStr } from "../shared/decimal";
import { A, hashArithmetic, python_hash } from "./hashing";
import PYTHON from "./hash.python.json";

/**
 * hash.python.json was produced by the real HashTable, from
 * grokking_data_structures-main/python, with `python3 -I`:
 *
 *     A = HashTable.__A__
 *     keys = list(range(-30, 31)) + [99, -99, 1000, -1000, 123456789,
 *         -987654321, 2**40 + 7, -(2**52) - 3, 10**20 + 1, -(10**25) + 11,
 *         10**27 - 1, 31415926535897932384626433]
 *     for m in [1, 2, 3, 5, 7, 11, 13, 16]:
 *         for k in keys:
 *             p = Decimal(k) * A; f = p % 1; s = m * f
 *             rows.append([m, str(k), HashTable(m)._hash(k), str(p), str(f), str(s)])
 */
const rows = PYTHON as [number, string, number, string, string, string][];

describe("HashTable._hash arithmetic", () => {
  it("takes A as the float's exact binary value", () => {
    expect(decStr(A)).toBe("0.6180339887498949025257388711906969547271728515625");
  });

  it("matches Python's Decimal for every key and table size", () => {
    expect(rows.length).toBe(584);
    for (const [m, key, index, product, fraction, scaled] of rows) {
      const h = hashArithmetic(m, BigInt(key));
      expect([
        m,
        key,
        decStr(h.product),
        decStr(h.fraction),
        decStr(h.scaled),
        h.index,
      ]).toEqual([m, key, product, fraction, scaled, index]);
    }
  });

  it("raises InvalidOperation when the quotient needs more than 28 digits", () => {
    expect(() => hashArithmetic(5, 10n ** 29n)).toThrow("DivisionImpossible");
  });

  it("hashes ints like Python", () => {
    expect([0, 1, -1, -2, 7, -99].map(python_hash)).toEqual([0, 1, -2, -2, 7, -99]);
  });
});
