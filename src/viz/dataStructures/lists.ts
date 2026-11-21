import type { VizEntry } from "../defineViz";
import { bagViz } from "./lists/bag/viz";
import { doublyLinkedListViz } from "./lists/doublyLinkedList/viz";
import { singlyLinkedListViz } from "./lists/singlyLinkedList/viz";
import { sortedSinglyLinkedListViz } from "./lists/sortedSinglyLinkedList/viz";
import { stackViz } from "./lists/stack/viz";
import { stackDynamicArrayViz } from "./lists/stackDynamicArray/viz";

export const ENTRIES: readonly VizEntry[] = [
  singlyLinkedListViz,
  sortedSinglyLinkedListViz,
  doublyLinkedListViz,
  stackViz,
  stackDynamicArrayViz,
  bagViz,
];
