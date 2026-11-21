/**
 * Port of grokking_data_structures-main/python/linked_lists/doubly_linked_list.py,
 * the one the doubly linked list page and the linked queue (built on it in
 * queues/queue_linked_list.py) both run.
 *
 * `DoublyLinkedList` and its nested `Node` keep the Python fields (`_head`,
 * `_tail`, `_data`, `_next`, `_prev`) and methods. The node's `append` and
 * `prepend` each set two links, one at a time, so they are traced too: the
 * trace steps into them, as `Node.append` and `Node.prepend`, with the
 * calling method's locals kept underneath. The methods no demo calls are
 * left out.
 */
import { DOUBLY_LINKED_LIST as SRC } from "../sources";
import type { Method, Tracer } from "../kit/tracer";

export { SRC };

const after = (anchor: string) => (snippet: string) => ({ snippet, after: anchor });

export class Node<T> {
  _data: T;
  _next: Node<T> | null = null;
  _prev: Node<T> | null = null;
  /**
   * Not in the Python: the node's identity across frames, so a drawing can
   * follow it as the list changes. It comes from `Tracer.newUid`.
   */
  readonly uid: string;

  constructor(data: T, uid: string) {
    this._data = data;
    this.uid = uid;
  }

  data(): T {
    return this._data;
  }

  next(): Node<T> | null {
    return this._next;
  }

  prev(): Node<T> | null {
    return this._prev;
  }

  append(next_node: Node<T> | null, t: Tracer): void {
    const m: Method = t.enter(SRC, "Node.append");
    this._next = next_node;
    m.step(
      "self._next = next_node",
      { self: this, next_node },
      next_node === null
        ? `${t.show(this._data)}'s _next is now None.`
        : `${t.show(this._data)}'s _next now points at ${t.show(next_node._data)}.`,
    );
    if (next_node !== null) {
      next_node._prev = this;
      m.step(
        "next_node._prev = self",
        { self: this, next_node },
        `${t.show(next_node._data)}'s _prev points back at ${t.show(this._data)}.`,
      );
    }
  }

  prepend(prev_node: Node<T> | null, t: Tracer): void {
    const m: Method = t.enter(SRC, "Node.prepend");
    this._prev = prev_node;
    m.step(
      "self._prev = prev_node",
      { self: this, prev_node },
      prev_node === null
        ? `${t.show(this._data)}'s _prev is now None.`
        : `${t.show(this._data)}'s _prev now points at ${t.show(prev_node._data)}.`,
    );
    if (prev_node !== null) {
      prev_node._next = this;
      m.step(
        "prev_node._next = self",
        { self: this, prev_node },
        `${t.show(prev_node._data)}'s _next points on to ${t.show(this._data)}.`,
      );
    }
  }
}

export class DoublyLinkedList<T> {
  static readonly Node = Node;

  _head: Node<T> | null = null;
  _tail: Node<T> | null = null;

  /** Runs `__init__`; the TypeScript constructor already made the list empty. */
  __init__(t: Tracer): void {
    const m: Method = t.enter(SRC, "__init__");
    const at = after("def __init__(self) -> None:");
    this._head = null;
    m.step(at("self._head = None"), {}, "An empty list: no head yet...");
    this._tail = null;
    m.step(at("self._tail = None"), {}, "...and no tail.");
  }

  is_empty(): boolean {
    return this._head === null;
  }

  insert_in_front(data: T, t: Tracer): void {
    const m: Method = t.enter(SRC, "insert_in_front");
    const at = after("def insert_in_front");
    if (this._head === null) {
      this._tail = this._head = new DoublyLinkedList.Node(data, t.newUid());
      m.step(
        at("self._tail = self._head = DoublyLinkedList.Node(data)"),
        { data },
        `The list was empty: a new node holding ${t.show(data)} is both head and tail.`,
      );
      return;
    }
    const old_head = this._head;
    m.step(
      "old_head = self._head",
      { data, old_head },
      `old_head holds on to the current head, ${t.show(old_head.data())}.`,
    );
    this._head = new DoublyLinkedList.Node(data, t.newUid());
    m.step(
      {
        snippet: "self._head = DoublyLinkedList.Node(data)",
        after: "old_head = self._head",
      },
      { data, old_head },
      `A new node holding ${t.show(data)} becomes the head, not yet linked to old_head.`,
    );
    this._head.append(old_head, m.call({ data, old_head }));
    m.step(
      "self._head.append(old_head)",
      { data, old_head },
      `${t.show(data)} and ${t.show(old_head.data())} now point at each other.`,
    );
  }

  insert_to_back(data: T, t: Tracer): void {
    const m: Method = t.enter(SRC, "insert_to_back");
    const at = after("def insert_to_back");
    if (this._tail === null) {
      this._tail = this._head = new DoublyLinkedList.Node(data, t.newUid());
      m.step(
        at("self._tail = self._head = DoublyLinkedList.Node(data)"),
        { data },
        `The list was empty: a new node holding ${t.show(data)} is both head and tail.`,
      );
      return;
    }
    const old_tail = this._tail;
    m.step(
      "old_tail = self._tail",
      { data, old_tail },
      `old_tail holds on to the current tail, ${t.show(old_tail.data())}.`,
    );
    this._tail = new DoublyLinkedList.Node(data, t.newUid());
    m.step(
      {
        snippet: "self._tail = DoublyLinkedList.Node(data)",
        after: "old_tail = self._tail",
      },
      { data, old_tail },
      `A new node holding ${t.show(data)} becomes the tail, not yet linked to old_tail.`,
    );
    this._tail.prepend(old_tail, m.call({ data, old_tail }));
    m.step(
      "self._tail.prepend(old_tail)",
      { data, old_tail },
      `${t.show(old_tail.data())} and ${t.show(data)} now point at each other.`,
    );
  }

  _search(target: T, t: Tracer): Node<T> | null {
    const m: Method = t.enter(SRC, "_search");
    const at = after("def _search");
    let current = this._head;
    m.step(
      at("current = self._head"),
      { target, current },
      "current starts at the head.",
    );
    while (current !== null) {
      // Every list the demos delete from holds ints, for which == is ===.
      const match = current.data() === target;
      m.step(
        at("if current.data() == target:"),
        { target, current },
        match
          ? `${t.show(current.data())} == ${t.show(target)}: found it.`
          : `${t.show(current.data())} != ${t.show(target)}.`,
      );
      if (match) {
        m.step(at("return current"), { target, current }, "_search returns this node.");
        return current;
      }
      current = current.next();
      m.step(
        at("current = current.next()"),
        { target, current },
        current === null
          ? "current runs off the end of the list."
          : `current moves on to ${t.show(current.data())}.`,
      );
    }
    m.step(
      at("return None"),
      { target, current },
      "No node holds the target: return None.",
    );
    return null;
  }

  delete(target: T, t: Tracer): void {
    const m: Method = t.enter(SRC, "delete");
    const at = after("def delete(self, target");
    const node = this._search(target, m.call({ target }));
    m.step(
      "node = self._search(target)",
      { target, node },
      node === null
        ? `No node holds ${t.show(target)}.`
        : `node is the node holding ${t.show(target)}.`,
    );
    if (node === null) {
      m.raise(
        at("raise ValueError(f'No element"),
        { target, node },
        "ValueError",
        `No element with value ${t.show(target)} was found in the list.`,
      );
    }
    const isHead = node.prev() === null;
    m.step(
      "if node.prev() is None:",
      { target, node },
      isHead ? "node has no predecessor: it is the head." : "node has a predecessor.",
    );
    if (isHead) {
      this._head = node.next();
      m.step(
        "self._head = node.next()",
        { target, node },
        this._head === null
          ? "The head moves on to None."
          : `The head moves on to ${t.show(this._head.data())}.`,
      );
      if (this._head === null) {
        this._tail = null;
        m.step(
          at("self._tail = None"),
          { target, node },
          "node was the only node: the tail is None too, and the list is empty.",
        );
      } else {
        this._head.prepend(null, m.call({ target, node }));
        m.step(
          at("self._head.prepend(None)"),
          { target, node },
          "The new head no longer points back at node: it is out of the list.",
        );
      }
      return;
    }
    const isTail = node.next() === null;
    m.step(
      "elif node.next() is None:",
      { target, node },
      isTail
        ? "node has no successor: it is the tail."
        : "node has a successor too: it is in the middle.",
    );
    if (isTail) {
      this._tail = node.prev();
      m.step(
        "self._tail = node.prev()",
        { target, node },
        `The tail moves back to ${t.show(this._tail!.data())}.`,
      );
      this._tail!.append(null, m.call({ target, node }));
      m.step(
        at("self._tail.append(None)"),
        { target, node },
        "The new tail no longer points on to node: it is out of the list.",
      );
      return;
    }
    const prev = node.prev()!;
    const next = node.next()!;
    prev.append(next, m.call({ target, node }));
    m.step(
      "node.prev().append(node.next())",
      { target, node },
      `${t.show(prev.data())} and ${t.show(next.data())} now point at each other, around node.`,
    );
    m.step(
      "del node",
      { target },
      "The local name node is gone; nothing refers to the node.",
    );
  }

  delete_from_front(t: Tracer): T {
    const m: Method = t.enter(SRC, "delete_from_front");
    const at = after("def delete_from_front");
    if (this.is_empty()) {
      m.raise(
        at("raise ValueError('Delete on an empty list.')"),
        {},
        "ValueError",
        "Delete on an empty list.",
      );
    }
    m.step(at("if self.is_empty():"), {}, "The list is not empty.");
    const data = this._head!.data();
    m.step(
      "data = self._head.data()",
      { data },
      `Keep the head's data, ${t.show(data)}.`,
    );
    this._head = this._head!.next();
    m.step(
      "self._head = self._head.next()",
      { data },
      this._head === null
        ? "The head moves on to None."
        : `The head moves on to ${t.show(this._head.data())}.`,
    );
    if (this._head === null) {
      this._tail = null;
      m.step(
        at("self._tail = None"),
        { data },
        "That was the only node: the tail is None too.",
      );
    } else {
      this._head.prepend(null, m.call({ data }));
      m.step(
        at("self._head.prepend(None)"),
        { data },
        "The new head no longer points back: the old head is gone.",
      );
    }
    m.step(at("return data"), { data }, `delete_from_front returns ${t.show(data)}.`, {
      returns: data,
    });
    return data;
  }

  delete_from_back(t: Tracer): T {
    const m: Method = t.enter(SRC, "delete_from_back");
    const at = after("def delete_from_back");
    if (this.is_empty()) {
      m.raise(
        at("raise ValueError('Delete on an empty list.')"),
        {},
        "ValueError",
        "Delete on an empty list.",
      );
    }
    m.step(at("if self.is_empty():"), {}, "The list is not empty.");
    const data = this._tail!.data();
    m.step(
      "data = self._tail.data()",
      { data },
      `Keep the tail's data, ${t.show(data)}.`,
    );
    this._tail = this._tail!.prev();
    m.step(
      "self._tail = self._tail.prev()",
      { data },
      this._tail === null
        ? "The tail moves back to None."
        : `The tail moves back to ${t.show(this._tail.data())}.`,
    );
    if (this._tail === null) {
      this._head = null;
      m.step(
        at("self._head = None"),
        { data },
        "That was the only node: the head is None too.",
      );
    } else {
      this._tail.append(null, m.call({ data }));
      m.step(
        at("self._tail.append(None)"),
        { data },
        "The new tail no longer points on: the old tail is gone.",
      );
    }
    m.step(at("return data"), { data }, `delete_from_back returns ${t.show(data)}.`, {
      returns: data,
    });
    return data;
  }
}
