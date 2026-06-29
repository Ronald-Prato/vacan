import { describe, expect, it } from "vitest"

import { addElementToPage, createInitialDocument, createShapeElement } from "./document"
import {
  DESIGN_FORMATS,
  DESIGN_TEMPLATES,
  createBlankDocumentForFormat,
  createDocumentFromTemplate,
  resizeDocumentToFormat,
} from "./templates"

function idSequence() {
  let index = 0

  return () => {
    index += 1
    return `id-${index}`
  }
}

describe("design templates and formats", () => {
  it("offers essential Canva-like starting formats", () => {
    expect(DESIGN_FORMATS.map((format) => format.id)).toEqual([
      "square-post",
      "story",
      "presentation",
      "poster",
    ])
  })

  it("creates blank documents for a selected format", () => {
    const document = createBlankDocumentForFormat("story", idSequence())

    expect(document.name).toBe("Historia vertical")
    expect(document.size).toEqual({ width: 1080, height: 1920 })
    expect(document.pages).toHaveLength(1)
    expect(document.pages[0].elements).toHaveLength(0)
  })

  it("creates a complete editable document from a template", () => {
    const document = createDocumentFromTemplate("launch-post", idSequence())

    expect(document.name).toBe("Post promocional")
    expect(document.size).toEqual({ width: 1080, height: 1080 })
    expect(document.pages[0].background).toBe("#101827")
    expect(document.pages[0].elements.length).toBeGreaterThanOrEqual(3)

    for (const element of document.pages[0].elements) {
      expect(element.x).toBeGreaterThanOrEqual(0)
      expect(element.y).toBeGreaterThanOrEqual(0)
      expect(element.x + element.width).toBeLessThanOrEqual(document.size.width)
      expect(element.y + element.height).toBeLessThanOrEqual(document.size.height)
    }
  })

  it("scales an existing document when changing format", () => {
    const nextId = idSequence()
    const document = createInitialDocument(nextId)
    const pageId = document.pages[0].id
    const shape = createShapeElement("rect", nextId, { x: 1024, y: 2048 })
    const withShape = addElementToPage(document, pageId, shape)

    const resized = resizeDocumentToFormat(withShape, "presentation")
    const resizedShape = resized.pages[0].elements[0]

    expect(resized.size).toEqual({ width: 1920, height: 1080 })
    expect(resizedShape.x).toBe(480)
    expect(resizedShape.y).toBe(540)
    expect(resizedShape.width).toBeCloseTo(337.5)
    expect(resizedShape.height).toBeCloseTo(147.65625)
  })

  it("keeps template definitions discoverable for the UI", () => {
    expect(DESIGN_TEMPLATES.map((template) => template.id)).toEqual([
      "launch-post",
      "story-announcement",
      "pitch-deck",
    ])
  })
})
