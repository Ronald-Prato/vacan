import { describe, expect, it } from "vitest"

import { CANVAS_SIZE, type CanvasElement } from "./document"
import { snapElementPosition } from "./snapping"

function element(overrides: Partial<CanvasElement> & Pick<CanvasElement, "id">): CanvasElement {
  return {
    id: overrides.id,
    type: "shape",
    name: "Forma",
    shapeType: "rect",
    x: overrides.x ?? 0,
    y: overrides.y ?? 0,
    width: overrides.width ?? 100,
    height: overrides.height ?? 100,
    rotation: overrides.rotation ?? 0,
    opacity: overrides.opacity ?? 1,
    locked: overrides.locked ?? false,
    fill: "#000000",
    stroke: "#ffffff",
  }
}

describe("editor snapping", () => {
  it("snaps the moving center to the canvas center on both axes", () => {
    const moving = element({ id: "moving", width: 200, height: 120 })
    const result = snapElementPosition({
      element: moving,
      position: { x: CANVAS_SIZE.width / 2 - 96, y: CANVAS_SIZE.height / 2 - 63 },
      elements: [moving],
      threshold: 8,
    })

    expect(result).toMatchObject({
      x: CANVAS_SIZE.width / 2 - 100,
      y: CANVAS_SIZE.height / 2 - 60,
      guides: [
        { axis: "vertical", position: CANVAS_SIZE.width / 2 },
        { axis: "horizontal", position: CANVAS_SIZE.height / 2 },
      ],
    })
  })

  it("snaps element edges to other element edges", () => {
    const reference = element({ id: "reference", x: 500, y: 600, width: 300, height: 200 })
    const moving = element({ id: "moving", width: 120, height: 90 })
    const result = snapElementPosition({
      element: moving,
      position: { x: 804, y: 795 },
      elements: [reference, moving],
      threshold: 10,
    })

    expect(result.x).toBe(800)
    expect(result.y).toBe(800)
    expect(result.guides).toEqual([
      { axis: "vertical", position: 800 },
      { axis: "horizontal", position: 800 },
    ])
  })

  it("snaps any moving edge to an element center", () => {
    const reference = element({ id: "reference", x: 700, y: 200, width: 400, height: 300 })
    const moving = element({ id: "moving", width: 200, height: 120 })
    const result = snapElementPosition({
      element: moving,
      position: { x: 899, y: 980 },
      elements: [reference, moving],
      threshold: 4,
    })

    expect(result.x).toBe(900)
    expect(result.guides).toEqual([{ axis: "vertical", position: 900 }])
  })

  it("does not snap outside the configured threshold", () => {
    const reference = element({ id: "reference", x: 500, y: 500 })
    const moving = element({ id: "moving" })
    const result = snapElementPosition({
      element: moving,
      position: { x: 561, y: 561 },
      elements: [reference, moving],
      threshold: 10,
    })

    expect(result).toEqual({ x: 561, y: 561, guides: [] })
  })

  it("ignores the active element as a snap reference", () => {
    const moving = element({ id: "moving", x: 500, y: 500 })
    const result = snapElementPosition({
      element: moving,
      position: { x: 505, y: 505 },
      elements: [moving],
      threshold: 10,
    })

    expect(result.guides).toEqual([])
  })

  it("prefers element guides over canvas guides when distances tie", () => {
    const canvasSize = { width: 2000, height: 2000 }
    const reference = element({ id: "reference", x: 1010, y: 0 })
    const moving = element({ id: "moving", width: 100, height: 100 })
    const result = snapElementPosition({
      element: moving,
      position: { x: 955, y: 1800 },
      elements: [reference, moving],
      canvasSize,
      threshold: 10,
    })

    expect(result.x).toBe(960)
    expect(result.guides).toEqual([{ axis: "vertical", position: 1010 }])
  })
})
