/** Finance totals must never silently use a truncated or failed read. */
export async function allFinanceRows<T>(
  readPage: (
    from: number,
    to: number,
  ) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
) {
  const rows: T[] = [];
  for (let from = 0; ; from += 500) {
    const result = await readPage(from, from + 499);
    if (result.error) throw new Error(`Finance data unavailable: ${result.error.message}`);
    rows.push(...(result.data ?? []));
    if ((result.data?.length ?? 0) < 500) return { data: rows, error: null };
  }
}
