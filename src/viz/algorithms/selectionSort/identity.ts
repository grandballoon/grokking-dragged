/**
 * Which input element each number in `newArr` and `arr` is, so an item keeps
 * its id as it moves from `arr` to `newArr`.
 *
 * The trace holds plain numbers, as the Python does. Their identity follows
 * from how the sort moves them: `findSmallest` picks the first of equal
 * smallest items (it only switches on a strict `<`), and `pop` keeps the
 * rest in order. So the k-th copy of a value in `newArr` is the k-th copy of
 * it in the input, and the copies left in `arr` are the ones after those.
 */
export function itemIds(
  input: { readonly arr: readonly number[]; readonly ids: readonly string[] },
  newArr: readonly number[],
  arr: readonly number[],
): { readonly newArr: string[]; readonly arr: string[] } {
  const queues = new Map<number, string[]>();
  input.arr.forEach((v, i) => {
    queues.set(v, [...(queues.get(v) ?? []), input.ids[i]!]);
  });
  const take = (v: number) => queues.get(v)!.shift()!;
  const newIds = newArr.map(take);
  return { newArr: newIds, arr: arr.map(take) };
}
