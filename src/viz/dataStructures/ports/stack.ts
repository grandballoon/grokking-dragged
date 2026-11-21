/**
 * Port of grokking_data_structures-main/python/stacks/stack.py, the one the
 * stack page, the BST's traversals and the graph's `dfs` all run.
 *
 * `Stack` wraps the ported `SinglyLinkedList` in `_data`, as in the Python:
 * the top of the stack is the list's head. `push` and `pop` step into the
 * list's `insert_in_front` and `delete_from_front`, whose steps are recorded
 * in singly_linked_list.py with the stack method's call kept underneath.
 */
import { STACK as SRC } from "../sources";
import type { Method, Tracer } from "../kit/tracer";
import { SinglyLinkedList } from "./singly_linked_list";

export { SRC };

export class Stack<T> {
  _data = new SinglyLinkedList<T>();

  /** Runs `__init__`: `SinglyLinkedList()` runs first, as in Python. */
  __init__(t: Tracer): void {
    const m: Method = t.enter(SRC, "__init__");
    const data = new SinglyLinkedList<T>();
    data.__init__(m.call({}));
    this._data = data;
    m.step(
      "self._data = SinglyLinkedList()",
      {},
      "The stack keeps its items in an empty linked list.",
    );
  }

  __len__(): number {
    return this._data.__len__();
  }

  is_empty(): boolean {
    return this._data.is_empty();
  }

  push(value: T, t: Tracer): void {
    const m: Method = t.enter(SRC, "push");
    this._data.insert_in_front(value, m.call({ value }));
    m.step(
      "self._data.insert_in_front(value)",
      { value },
      `${t.show(value)} is on top of the stack: the list's head.`,
    );
  }

  pop(t: Tracer): T {
    const m: Method = t.enter(SRC, "pop");
    const at = (snippet: string) => ({ snippet, after: "def pop" });
    if (this.is_empty()) {
      m.raise(
        at('raise ValueError("Cannot pop from an empty stack")'),
        {},
        "ValueError",
        "Cannot pop from an empty stack",
      );
    }
    m.step(at("if self.is_empty():"), {}, "The stack is not empty.");
    const value = this._data.delete_from_front(m.call({}));
    m.step(
      "return self._data.delete_from_front()",
      {},
      `pop returns ${t.show(value)}, the old top.`,
      { returns: value },
    );
    return value;
  }

  peek(t: Tracer): T {
    const m: Method = t.enter(SRC, "peek");
    const at = (snippet: string) => ({ snippet, after: "def peek" });
    if (this.is_empty()) {
      m.raise(
        at('raise ValueError("Cannot peek at an empty stack")'),
        {},
        "ValueError",
        "Cannot peek at an empty stack",
      );
    }
    m.step(at("if self.is_empty():"), {}, "The stack is not empty.");
    const top = this._data._head!;
    const value = structuredClone(top.data());
    m.step(
      "return copy.deepcopy(self._data._head.data())",
      {},
      `peek returns a copy of the top, ${t.show(value)}, and leaves it in place.`,
      { found: top.uid, returns: value },
    );
    return value;
  }
}
