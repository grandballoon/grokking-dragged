/**
 * Port of grokking_data_structures-main/python/queues/queue.py, the one the
 * circular queue page and the graph's `bfs` both run.
 *
 * `Queue` keeps the Python fields: `_data`, a list of `_max_size` slots used
 * as a circular buffer, the `_front` and `_rear` indexes that chase each
 * other around it, and `_size`. `dequeue` leaves the value it read in its
 * slot, as the Python does; only `_front` moves past it.
 */
import { QUEUE as SRC } from "../sources";
import type { Method, Tracer } from "../kit/tracer";

export { SRC };

export class Queue<T> {
  _data: (T | null)[] = [];
  _max_size = 0;
  _front = 0;
  _rear = 0;
  _size = 0;

  /**
   * Runs `__init__(max_size)`. Until it has, the TypeScript object is a
   * queue of no slots, which is what a frame at its `raise` line holds.
   */
  __init__(max_size: number, t: Tracer): void {
    const m: Method = t.enter(SRC, "__init__");
    if (max_size <= 1) {
      m.raise(
        "raise ValueError(f'Invalid size",
        { max_size },
        "ValueError",
        `Invalid size (a queue must have at least two elements): ${max_size}`,
      );
    }
    this._data = new Array<T | null>(max_size).fill(null);
    this._max_size = max_size;
    this._front = 0;
    this._rear = 0;
    this._size = 0;
    m.step(
      "self._size = 0",
      { max_size },
      `Queue(${max_size}) allocates ${max_size} empty slots; _front, _rear and _size all start at 0.`,
    );
  }

  __len__(): number {
    return this._size;
  }

  is_empty(): boolean {
    return this.__len__() === 0;
  }

  is_full(): boolean {
    return this.__len__() === this._max_size;
  }

  enqueue(value: T, t: Tracer): void {
    const m: Method = t.enter(SRC, "enqueue");
    const full = this.is_full();
    m.step(
      "if self.is_full():",
      { value },
      full
        ? `All ${this._max_size} slots are taken, so the queue is full.`
        : `The queue isn't full: ${this._size} of ${this._max_size} slots are taken.`,
    );
    if (full) {
      m.raise(
        "raise ValueError('The queue is already full!')",
        { value },
        "ValueError",
        "The queue is already full!",
      );
    }
    this._data[this._rear] = value;
    m.step(
      "self._data[self._rear] = value",
      { value },
      `Write ${t.show(value)} into _data[${this._rear}], the slot _rear points at.`,
    );
    const rear = this._rear;
    this._rear = (this._rear + 1) % this._max_size;
    m.step(
      "self._rear = (self._rear + 1) % self._max_size",
      { value },
      this._rear === 0
        ? `_rear = (${rear} + 1) % ${this._max_size} = 0: it wraps around to the first slot.`
        : `_rear = (${rear} + 1) % ${this._max_size} = ${this._rear}.`,
    );
    this._size += 1;
    m.step(
      "self._size += 1",
      { value },
      `${t.show(value)} is queued in slot ${rear}: the queue now holds ${this._size}.`,
    );
  }

  dequeue(t: Tracer): T {
    const m: Method = t.enter(SRC, "dequeue");
    const empty = this.is_empty();
    m.step(
      { snippet: "if self.is_empty():", after: "def dequeue" },
      {},
      empty ? "The queue is empty." : `The queue holds ${this._size}, so it isn't empty.`,
    );
    if (empty) {
      m.raise(
        'raise ValueError("Cannot dequeue from an empty queue")',
        {},
        "ValueError",
        "Cannot dequeue from an empty queue",
      );
    }
    const front = this._front;
    const value = this._data[front] as T;
    m.step(
      "value = self._data[self._front]",
      { value },
      `Read the oldest value, ${t.show(value)}, from _data[${front}], where _front points.`,
    );
    this._front = (this._front + 1) % this._max_size;
    m.step(
      "self._front = (self._front + 1) % self._max_size",
      { value },
      `_front = (${front} + 1) % ${this._max_size} = ${this._front}${this._front === 0 ? ": it wraps around" : ""}. ${t.show(value)} stays in its slot, but is no longer in the queue.`,
    );
    this._size -= 1;
    m.step("self._size -= 1", { value }, `The queue now holds ${this._size}.`);
    m.step(
      "return value",
      { value },
      `dequeue returns ${t.show(value)}, read from slot ${front}.`,
      { returns: value },
    );
    return value;
  }
}
