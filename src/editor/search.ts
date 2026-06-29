export type SearchAccessor<T> = keyof T | ((item: T) => string)

export function normalizeSearchText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase()
}

export function matchesSearchQuery<T>(
  item: T,
  query: string,
  accessors: SearchAccessor<T>[],
): boolean {
  const normalizedQuery = normalizeSearchText(query)

  if (!normalizedQuery) {
    return true
  }

  const searchableText = normalizeSearchText(
    accessors.map((accessor) => resolveAccessor(item, accessor)).join(" "),
  )
  const terms = normalizedQuery.split(" ")

  return terms.every((term) => searchableText.includes(term))
}

export function filterSearchItems<T>(
  items: readonly T[],
  query: string,
  accessors: SearchAccessor<T>[],
): T[] {
  return items.filter((item) => matchesSearchQuery(item, query, accessors))
}

function resolveAccessor<T>(item: T, accessor: SearchAccessor<T>): string {
  if (typeof accessor === "function") {
    return accessor(item)
  }

  const value = item[accessor]

  return typeof value === "string" || typeof value === "number" ? String(value) : ""
}
