/**
 * Port of grokking_data_structures-main/python/linked_lists/singly_linked_list.py,
 * the one every page that uses a SinglyLinkedList runs: the list pages, and
 * the Stack, the Bag, the sorted list, the hash table's buckets and the
 * graph's adjacency lists built on it.
 *
 * `SinglyLinkedList` and its nested `Node` keep the Python fields (`_head`,
 * `_data`, `_next`) and method names, and each traced method runs the same
 * statements in the same order, recording a step after each (see
 * kit/tracer.ts). Methods the demos only use as queries (`is_empty`,
 * `traverse`, `__len__`) record nothing.
 */
import { SINGLY_LINKED_LIST as SRC } from "../sources";
import type { Method, PyFunction, Tracer } from "../kit/tracer";

export { SRC };

export class Node<T> {
  _data: T;
  _next: Node<T> | null;
  /**
   * Not in the Python: the node's identity across frames, so a drawing can
   * follow it as the list changes. It comes from `Tracer.newUid`.
   */
  readonly uid: string;

  constructor(data: T, next_node: Node<T> | null, uid: string) {
    this._data = data;
    this._next = next_node;
    this.uid = uid;
  }

  data(): T {
    return this._data;
  }

  next(): Node<T> | null {
    return this._next;
  }

  append(next_node: Node<T> | null): void {
    this._next = next_node;
  }
}

/** A predicate passed to `search`: its Python source, and what it computes. */
export type Predicate<T> = PyFunction & { readonly test: (value: T) => boolean };

const after = (anchor: string) => (snippet: string) => ({ snippet, after: anchor });

export class SinglyLinkedList<T> {
  static readonly Node = Node;

  _head: Node<T> | null = null;

  /**
   * Runs `__init__`. The TypeScript constructor already made the list empty,
   * so a list built off the record (a graph vertex's) needs no call.
   */
  __init__(t: Tracer): void {
    this._head = null;
    t.enter(SRC, "__init__").step(
      "self._head = None",
      {},
      "An empty list: its head is None.",
    );
  }

  __len__(): number {
    return this.traverse((x) => x).length;
  }

  is_empty(): boolean {
    return this._head === null;
  }

  traverse<R>(functor: (value: T) => R): R[] {
    let current = this._head;
    const result: R[] = [];
    while (current !== null) {
      result.push(functor(current.data()));
      current = current.next();
    }
    return result;
  }

  insert_in_front(data: T, t: Tracer): void {
    const m: Method = t.enter(SRC, "insert_in_front");
    const old_head = this._head;
    m.step(
      "old_head = self._head",
      { data, old_head },
      old_head === null
        ? "The list is empty, so old_head is None."
        : `old_head holds on to the current head, ${t.show(old_head.data())}.`,
    );
    this._head = new SinglyLinkedList.Node(data, old_head, t.newUid());
    m.step(
      "self._head = SinglyLinkedList.Node(data, old_head)",
      { data, old_head },
      `A new node holding ${t.show(data)}, pointing at old_head, becomes the head.`,
    );
  }

  insert_to_back(data: T, t: Tracer): void {
    const m: Method = t.enter(SRC, "insert_to_back");
    const at = after("def insert_to_back");
    let current = this._head;
    m.step(
      at("current = self._head"),
      { data, current },
      current === null
        ? "current starts at the head, which is None."
        : `current starts at the head, ${t.show(current.data())}.`,
    );
    if (current === null) {
      this._head = new SinglyLinkedList.Node(data, null, t.newUid());
      m.step(
        at("self._head = SinglyLinkedList.Node(data)"),
        { data, current },
        `The list was empty: a new node holding ${t.show(data)} becomes the head.`,
      );
      return;
    }
    while (current.next() !== null) {
      current = current.next()!;
      m.step(
        at("current = current.next()"),
        { data, current },
        `current moves on to ${t.show(current.data())}.`,
      );
    }
    m.step(
      at("while current.next() is not None:"),
      { data, current },
      `${t.show(current.data())} has no successor: current is the last node.`,
    );
    current.append(new SinglyLinkedList.Node(data, null, t.newUid()));
    m.step(
      "current.append(SinglyLinkedList.Node(data))",
      { data, current },
      `A new node holding ${t.show(data)} is appended after ${t.show(current.data())}.`,
    );
  }

  get(index: number, t: Tracer): T {
    const m: Method = t.enter(SRC, "get");
    const at = after("def get(self, index)");
    if (index < 0) {
      m.raise(
        at('raise IndexError("Index must be non-negative")'),
        { index },
        "IndexError",
        "Index must be non-negative",
      );
    }
    let current = this._head;
    m.step(at("current = self._head"), { index, current }, "current starts at the head.");
    let current_index = 0;
    m.step(
      at("current_index = 0"),
      { index, current, current_index },
      "current_index counts the nodes passed so far.",
    );
    while (current_index < index && current !== null) {
      current = current.next();
      m.step(
        at("current = current.next()"),
        { index, current, current_index },
        current === null
          ? "current runs off the end of the list."
          : `current moves on to ${t.show(current.data())}.`,
      );
      current_index += 1;
      m.step(
        at("current_index += 1"),
        { index, current, current_index },
        `current_index is now ${current_index}.`,
      );
    }
    if (current === null) {
      m.raise(
        at('raise IndexError("Index out of bounds")'),
        { index, current, current_index },
        "IndexError",
        "Index out of bounds",
      );
    }
    const value = structuredClone(current.data());
    m.step(
      at("return copy.deepcopy(current.data())"),
      { index, current, current_index },
      `get(${index}) returns a copy of ${t.show(value)}.`,
      { found: current.uid, returns: value },
    );
    return value;
  }

  search(predicate: Predicate<T>, t: Tracer): T | null {
    const m: Method = t.enter(SRC, "search");
    const at = after("def search(self, predicate");
    // Frames hold data only, so the local shows the predicate by its source.
    const shown: PyFunction = { source: predicate.source };
    let current = this._head;
    m.step(
      at("current = self._head"),
      { predicate: shown, current },
      current === null ? "The list is empty." : "current starts at the head.",
    );
    while (current !== null) {
      const hit = predicate.test(current.data());
      m.step(
        at("if predicate(current.data()):"),
        { predicate: shown, current },
        `predicate(${t.show(current.data())}) is ${hit ? "True" : "False"}.`,
      );
      if (hit) {
        m.step(
          at("return current.data()"),
          { predicate: shown, current },
          `search returns ${t.show(current.data())}, the first match.`,
          { found: current.uid, returns: current.data() },
        );
        return current.data();
      }
      current = current.next();
      m.step(
        at("current = current.next()"),
        { predicate: shown, current },
        current === null
          ? "current runs off the end of the list."
          : `current moves on to ${t.show(current.data())}.`,
      );
    }
    m.step(
      at("return None"),
      { predicate: shown, current },
      "Nothing matched: search returns None.",
      { returns: null },
    );
    return null;
  }

  delete(target: T, t: Tracer): void {
    const m: Method = t.enter(SRC, "delete");
    const at = after("def delete(self, target");
    let current = this._head;
    m.step(
      at("current = self._head"),
      { target, current },
      current === null ? "The list is empty." : "current starts at the head.",
    );
    let previous: Node<T> | null = null;
    m.step(
      at("previous = None"),
      { target, current, previous },
      "previous trails one node behind current; the head has none.",
    );
    while (current !== null) {
      // Every list the demos delete from holds ints, for which == is ===.
      const match = current.data() === target;
      m.step(
        at("if current.data() == target:"),
        { target, current, previous },
        match
          ? `${t.show(current.data())} == ${t.show(target)}: this is the node to delete.`
          : `${t.show(current.data())} != ${t.show(target)}.`,
      );
      if (match) {
        if (previous === null) {
          this._head = current.next();
          m.step(
            "self._head = current.next()",
            { target, current, previous },
            "It is the head: the head moves on to its successor.",
          );
        } else {
          previous.append(current.next());
          m.step(
            "previous.append(current.next())",
            { target, current, previous },
            `${t.show(previous.data())} now skips over it, so it is out of the list.`,
          );
        }
        m.step(
          { snippet: "return", after: "previous.append(current.next())" },
          { target, current, previous },
          `${t.show(target)} is deleted.`,
        );
        return;
      }
      previous = current;
      m.step(
        at("previous = current"),
        { target, current, previous },
        "previous catches up with current.",
      );
      current = current.next();
      m.step(
        at("current = current.next()"),
        { target, current, previous },
        current === null
          ? "current runs off the end of the list."
          : `current moves on to ${t.show(current.data())}.`,
      );
    }
    m.raise(
      at("raise ValueError(f'No element"),
      { target, current, previous },
      "ValueError",
      `No element with value ${t.show(target)} was found in the list.`,
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
    const head = this._head!;
    const data = head.data();
    m.step(
      at("data = self._head.data()"),
      { data },
      `Keep the head's data, ${t.show(data)}.`,
    );
    this._head = head.next();
    m.step(
      at("self._head = self._head.next()"),
      { data },
      this._head === null
        ? "The head moves on to None: the list is empty."
        : `The head moves on to ${t.show(this._head.data())}; the old head is gone.`,
    );
    m.step(at("return data"), { data }, `delete_from_front returns ${t.show(data)}.`, {
      returns: data,
    });
    return data;
  }

  size(t: Tracer): number {
    const m: Method = t.enter(SRC, "size");
    const at = after("def size");
    let size = 0;
    m.step(at("size = 0"), { size }, "Count the nodes, starting from 0.");
    let current = this._head;
    m.step(at("current = self._head"), { size, current }, "current starts at the head.");
    while (current !== null) {
      size += 1;
      m.step(
        at("size += 1"),
        { size, current },
        `Count ${t.show(current.data())}: size is ${size}.`,
      );
      current = current.next();
      m.step(
        at("current = current.next()"),
        { size, current },
        current === null
          ? "current runs off the end of the list."
          : `current moves on to ${t.show(current.data())}.`,
      );
    }
    m.step(at("return size"), { size, current }, `size returns ${size}.`, {
      returns: size,
    });
    return size;
  }

  /**
   * The `__iter__` generator, driven to the end the way `list(...)` drives
   * it. Each `yield` adds a value to the list being built, which the step
   * reports as `returns`.
   */
  __iter__(t: Tracer): T[] {
    const m: Method = t.enter(SRC, "__iter__");
    const at = after("def __iter__");
    const yielded: T[] = [];
    let current = this._head;
    m.step(at("current = self._head"), { current }, "The generator starts at the head.");
    while (current !== null) {
      const node = current;
      const data = current.data();
      m.step(at("data = current.data()"), { current, data }, `data is ${t.show(data)}.`);
      current = current.next();
      m.step(
        at("current = current.next()"),
        { current, data },
        "current moves on before handing data out.",
      );
      yielded.push(data);
      m.step(
        at("yield data"),
        { current, data },
        `yield ${t.show(data)}: the loop receives it.`,
        { found: node.uid, returns: [...yielded] },
      );
    }
    m.step(
      at("while current is not None:"),
      { current },
      "current is None: the generator is exhausted.",
      { returns: [...yielded] },
    );
    return yielded;
  }
}
