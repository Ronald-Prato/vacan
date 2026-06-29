import { describe, expect, it } from "vitest"

import {
  CANVAS_SIZE,
  addElementToPage,
  addPage,
  createImageElement,
  createInitialDocument,
  createShapeElement,
  createTextElement,
  deleteElement,
  duplicateElement,
  duplicateElementBehind,
  findElement,
  moveElementBackward,
  moveElementForward,
  moveElementToBack,
  moveElementToFront,
  pageElementCount,
  toggleElementLocked,
  updateElement,
  type Asset,
} from "./document"

function idSequence() {
  let index = 0

  return () => {
    index += 1
    return `id-${index}`
  }
}

const asset: Asset = {
  id: "asset-1",
  name: "Hero",
  src: "data:image/png;base64,hero",
}

describe("editor document model", () => {
  it("uses a square 4096px canvas", () => {
    expect(CANVAS_SIZE).toEqual({ width: 4096, height: 4096 })
  })

  it("creates a document with a single empty page", () => {
    const nextId = idSequence()
    const document = createInitialDocument(nextId)

    expect(document.name).toBe("Post de lanzamiento")
    expect(document.pages).toHaveLength(1)
    expect(document.pages[0].name).toBe("Pagina 1")
    expect(document.pages[0].elements).toHaveLength(0)
  })

  it("adds pages below the current page stack", () => {
    const nextId = idSequence()
    const document = addPage(createInitialDocument(nextId), nextId)

    expect(document.pages).toHaveLength(2)
    expect(document.pages[1].name).toBe("Pagina 2")
  })

  it("scales uploaded images to fit the canvas", () => {
    const element = createImageElement({
      asset,
      imageSize: { width: 2400, height: 1200 },
      createId: () => "image-1",
    })

    expect(element.width).toBeLessThanOrEqual(CANVAS_SIZE.width * 0.68)
    expect(element.height).toBeLessThanOrEqual(CANVAS_SIZE.height * 0.68)
    expect(element.x).toBeGreaterThan(0)
    expect(element.y).toBeGreaterThan(0)
  })

  it("adds and updates elements inside a page", () => {
    const nextId = idSequence()
    const document = createInitialDocument(nextId)
    const pageId = document.pages[0].id
    const text = createTextElement(nextId)
    const withText = addElementToPage(document, pageId, text)
    const updated = updateElement(withText, pageId, text.id, { x: 88, text: "Nuevo titulo" })

    expect(pageElementCount(updated, pageId)).toBe(1)
    expect(findElement(updated, { pageId, elementId: text.id })).toMatchObject({
      x: 88,
      text: "Nuevo titulo",
    })
  })

  it("creates shapes at a provided drop position", () => {
    const shape = createShapeElement("triangle", () => "shape-1", { x: 128, y: 96 })

    expect(shape).toMatchObject({
      id: "shape-1",
      name: "Triangulo",
      x: 128,
      y: 96,
    })
  })

  it("duplicates selected elements with a Canva-like offset", () => {
    const nextId = idSequence()
    const document = createInitialDocument(nextId)
    const pageId = document.pages[0].id
    const shape = createShapeElement("rect", nextId)
    const withShape = addElementToPage(document, pageId, shape)
    const result = duplicateElement(withShape, pageId, shape.id, nextId)

    expect(result.duplicatedId).toBe("id-3")
    expect(pageElementCount(result.document, pageId)).toBe(2)
    expect(findElement(result.document, { pageId, elementId: "id-3" })).toMatchObject({
      name: "Cuadrado copia",
      x: shape.x + 28,
      y: shape.y + 28,
    })
  })

  it("keeps an alt-drag duplicate behind the moving source", () => {
    const nextId = idSequence()
    const document = createInitialDocument(nextId)
    const pageId = document.pages[0].id
    const text = createTextElement(nextId)
    const withText = addElementToPage(document, pageId, text)
    const duplicated = duplicateElementBehind(withText, pageId, text.id, nextId)

    expect(duplicated.pages[0].elements.map((element) => element.id)).toEqual(["id-3", "id-2"])
  })

  it("deletes elements from the selected page", () => {
    const nextId = idSequence()
    const document = createInitialDocument(nextId)
    const pageId = document.pages[0].id
    const text = createTextElement(nextId)
    const withText = addElementToPage(document, pageId, text)
    const deleted = deleteElement(withText, pageId, text.id)

    expect(pageElementCount(deleted, pageId)).toBe(0)
    expect(findElement(deleted, { pageId, elementId: text.id })).toBeNull()
  })

  it("moves elements through the layer stack", () => {
    const nextId = idSequence()
    const document = createInitialDocument(nextId)
    const pageId = document.pages[0].id
    const first = createShapeElement("rect", nextId)
    const second = createShapeElement("circle", nextId)
    const third = createShapeElement("triangle", nextId)
    const withElements = [first, second, third].reduce(
      (currentDocument, element) => addElementToPage(currentDocument, pageId, element),
      document,
    )

    const movedForward = moveElementForward(withElements, pageId, first.id)
    expect(movedForward.pages[0].elements.map((element) => element.id)).toEqual([
      second.id,
      first.id,
      third.id,
    ])

    const movedToFront = moveElementToFront(movedForward, pageId, first.id)
    expect(movedToFront.pages[0].elements.map((element) => element.id)).toEqual([
      second.id,
      third.id,
      first.id,
    ])

    const movedBackward = moveElementBackward(movedToFront, pageId, first.id)
    expect(movedBackward.pages[0].elements.map((element) => element.id)).toEqual([
      second.id,
      first.id,
      third.id,
    ])

    const movedToBack = moveElementToBack(movedBackward, pageId, third.id)
    expect(movedToBack.pages[0].elements.map((element) => element.id)).toEqual([
      third.id,
      second.id,
      first.id,
    ])
  })

  it("toggles element locking without changing its layer position", () => {
    const nextId = idSequence()
    const document = createInitialDocument(nextId)
    const pageId = document.pages[0].id
    const shape = createShapeElement("rect", nextId)
    const withShape = addElementToPage(document, pageId, shape)

    const locked = toggleElementLocked(withShape, pageId, shape.id)
    const unlocked = toggleElementLocked(locked, pageId, shape.id)

    expect(findElement(locked, { pageId, elementId: shape.id })).toMatchObject({ locked: true })
    expect(findElement(unlocked, { pageId, elementId: shape.id })).toMatchObject({ locked: false })
    expect(unlocked.pages[0].elements.map((element) => element.id)).toEqual([shape.id])
  })
})
