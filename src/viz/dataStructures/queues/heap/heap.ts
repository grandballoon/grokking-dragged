/**
 * Port of grokking_data_structures-main/python/queues/heap.py.
 *
 * A max-heap over `_elements`, a list read as a complete binary tree (the
 * children of index i sit at 2i + 1 and 2i + 2), ordered by `_priority`.
 * Method names, field names and statement order follow the Python. Like the
 * Python, `_bubble_up` and `_push_down` don't swap: they hold the moving
 * `element` aside, copy each displaced neighbour into the gap, and write
 * `element` once, into its final slot.
 *
 * Each method pushes a record onto the shared call stack while it runs and
 * records its steps in heap.py, so a caller in another file (like
 * k_largest_elements.py) steps into it.
 */
import type { Located } from "../../../../core/trace";
import { within, type Stack } from "../callStack";
import { PyError } from "../../kit/pyError";

/** A Heap method on the call stack, with its locals under their Python names. */
export type HeapCall<T> =
  | { readonly fn: "__init__"; locals: Record<string, never> }
  | {
      readonly fn: "_heapify";
      locals: { last_inner_node_index?: number; index?: number };
    }
  | { readonly fn: "insert"; locals: { element: T } }
  | { readonly fn: "top"; locals: { element?: T } }
  | { readonly fn: "peek"; locals: Record<string, never> }
  | {
      readonly fn: "_bubble_up";
      locals: { index: number; element?: T; parent_index?: number; parent?: T };
    }
  | {
      readonly fn: "_push_down";
      locals: {
        index: number;
        element?: T;
        current_index?: number;
        child_index?: number | null;
      };
    }
  | {
      readonly fn: "_validate";
      locals: {
        current_index?: number;
        first_leaf?: number;
        current_element?: T;
        child_index?: number;
      };
    };

/** How a heap records its steps in heap.py, and how its notes name an element. */
export type HeapTracer<T> = {
  readonly stack: Stack<HeapCall<T>>;
  readonly step: (where: string | Located, heap: Heap<T>, note: string) => void;
  readonly show: (element: T) => string;
};

type CallOf<T, F extends HeapCall<T>["fn"]> = Extract<HeapCall<T>, { fn: F }>;

export class Heap<T> {
  _priority!: (element: T) => number;
  _elements!: T[];
  readonly #tracer: HeapTracer<T>;

  /** `element_priority` defaults to Python's `lambda x: x`, for numbers. */
  constructor(
    tracer: HeapTracer<T>,
    elements: readonly T[] | null = null,
    element_priority: (element: T) => number = (x) => x as unknown as number,
  ) {
    this.#tracer = tracer;
    const call: CallOf<T, "__init__"> = { fn: "__init__", locals: {} };
    within(tracer.stack, call, () => {
      this._priority = element_priority;
      if (elements !== null && elements.length > 0) {
        this._heapify(elements);
      } else {
        this._elements = [];
        this.#step("self._elements = []", "No elements given: the heap starts empty.");
      }
    });
  }

  #step(where: string | Located, note: string): void {
    this.#tracer.step(where, this, note);
  }

  #show(element: T): string {
    return this.#tracer.show(element);
  }

  __len__(): number {
    return this._elements.length;
  }

  _has_lower_priority(element_1: T, element_2: T): boolean {
    return this._priority(element_1) < this._priority(element_2);
  }

  _has_higher_priority(element_1: T, element_2: T): boolean {
    return this._priority(element_1) > this._priority(element_2);
  }

  _validate(): boolean {
    const call: CallOf<T, "_validate"> = { fn: "_validate", locals: {} };
    return within(this.#tracer.stack, call, () => {
      let current_index = 0;
      const first_leaf = this._first_leaf_index();
      call.locals = { current_index, first_leaf };
      this.#step(
        "first_leaf = self._first_leaf_index()",
        `Check each inner node, indexes 0 to ${first_leaf - 1}, against its children.`,
      );
      while (current_index < first_leaf) {
        const current_element = this._elements[current_index]!;
        const first_child = this._left_child_index(current_index);
        const last_child_guard = Math.min(first_child + 2, this.__len__());
        for (
          let child_index = first_child;
          child_index < last_child_guard;
          child_index++
        ) {
          const child = this._elements[child_index]!;
          const lower = this._has_lower_priority(current_element, child);
          call.locals = { current_index, first_leaf, current_element, child_index };
          this.#step(
            "if self._has_lower_priority(current_element,",
            lower
              ? `${this.#show(child)} outranks its parent ${this.#show(current_element)}!`
              : `${this.#show(current_element)} at ${current_index} outranks its child ${this.#show(child)} at ${child_index}.`,
          );
          if (lower) {
            this.#step("return False", "_validate returns False.");
            return false;
          }
        }
        current_index += 1;
      }
      this.#step(
        { snippet: "return True", after: "def _validate" },
        "Every node outranks its children: _validate returns True.",
      );
      return true;
    });
  }

  _left_child_index(index: number): number {
    return index * 2 + 1;
  }

  _parent_index(index: number): number {
    return Math.floor((index - 1) / 2);
  }

  _highest_priority_child_index(index: number): number | null {
    const first_index = this._left_child_index(index);
    if (first_index >= this.__len__()) return null;
    if (first_index + 1 >= this.__len__()) return first_index;
    if (
      this._has_higher_priority(
        this._elements[first_index]!,
        this._elements[first_index + 1]!,
      )
    ) {
      return first_index;
    } else {
      return first_index + 1;
    }
  }

  _first_leaf_index(): number {
    return Math.floor(this.__len__() / 2);
  }

  _push_down(index: number): void {
    const call: CallOf<T, "_push_down"> = { fn: "_push_down", locals: { index } };
    within(this.#tracer.stack, call, () => {
      assert(0 <= index && index < this._elements.length);
      const element = this._elements[index]!;
      call.locals = { index, element };
      const e = this.#show(element);
      this.#step(
        { snippet: "element = self._elements[index]", after: "def _push_down" },
        `Hold on to ${e}, from index ${index}; it sinks while a child outranks it.`,
      );
      let current_index = index;
      for (;;) {
        const child_index = this._highest_priority_child_index(current_index);
        call.locals = { index, element, current_index, child_index };
        if (child_index === null) {
          this.#step(
            "child_index = self._highest_priority_child_index(current_index)",
            `Index ${current_index} has no children, so ${e} stops here.`,
          );
          break;
        }
        const child = this.#show(this._elements[child_index]!);
        this.#step(
          "child_index = self._highest_priority_child_index(current_index)",
          `Index ${current_index}'s highest-priority child is ${child}, at index ${child_index}.`,
        );
        const lower = this._has_lower_priority(element, this._elements[child_index]!);
        this.#step(
          "if self._has_lower_priority(element, self._elements[child_index]):",
          lower
            ? `${e} has lower priority than ${child}, so ${child} moves up.`
            : `${e} doesn't have lower priority than ${child}, so it stops here.`,
        );
        if (lower) {
          this._elements[current_index] = this._elements[child_index]!;
          this.#step(
            "self._elements[current_index] = self._elements[child_index]",
            `Copy ${child} up into index ${current_index}.`,
          );
          current_index = child_index;
          call.locals = { index, element, current_index, child_index };
          this.#step(
            "current_index = child_index",
            `${e} moves down to index ${child_index}.`,
          );
        } else {
          break;
        }
      }
      this._elements[current_index] = element;
      this.#step(
        "self._elements[current_index] = element",
        `Write ${e} into index ${current_index}.`,
      );
    });
  }

  _bubble_up(index: number): void {
    const call: CallOf<T, "_bubble_up"> = { fn: "_bubble_up", locals: { index } };
    within(this.#tracer.stack, call, () => {
      assert(0 <= index && index < this._elements.length);
      const element = this._elements[index]!;
      call.locals = { index, element };
      const e = this.#show(element);
      this.#step(
        { snippet: "element = self._elements[index]", after: "def _bubble_up" },
        `Hold on to ${e}, from index ${index}; it rises while it outranks its parent.`,
      );
      while (index > 0) {
        const parent_index = this._parent_index(index);
        const parent = this._elements[parent_index]!;
        call.locals = { index, element, parent_index, parent };
        const p = this.#show(parent);
        this.#step(
          "parent = self._elements[parent_index]",
          `The parent of index ${index} is ${p}, at index ${parent_index}.`,
        );
        const higher = this._has_higher_priority(element, parent);
        this.#step(
          "if self._has_higher_priority(element, parent):",
          higher
            ? `${e} has higher priority than ${p}, so ${p} moves down.`
            : `${e} doesn't have higher priority than ${p}, so it stops here.`,
        );
        if (higher) {
          this._elements[index] = parent;
          this.#step(
            "self._elements[index] = parent",
            `Copy ${p} down into index ${index}.`,
          );
          index = parent_index;
          call.locals = { index, element, parent_index, parent };
          this.#step("index = parent_index", `${e} moves up to index ${parent_index}.`);
        } else {
          break;
        }
      }
      this._elements[index] = element;
      this.#step(
        "self._elements[index] = element",
        index === 0 ? `Write ${e} into the root.` : `Write ${e} into index ${index}.`,
      );
    });
  }

  _heapify(elements: readonly T[]): void {
    const call: CallOf<T, "_heapify"> = { fn: "_heapify", locals: {} };
    within(this.#tracer.stack, call, () => {
      this._elements = elements.slice();
      this.#step(
        "self._elements = elements[:]",
        `Copy the ${elements.length} elements in as they are; the list isn't a heap yet.`,
      );
      const last_inner_node_index = this._first_leaf_index() - 1;
      call.locals = { last_inner_node_index };
      this.#step(
        "last_inner_node_index = self._first_leaf_index() - 1",
        `Leaves are already heaps. The last inner node is at index ${last_inner_node_index}.`,
      );
      for (let index = last_inner_node_index; index > -1; index--) {
        call.locals = { last_inner_node_index, index };
        this.#step(
          "for index in range(last_inner_node_index, -1, -1):",
          `Push down ${this.#show(this._elements[index]!)}, at index ${index}, to make its subtree a heap.`,
        );
        this._push_down(index);
      }
    });
  }

  is_empty(): boolean {
    return this.__len__() === 0;
  }

  top(): T {
    const call: CallOf<T, "top"> = { fn: "top", locals: {} };
    return within(this.#tracer.stack, call, () => {
      if (this.is_empty()) {
        const error = new PyError("ValueError", "Method top called on an empty heap.");
        this.#step(
          "raise ValueError('Method top called on an empty heap.')",
          error.message,
        );
        throw error;
      }
      let element: T;
      if (this.__len__() === 1) {
        element = this._elements.pop()!;
        call.locals = { element };
        this.#step(
          "element = self._elements.pop()",
          `${this.#show(element)} is the only element: pop it.`,
        );
      } else {
        element = this._elements[0]!;
        call.locals = { element };
        this.#step(
          "element = self._elements[0]",
          `The root, ${this.#show(element)}, has the highest priority.`,
        );
        this._elements[0] = this._elements.pop()!;
        this.#step(
          "self._elements[0] = self._elements.pop()",
          `Move the last element, ${this.#show(this._elements[0])}, into the root.`,
        );
        this._push_down(0);
      }
      this.#step(
        { snippet: "return element", after: "def top" },
        `top returns ${this.#show(element)}.`,
      );
      return element;
    });
  }

  peek(): T {
    const call: CallOf<T, "peek"> = { fn: "peek", locals: {} };
    return within(this.#tracer.stack, call, () => {
      if (this.is_empty()) {
        const error = new PyError("ValueError", "Method peek called on an empty heap.");
        this.#step(
          "raise ValueError('Method peek called on an empty heap.')",
          error.message,
        );
        throw error;
      }
      const element = this._elements[0]!;
      this.#step(
        "return self._elements[0]",
        `peek returns the root, ${this.#show(element)}, and leaves it in place.`,
      );
      return element;
    });
  }

  insert(element: T): void {
    const call: CallOf<T, "insert"> = { fn: "insert", locals: { element } };
    within(this.#tracer.stack, call, () => {
      this._elements.push(element);
      this.#step(
        "self._elements.append(element)",
        `Append ${this.#show(element)} at index ${this._elements.length - 1}, the next free leaf.`,
      );
      this._bubble_up(this._elements.length - 1);
    });
  }
}

/** Python's `assert`: a failure is a bug in the port. */
function assert(condition: boolean): void {
  if (!condition) throw new Error("AssertionError");
}
