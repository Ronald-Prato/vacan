import { describe, expect, it } from "vitest"

import { filterSearchItems, matchesSearchQuery, normalizeSearchText } from "./search"

const items = [
  { id: "1", name: "Post promocional", category: "Redes" },
  { id: "2", name: "Historia dinámica", category: "Redes" },
  { id: "3", name: "Pitch deck", category: "Presentación" },
]

describe("editor search", () => {
  it("normalizes case, accents, and extra spaces", () => {
    expect(normalizeSearchText("  Presentación DINÁMICA  ")).toBe("presentacion dinamica")
  })

  it("matches across multiple fields", () => {
    expect(matchesSearchQuery(items[2], "presentacion", ["name", "category"])).toBe(true)
    expect(matchesSearchQuery(items[2], "poster", ["name", "category"])).toBe(false)
  })

  it("returns all items for an empty query", () => {
    expect(filterSearchItems(items, " ", ["name"])).toEqual(items)
  })

  it("filters items with accent-insensitive queries", () => {
    expect(filterSearchItems(items, "dinamica", ["name"])).toEqual([items[1]])
  })

  it("supports custom string accessors", () => {
    const result = filterSearchItems(items, "pitch presentacion", [
      (item) => `${item.name} ${item.category}`,
    ])

    expect(result).toEqual([items[2]])
  })
})
