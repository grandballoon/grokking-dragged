/**
 * Port of trees/bst.py, run over an operation script.
 *
 * `BinarySearchTree` and its `Node` keep the Python's fields (`_root`;
 * `_value`, `_left`, `_right`) and methods, statement for statement:
 * `insert`, `_search`/`contains`, `delete` with all three cases (including
 * `find_max_in_subtree`), and the stack-based `__len__` and `__iter__`, which
 * use the Stack of stacks/stack.py and record its steps in that file.
 */
import { recorder, type Frame } from "../../../../core/trace";
import { pyRepr } from "../../../../core/python";
import { PyError } from "../../kit/pyError";
import { scriptRunner } from "../../kit/script";
import { stepOver, tracer, type Tracer, type Where } from "../../kit/tracer";
import type { Op } from "../../opScript";
import { Stack, SRC as STACK_SRC } from "../../ports/stack";
import { BST } from "../../sources";

export const SRC = BST;
export { STACK_SRC };

/**
 * `BinarySearchTree.Node`. The `uid` is not in the Python: it gives each
 * node one identity across frames so the drawing can follow it.
 */
export class Node {
  constructor(
    readonly uid: string,
    public _value: number,
    public _left: Node | null = null,
    public _right: Node | null = null,
  ) {}

  value(): number {
    return this._value;
  }

  left(): Node | null {
    return this._left;
  }

  right(): Node | null {
    return this._right;
  }

  set_left(node: Node | null): void {
    this._left = node;
  }

  set_right(node: Node | null): void {
    this._right = node;
  }

  find_max_in_subtree(env: Env): [Node, Node | null] {
    const IN = "def find_max_in_subtree";
    let parent: Node | null = null;
    // The Python walks from `self` with `node = self`.
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    let node: Node = this;
    env.at(
      { snippet: "node = self", after: IN },
      `Look for the largest value under ${this._value}: keep going right.`,
      {
        max_node: node,
        max_node_parent: parent,
      },
    );
    while (node.right() !== null) {
      parent = node;
      node = node.right()!;
      env.at(
        { snippet: "node = node.right()", after: IN },
        `Go right to ${node._value}.`,
        {
          max_node: node,
          max_node_parent: parent,
        },
      );
    }
    env.at(
      { snippet: "return node, parent", after: IN },
      `${node._value} has no right child, so it is the largest value in this subtree.`,
      { max_node: node, max_node_parent: parent },
    );
    return [node, parent];
  }
}

export type Input = { readonly ops: readonly Op[] };

/** What a frame shows: the tree, and the locals of the call in progress. */
export type Vars = {
  _root: Node | null;
  /** Index of the script op running. */
  op: number | null;
  node: Node | null;
  parent: Node | null;
  max_node: Node | null;
  max_node_parent: Node | null;
  new_node: Node | null;
  /** `__iter__`'s `current`. */
  current: Node | null;
  stack: Stack<Node | null> | null;
  size: number | null;
  /** Values `__iter__` has yielded so far. */
  yielded: number[];
  /** Nodes already counted by `__len__` or yielded by `__iter__`. */
  done: string[];
  /** The op's return value, in Python's repr, once it has returned. */
  result: string | null;
  error: string | null;
};

type Locals = Omit<Vars, "_root" | "op">;

const EMPTY_LOCALS: Locals = {
  node: null,
  parent: null,
  max_node: null,
  max_node_parent: null,
  new_node: null,
  current: null,
  stack: null,
  size: null,
  yielded: [],
  done: [],
  result: null,
  error: null,
};

/**
 * How a method records a step in bst.py, updating the shown locals first,
 * or raises; `t` traces the stacks' steps and makes node uids.
 */
type Env = {
  readonly at: (where: Where, note: string, locals?: Partial<Locals>) => void;
  readonly raise: (where: Where, type: string, detail: string) => never;
  readonly t: Tracer;
};

const showNode = (n: Node | null) => (n === null ? "None" : String(n._value));

/** A stored value as a note shows it: a tree node by its value. */
const show = (value: unknown) =>
  value instanceof Node ? showNode(value) : pyRepr(value);

/**
 * `Stack()`. Its `__init__` records nothing: the frame at `stack = Stack()`
 * in bst.py already shows the new, empty stack.
 */
function newStack(env: Env): Stack<Node | null> {
  const stack = new Stack<Node | null>();
  stack.__init__(env.t.quiet());
  return stack;
}

class BinarySearchTree {
  _root: Node | null = null;

  __len__(env: Env): number {
    const IN = "def __len__";
    const stack = newStack(env);
    env.at(
      { snippet: "stack = Stack()", after: IN },
      "Count the nodes with an explicit stack instead of recursion.",
      {
        stack,
      },
    );
    stack.push(this._root, env.t);
    env.at("stack.push(self._root)", `Start with the root, ${showNode(this._root)}.`);
    let size = 0;
    env.at("size = 0", "No nodes counted yet.", { size });
    const done: string[] = [];
    while (stack.__len__() > 0) {
      const node = stack.pop(env.t);
      env.at(
        "node = stack.pop()",
        node === null
          ? "Popped None: an empty subtree, nothing to count."
          : `Popped ${node._value}.`,
        { node },
      );
      if (node !== null) {
        size += 1;
        done.push(node.uid);
        env.at("size += 1", `Count ${node._value}: size is ${size}.`, {
          size,
          done: [...done],
        });
        stack.push(node.right(), env.t);
        env.at(
          "stack.push(node.right())",
          `Push ${node._value}'s right child, ${showNode(node.right())}.`,
        );
        stack.push(node.left(), env.t);
        env.at(
          "stack.push(node.left())",
          `Push ${node._value}'s left child, ${showNode(node.left())}.`,
        );
      }
    }
    env.at("return size", `The stack is empty: __len__ returns ${size}.`, {
      node: null,
      result: String(size),
    });
    return size;
  }

  __iter__(env: Env): number[] {
    const IN = "def __iter__";
    const yielded: number[] = [];
    const done: string[] = [];
    let current = this._root;
    env.at(
      { snippet: "current = self._root", after: IN },
      `Start at the root, ${showNode(current)}.`,
      {
        current,
        yielded: [],
      },
    );
    const stack = newStack(env);
    env.at(
      { snippet: "stack = Stack()", after: IN },
      "The stack holds the nodes whose left subtree is still being visited.",
      {
        stack,
      },
    );
    const visit = (node: Node, after: string) => {
      yielded.push(node.value());
      done.push(node.uid);
      env.at({ snippet: "yield current.value()", after }, `Yield ${node._value}.`, {
        yielded: [...yielded],
        done: [...done],
      });
      current = node.right();
      env.at(
        { snippet: "current = current.right()", after },
        current === null
          ? `${node._value} has no right subtree.`
          : `Move into ${node._value}'s right subtree, at ${current._value}.`,
        { current },
      );
    };
    while (current !== null || stack.__len__() > 0) {
      if (current === null) {
        current = stack.pop(env.t);
        env.at("current = stack.pop()", `Back up to ${showNode(current)}.`, { current });
        visit(current!, "current = stack.pop()");
      } else {
        while (current.left() !== null) {
          stack.push(current, env.t);
          env.at(
            "stack.push(current)",
            `${current._value} has a left child: save it for later.`,
          );
          current = current.left()!;
          env.at("current = current.left()", `Go left to ${current._value}.`, {
            current,
          });
        }
        visit(current, "current = current.left()");
      }
    }
    env.at(
      "while current is not None or len(stack) > 0:",
      `Nothing left to visit: the values came out in order, [${yielded.join(", ")}].`,
      { current: null, result: `[${yielded.join(", ")}]` },
    );
    return yielded;
  }

  _search(value: number, env: Env): [Node | null, Node | null] {
    const IN = "def _search";
    let parent: Node | null = null;
    let node = this._root;
    env.at(
      { snippet: "node = self._root", after: IN },
      `Search for ${value}, starting at the root.`,
      {
        node,
        parent,
      },
    );
    while (node !== null) {
      const node_val = node.value();
      const verdict =
        node_val === value
          ? `Found ${value}.`
          : value < node_val
            ? `${value} < ${node_val}: go left.`
            : `${value} > ${node_val}: go right.`;
      env.at("if node_val == value:", verdict, { node, parent });
      if (node_val === value) {
        env.at(
          { snippet: "return node, parent", after: IN },
          `_search returns ${value} and its parent, ${showNode(parent)}.`,
        );
        return [node, parent];
      } else if (value < node_val) {
        parent = node;
        node = node.left();
      } else {
        parent = node;
        node = node.right();
      }
    }
    env.at("return None, None", `Fell off the tree: ${value} isn't in it.`, {
      node: null,
      parent: null,
    });
    return [null, null];
  }

  contains(value: number, env: Env): boolean {
    const found = this._search(value, env)[0] !== null;
    env.at(
      "return self._search(value)[0] is not None",
      `contains(${value}) returns ${found ? "True" : "False"}.`,
      {
        result: found ? "True" : "False",
      },
    );
    return found;
  }

  insert(value: number, env: Env): void {
    let node = this._root;
    env.at(
      { snippet: "node = self._root", after: "def insert" },
      `Insert ${value}, starting at the root.`,
      { node },
    );
    if (node === null) {
      this._root = new Node(env.t.newUid(), value);
      env.at(
        "self._root = BinarySearchTree.Node(value)",
        `The tree was empty: ${value} becomes the root.`,
        {
          node: this._root,
        },
      );
      return;
    }
    for (;;) {
      const goLeft = value <= node.value();
      env.at(
        "if value <= node.value():",
        goLeft
          ? `${value} <= ${node._value}: go left.`
          : `${value} > ${node._value}: go right.`,
        { node },
      );
      if (goLeft) {
        if (node.left() === null) {
          node.set_left(new Node(env.t.newUid(), value));
          env.at(
            "node.set_left(BinarySearchTree.Node(value))",
            `${node._value} has no left child: ${value} goes there.`,
          );
          break;
        } else {
          node = node.left()!;
        }
      } else if (node.right() === null) {
        node.set_right(new Node(env.t.newUid(), value));
        env.at(
          "node.set_right(BinarySearchTree.Node(value))",
          `${node._value} has no right child: ${value} goes there.`,
        );
        break;
      } else {
        node = node.right()!;
      }
    }
  }

  delete(value: number, env: Env): void {
    if (this._root === null) {
      env.raise(
        "raise ValueError('Delete on an empty tree')",
        "ValueError",
        "Delete on an empty tree",
      );
    }
    const [node, parent] = this._search(value, env);
    env.at(
      "node, parent = self._search(value)",
      node === null ? `${value} isn't in the tree.` : `Delete the node holding ${value}.`,
      {
        node,
        parent,
      },
    );
    if (node === null) {
      env.raise("raise ValueError('Value not found')", "ValueError", "Value not found");
    }
    const attach = (child: Node | null, what: string) => {
      if (parent === null) {
        this._root = child;
        return `${what} becomes the root.`;
      } else if (value <= parent.value()) {
        parent.set_left(child);
        return `${what} becomes ${parent._value}'s left child.`;
      } else {
        parent.set_right(child);
        return `${what} becomes ${parent._value}'s right child.`;
      }
    };
    const attachLine = (name: string) =>
      parent === null
        ? `self._root = ${name}`
        : value <= parent.value()
          ? `parent.set_left(${name})`
          : `parent.set_right(${name})`;

    if (node.left() === null || node.right() === null) {
      const maybe_child = node.left() === null ? node.right() : node.left();
      env.at(
        "maybe_child = node.right() if node.left() is None else node.left()",
        maybe_child === null
          ? `${value} is a leaf: nothing takes its place.`
          : `${value} has one child, ${maybe_child._value}, which takes its place.`,
      );
      const line = attachLine("maybe_child");
      const what = maybe_child === null ? "None" : String(maybe_child._value);
      const note = attach(maybe_child, what);
      env.at(line, `${note} ${value} is gone.`, { node: null });
    } else {
      const [max_node, max_node_parent] = node.left()!.find_max_in_subtree(env);
      env.at(
        "max_node, max_node_parent = node.left().find_max_in_subtree()",
        `${value} has two children: ${max_node._value}, the largest value on its left, will replace it.`,
        { max_node, max_node_parent },
      );
      let new_node: Node;
      if (max_node_parent === null) {
        new_node = new Node(
          env.t.newUid(),
          max_node.value(),
          max_node.left(),
          node.right(),
        );
        env.at(
          "new_node = BinarySearchTree.Node(max_node.value(), max_node.left(), node.right())",
          `${max_node._value} is ${value}'s left child: a new node takes its value and left subtree, and ${value}'s right subtree.`,
          { new_node },
        );
      } else {
        new_node = new Node(env.t.newUid(), max_node.value(), node.left(), node.right());
        env.at(
          "new_node = BinarySearchTree.Node(max_node.value(), node.left(), node.right())",
          `A new node takes ${max_node._value}'s value and both of ${value}'s subtrees.`,
          { new_node },
        );
        max_node_parent.set_right(max_node.left());
        env.at(
          "max_node_parent.set_right(max_node.left())",
          `Unlink ${max_node._value}: ${max_node_parent._value}'s right child becomes ${showNode(max_node.left())}.`,
          { max_node: null },
        );
      }
      const line = attachLine("new_node");
      const note = attach(new_node, `The new ${new_node._value}`);
      env.at(line, `${note} ${value} is gone.`, {
        node: null,
        max_node: null,
        max_node_parent: null,
      });
    }
  }
}

export function run(input: Input): Frame<Vars>[] {
  const rec = recorder<Vars>();
  const stepTree = rec.in(SRC);
  const runner = scriptRunner(input.ops);

  const tree = new BinarySearchTree();
  let locals: Locals = EMPTY_LOCALS;
  const vars = (): Vars => ({ _root: tree._root, op: runner.op, ...locals });
  const at: Env["at"] = (where, note, patch = {}) => {
    locals = { ...locals, ...patch };
    stepTree(where, vars(), note);
  };
  const env: Env = {
    at,
    raise(where, type, detail) {
      const error = new PyError(type, detail);
      at(where, error.message, { error: error.message });
      throw error;
    },
    // A traversal pushes and pops dozens of times: each push or pop shows
    // as one step in stack.py, and the list calls under it record nothing.
    t: tracer({
      newUid: runner.newUid,
      show,
      record: stepOver(
        (event) => {
          if (event.raised !== undefined) locals = { ...locals, error: event.note };
          rec.in(event.src)(event.where, vars(), event.note);
        },
        rec.frames,
        (call) => call.file === STACK_SRC.file,
      ),
    }),
  };

  stepTree("self._root = None", vars(), "An empty tree: the root is None.");
  runner.run((o) => {
    locals = EMPTY_LOCALS;
    const arg = o.args[0] ?? 0;
    if (o.name === "insert") tree.insert(arg, env);
    else if (o.name === "contains") tree.contains(arg, env);
    else if (o.name === "delete") tree.delete(arg, env);
    else if (o.name === "__len__") tree.__len__(env);
    else if (o.name === "__iter__") tree.__iter__(env);
    else throw new Error(`Unknown op ${o.name}`);
  });
  return rec.frames;
}
