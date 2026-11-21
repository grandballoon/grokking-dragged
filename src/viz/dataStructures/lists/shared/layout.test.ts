import { describe, expect, it } from "vitest";
import { layoutList, pointers, type NodeData } from "./layout";

type Mutable = {
  uid: string;
  _data: number;
  _next: Mutable | null;
  _prev?: Mutable | null;
};

function chain(...data: number[]): Mutable[] {
  const nodes: Mutable[] = data.map((d) => ({
    uid: `n${d}`,
    _data: d,
    _next: null,
    _prev: null,
  }));
  nodes.forEach((n, i) => {
    n._next = nodes[i + 1] ?? null;
    n._prev = nodes[i - 1] ?? null;
  });
  return nodes;
}

const summary = (head: NodeData | null, tail: NodeData | null, others: NodeData[]) =>
  layoutList(head, tail, others).map((s) => `${s.node._data}${s.dropped ? "!" : ""}`);

describe("layoutList", () => {
  it("lays a plain list out along _next", () => {
    const [a] = chain(1, 2, 3);
    expect(summary(a!, null, [])).toEqual(["1", "2", "3"]);
    expect(summary(null, null, [])).toEqual([]);
  });

  it("lowers a bypassed node into the gap it left", () => {
    const [a, b, c] = chain(1, 2, 3);
    a!._next = c!;
    c!._prev = a!;
    expect(summary(a!, c!, [b!])).toEqual(["1", "2!", "3"]);
  });

  it("keeps a new head that is not linked yet in front of the old list", () => {
    const [a, , c] = chain(1, 2, 3);
    const fresh: Mutable = { uid: "new", _data: 0, _next: null, _prev: null };
    expect(summary(fresh, c!, [a!])).toEqual(["0", "1", "2", "3"]);
  });

  it("keeps a new tail that is not linked yet behind the old list", () => {
    const [a] = chain(1, 2);
    const fresh: Mutable = { uid: "new", _data: 9, _next: null, _prev: null };
    expect(summary(a!, fresh, [])).toEqual(["1", "2", "9"]);
  });

  it("puts a deleted head before its old successor", () => {
    const [a, b] = chain(1, 2, 3);
    expect(summary(b!, null, [a!])).toEqual(["1!", "2", "3"]);
  });
});

describe("pointers", () => {
  it("names the list's fields, then each call's node locals", () => {
    const [a, b] = chain(1, 2);
    const stack = [
      { file: "dll.py", fn: "delete", locals: { target: 2, node: b } },
      { file: "dll.py", fn: "Node.append", locals: { self: a, next_node: null } },
    ];
    expect(pointers({ _head: a!, _tail: null }, stack)).toEqual([
      { name: "_head", uid: "n1", depth: -1 },
      { name: "node", uid: "n2", depth: 0 },
      { name: "self", uid: "n1", depth: 1 },
    ]);
  });
});
