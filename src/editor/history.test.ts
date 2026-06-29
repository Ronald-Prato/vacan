import { describe, expect, it } from "vitest"

import {
  createHistoryState,
  pushHistory,
  redoHistory,
  replaceHistoryPresent,
  undoHistory,
} from "./history"

type TestDocument = {
  name: string
  version: number
}

describe("editor history", () => {
  it("pushes document states and walks back with undo", () => {
    const initial = createHistoryState<TestDocument>({ name: "Initial", version: 1 })
    const second = pushHistory(initial, { name: "Second", version: 2 })
    const third = pushHistory(second, { name: "Third", version: 3 })

    const undone = undoHistory(third)

    expect(undone.present).toEqual({ name: "Second", version: 2 })
    expect(undone.past).toEqual([{ name: "Initial", version: 1 }])
    expect(undone.future).toEqual([{ name: "Third", version: 3 }])
  })

  it("redoes the most recent undone state", () => {
    const history = pushHistory(
      pushHistory(createHistoryState<TestDocument>({ name: "Initial", version: 1 }), {
        name: "Second",
        version: 2,
      }),
      { name: "Third", version: 3 },
    )

    const redone = redoHistory(undoHistory(history))

    expect(redone.present).toEqual({ name: "Third", version: 3 })
    expect(redone.future).toEqual([])
  })

  it("clears redo states when a new state is pushed after undo", () => {
    const history = pushHistory(
      pushHistory(createHistoryState<TestDocument>({ name: "Initial", version: 1 }), {
        name: "Second",
        version: 2,
      }),
      { name: "Third", version: 3 },
    )

    const undone = undoHistory(history)
    const branched = pushHistory(undone, { name: "Branch", version: 4 })

    expect(branched.present).toEqual({ name: "Branch", version: 4 })
    expect(branched.future).toEqual([])
  })

  it("does not push identical states", () => {
    const initial = createHistoryState<TestDocument>({ name: "Initial", version: 1 })
    const next = pushHistory(initial, { name: "Initial", version: 1 })

    expect(next).toEqual(initial)
  })

  it("keeps a bounded past stack", () => {
    const initial = createHistoryState<TestDocument>({ name: "Initial", version: 1 })
    const second = pushHistory(initial, { name: "Second", version: 2 }, { limit: 2 })
    const third = pushHistory(second, { name: "Third", version: 3 }, { limit: 2 })
    const fourth = pushHistory(third, { name: "Fourth", version: 4 }, { limit: 2 })

    expect(fourth.past).toEqual([
      { name: "Second", version: 2 },
      { name: "Third", version: 3 },
    ])
  })

  it("replaces the current state without keeping undo history", () => {
    const history = pushHistory(createHistoryState<TestDocument>({ name: "Initial", version: 1 }), {
      name: "Second",
      version: 2,
    })

    const replaced = replaceHistoryPresent(history, { name: "Loaded", version: 10 })

    expect(replaced).toEqual({
      past: [],
      present: { name: "Loaded", version: 10 },
      future: [],
    })
  })
})
