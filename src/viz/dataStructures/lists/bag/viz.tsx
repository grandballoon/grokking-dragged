import { defineViz } from "../../../defineViz";
import { SINGLY_LINKED_LIST } from "../../sources";
import { DIAGRAM_HEIGHT } from "../shared/band";
import { nextValue } from "../shared/edits";
import { listDraw } from "../shared/listViz";
import { INITIAL_INPUT, run, SRC, type BagFields } from "./trace";

export const bagViz = defineViz({
  id: "ds-bag",
  title: "Bag",
  book: "Grokking Data Structures",
  chapter: "7 · Abstract data types",
  summary:
    "A bag only collects values and hands them all back, in no promised order. Built on a singly linked list, every insert goes in front in constant time, and iterating walks the list from the head, so values come back newest first.",
  drags: [
    "the timeline knob to step through the script",
    "a call in the script to reorder it, or its − and + to change its argument",
    "the value in the palette into the bag to insert it",
  ],
  sources: [SRC, SINGLY_LINKED_LIST],
  initialInput: INITIAL_INPUT,
  run,
  diagramHeight: DIAGRAM_HEIGHT,
  draw: listDraw<BagFields>({
    prefix: "bag",
    kind: "singly",
    title: "bag._data = SinglyLinkedList()",
    fields: (obj) => ({ _head: obj._data._head }),
    inserts: (ops) => [["insert", nextValue(ops)]],
    chipText: (ops) => String(nextValue(ops)),
    hint: "into the bag",
  }),
});
