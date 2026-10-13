export function interleaveSpotlights<P extends { id: string }, S extends { id: string }>(
  posts: P[],
  spotlights: S[],
) {
  const unique = [...new Map(spotlights.map((item) => [item.id, item])).values()];
  const result: ({ kind: "post"; item: P; postIndex: number } | { kind: "spotlight"; item: S })[] =
    [];
  let cursor = 0;
  posts.forEach((item, postIndex) => {
    result.push({ kind: "post", item, postIndex });
    if ((postIndex + 1) % 3 === 0 && cursor < unique.length) {
      const spotlight = unique[cursor++];
      if (spotlight) result.push({ kind: "spotlight", item: spotlight });
    }
  });
  for (const item of unique.slice(cursor)) result.push({ kind: "spotlight", item });
  return result;
}
export function actualRating(average: unknown, count: unknown) {
  const value = Number(average),
    reviews = Number(count);
  return Number.isFinite(value) &&
    value > 0 &&
    value <= 5 &&
    Number.isFinite(reviews) &&
    reviews > 0
    ? { value, reviews }
    : null;
}
