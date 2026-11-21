import { defineViz } from "../../../defineViz";
import { DIAGRAM_HEIGHT } from "../shared/band";
import { listDraw } from "../shared/listViz";
import type { ListFields } from "../singlyLinkedList/trace";
import { SINGLY_LINKED_LIST } from "../../sources";
import { INITIAL_INPUT, run, SRC, valueForGap } from "./trace";

export const sortedSinglyLinkedListViz = defineViz({
  id: "ds-sorted-singly-linked-list",
  title: "Sorted singly linked list",
  book: "Grokking Data Structures",
  chapter: "6 · Linked lists",
  summary:
    "A singly linked list that keeps its values in ascending order: insert walks to the first node at least as large and links the new node in just before it. Inserting at either end on demand would break the order, so those methods raise.",
  drags: [
    "the timeline knob to step through the script",
    "a call in the script to reorder it, or its − and + to change its argument",
    "the ? in the palette into any gap of the list to insert a value that belongs there",
    "a node out of the list to delete its value",
  ],
  sources: [SRC, SINGLY_LINKED_LIST],
  initialInput: INITIAL_INPUT,
  run,
  diagramHeight: DIAGRAM_HEIGHT,
  draw: listDraw<ListFields>({
    prefix: "ssl",
    kind: "singly",
    title: "ssl = SortedSinglyLinkedList()",
    fields: (obj) => ({ _head: obj._head }),
    inserts: (_, data) => {
      const values = new Set<number>();
      for (let gap = 0; gap <= data.length; gap++) {
        const v = valueForGap(data, gap);
        if (v !== null && v >= -99 && v <= 99) values.add(v);
      }
      return [...values].map((arg) => ["insert", arg] as const);
    },
    chipText: () => "?",
    hint: "into any gap",
    removal: (slot) => ["delete", slot.node._data as number],
  }),
});
