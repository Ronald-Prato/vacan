import { describe, expect, it } from "vitest"

import {
  CANVAS_SIZE,
  addElementToPage,
  addPage,
  alignElementToCanvas,
  createMultiSelection,
  createImageElement,
  createInitialDocument,
  createSelectionForElement,
  createShapeElement,
  createTextElement,
  deleteElements,
  deleteElement,
  distributePageElements,
  duplicateElements,
  duplicateElement,
  duplicateElementBehind,
  findElement,
  findSelectedElements,
  getSelectionElementIds,
  groupElements,
  moveElementsByDelta,
  moveElementBackward,
  moveElementForward,
  moveElementToBack,
  moveElementToFront,
  normalizeImageElement,
  normalizeTextElement,
  pageElementCount,
  selectionIncludesElement,
  toggleElementLocked,
  toggleElementVisibility,
  toggleElementSelection,
  ungroupElements,
  updateImageCrop,
  updateImageFilters,
  updateImageMask,
  updateTextStyle,
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
    expect(element.filters).toEqual({
      brightness: 0,
      contrast: 0,
      saturation: 0,
      blur: 0,
    })
    expect(element.crop).toEqual({
      x: 0,
      y: 0,
      width: 1,
      height: 1,
    })
    expect(element.mask).toBe("none")
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

  it("creates bounded multi-selection records with stable selected ids", () => {
    const empty = createMultiSelection("page-1", [])
    const single = createMultiSelection("page-1", ["shape-1", "shape-1"])
    const multiple = createMultiSelection("page-1", ["shape-1", "text-1", "shape-1"])

    expect(empty).toBeNull()
    expect(single).toEqual({ pageId: "page-1", elementId: "shape-1" })
    expect(multiple).toEqual({ pageId: "page-1", elementIds: ["shape-1", "text-1"] })
    expect(getSelectionElementIds(multiple)).toEqual(["shape-1", "text-1"])
    expect(selectionIncludesElement(multiple, "page-1", "text-1")).toBe(true)
    expect(selectionIncludesElement(multiple, "page-2", "text-1")).toBe(false)
  })

  it("finds all selected elements from a multi-selection", () => {
    const nextId = idSequence()
    const document = createInitialDocument(nextId)
    const pageId = document.pages[0].id
    const first = createShapeElement("rect", nextId)
    const second = createShapeElement("circle", nextId)
    const withElements = [first, second].reduce(
      (currentDocument, element) => addElementToPage(currentDocument, pageId, element),
      document,
    )

    expect(findSelectedElements(withElements, createMultiSelection(pageId, [first.id, second.id]))).toEqual([
      first,
      second,
    ])
  })

  it("deletes, duplicates, and moves multi-selected elements together", () => {
    const nextId = idSequence()
    const document = createInitialDocument(nextId)
    const pageId = document.pages[0].id
    const first = { ...createShapeElement("rect", nextId), x: 10, y: 20 }
    const second = { ...createShapeElement("circle", nextId), x: 40, y: 60 }
    const third = { ...createShapeElement("triangle", nextId), x: 80, y: 90 }
    const withElements = [first, second, third].reduce(
      (currentDocument, element) => addElementToPage(currentDocument, pageId, element),
      document,
    )

    const moved = moveElementsByDelta(withElements, pageId, [first.id, second.id], { x: 12, y: -8 })
    expect(findElement(moved, { pageId, elementId: first.id })).toMatchObject({ x: 22, y: 12 })
    expect(findElement(moved, { pageId, elementId: second.id })).toMatchObject({ x: 52, y: 52 })
    expect(findElement(moved, { pageId, elementId: third.id })).toMatchObject({ x: 80, y: 90 })

    const duplicated = duplicateElements(moved, pageId, [first.id, second.id], nextId)
    expect(duplicated.duplicatedIds).toEqual(["id-5", "id-6"])
    expect(duplicated.document.pages[0].elements.map((element) => element.id)).toEqual([
      first.id,
      "id-5",
      second.id,
      "id-6",
      third.id,
    ])

    const deleted = deleteElements(duplicated.document, pageId, [first.id, second.id])
    expect(deleted.pages[0].elements.map((element) => element.id)).toEqual(["id-5", "id-6", third.id])
  })

  it("groups selected elements and selects grouped layers together", () => {
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

    const grouped = groupElements(withElements, pageId, [first.id, second.id], nextId)

    expect(grouped.groupId).toBe("id-5")
    expect(findElement(grouped.document, { pageId, elementId: first.id })).toMatchObject({ groupId: "id-5" })
    expect(findElement(grouped.document, { pageId, elementId: second.id })).toMatchObject({ groupId: "id-5" })
    expect(createSelectionForElement(grouped.document, pageId, first.id)).toEqual({
      pageId,
      elementIds: [first.id, second.id],
    })
    expect(toggleElementSelection(grouped.document, null, pageId, first.id)).toEqual({
      pageId,
      elementIds: [first.id, second.id],
    })
  })

  it("duplicates grouped elements into a separate copied group", () => {
    const nextId = idSequence()
    const document = createInitialDocument(nextId)
    const pageId = document.pages[0].id
    const first = createShapeElement("rect", nextId)
    const second = createShapeElement("circle", nextId)
    const withElements = [first, second].reduce(
      (currentDocument, element) => addElementToPage(currentDocument, pageId, element),
      document,
    )
    const grouped = groupElements(withElements, pageId, [first.id, second.id], nextId)
    const duplicated = duplicateElements(grouped.document, pageId, [first.id, second.id], nextId)

    const firstCopy = findElement(duplicated.document, { pageId, elementId: "id-6" })
    const secondCopy = findElement(duplicated.document, { pageId, elementId: "id-7" })

    expect(duplicated.duplicatedIds).toEqual(["id-6", "id-7"])
    expect(firstCopy?.groupId).toBe("id-5")
    expect(secondCopy?.groupId).toBe("id-5")
    expect(firstCopy?.groupId).not.toBe(grouped.groupId)
  })

  it("ungroups every group touched by the current selection", () => {
    const nextId = idSequence()
    const document = createInitialDocument(nextId)
    const pageId = document.pages[0].id
    const first = createShapeElement("rect", nextId)
    const second = createShapeElement("circle", nextId)
    const withElements = [first, second].reduce(
      (currentDocument, element) => addElementToPage(currentDocument, pageId, element),
      document,
    )
    const grouped = groupElements(withElements, pageId, [first.id, second.id], nextId)
    const ungrouped = ungroupElements(grouped.document, pageId, [first.id])

    expect(findElement(ungrouped, { pageId, elementId: first.id })).toMatchObject({ groupId: undefined })
    expect(findElement(ungrouped, { pageId, elementId: second.id })).toMatchObject({ groupId: undefined })
    expect(createSelectionForElement(ungrouped, pageId, first.id)).toEqual({ pageId, elementId: first.id })
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

  it("creates visible layers by default and toggles layer visibility", () => {
    const nextId = idSequence()
    const document = createInitialDocument(nextId)
    const pageId = document.pages[0].id
    const shape = createShapeElement("rect", nextId)
    const withShape = addElementToPage(document, pageId, shape)

    const hidden = toggleElementVisibility(withShape, pageId, shape.id)
    const visible = toggleElementVisibility(hidden, pageId, shape.id)

    expect(shape.visible).toBe(true)
    expect(findElement(hidden, { pageId, elementId: shape.id })).toMatchObject({ visible: false })
    expect(findElement(visible, { pageId, elementId: shape.id })).toMatchObject({ visible: true })
  })

  it("treats older layers without visibility as visible before toggling", () => {
    const nextId = idSequence()
    const document = createInitialDocument(nextId)
    const pageId = document.pages[0].id
    const legacyShape = {
      ...createShapeElement("rect", nextId),
      visible: undefined,
    }
    const withShape = addElementToPage(document, pageId, legacyShape)

    const hidden = toggleElementVisibility(withShape, pageId, legacyShape.id)

    expect(findElement(hidden, { pageId, elementId: legacyShape.id })).toMatchObject({ visible: false })
  })

  it("aligns selected elements to the document canvas", () => {
    const nextId = idSequence()
    const document = createInitialDocument(nextId)
    const pageId = document.pages[0].id
    const shape = {
      ...createShapeElement("rect", nextId),
      x: 120,
      y: 240,
      width: 400,
      height: 300,
    }
    const withShape = addElementToPage(document, pageId, shape)

    const rightAligned = alignElementToCanvas(withShape, pageId, shape.id, "right")
    const middleAligned = alignElementToCanvas(rightAligned, pageId, shape.id, "middle")

    expect(findElement(rightAligned, { pageId, elementId: shape.id })).toMatchObject({
      x: CANVAS_SIZE.width - shape.width,
      y: 240,
    })
    expect(findElement(middleAligned, { pageId, elementId: shape.id })).toMatchObject({
      x: CANVAS_SIZE.width - shape.width,
      y: (CANVAS_SIZE.height - shape.height) / 2,
    })
  })

  it("distributes page elements by center while preserving layer order", () => {
    const nextId = idSequence()
    const document = createInitialDocument(nextId)
    const pageId = document.pages[0].id
    const first = { ...createShapeElement("rect", nextId), x: 0, y: 10, width: 100, height: 100 }
    const second = { ...createShapeElement("circle", nextId), x: 420, y: 50, width: 100, height: 100 }
    const third = { ...createShapeElement("triangle", nextId), x: 900, y: 30, width: 100, height: 100 }
    const withElements = [first, second, third].reduce(
      (currentDocument, element) => addElementToPage(currentDocument, pageId, element),
      document,
    )

    const distributed = distributePageElements(withElements, pageId, "horizontal")

    expect(distributed.pages[0].elements.map((element) => element.id)).toEqual([first.id, second.id, third.id])
    expect(distributed.pages[0].elements.map((element) => element.x)).toEqual([0, 450, 900])
  })

  it("keeps distribution unchanged when a page has fewer than three elements", () => {
    const nextId = idSequence()
    const document = createInitialDocument(nextId)
    const pageId = document.pages[0].id
    const first = createShapeElement("rect", nextId)
    const second = createShapeElement("circle", nextId)
    const withElements = [first, second].reduce(
      (currentDocument, element) => addElementToPage(currentDocument, pageId, element),
      document,
    )

    expect(distributePageElements(withElements, pageId, "vertical")).toEqual(withElements)
  })

  it("creates text with rich editing defaults", () => {
    const text = createTextElement(() => "text-1")

    expect(text).toMatchObject({
      align: "center",
      fontWeight: "normal",
      fontStyle: "normal",
      textDecoration: "none",
      lineHeight: 1.08,
      letterSpacing: 0,
    })
  })

  it("updates text styles with bounded numeric values", () => {
    const nextId = idSequence()
    const document = createInitialDocument(nextId)
    const pageId = document.pages[0].id
    const text = createTextElement(nextId)
    const withText = addElementToPage(document, pageId, text)

    const styled = updateTextStyle(withText, pageId, text.id, {
      align: "right",
      fontWeight: "bold",
      fontStyle: "italic",
      textDecoration: "underline",
      lineHeight: 4,
      letterSpacing: -200,
    })

    expect(findElement(styled, { pageId, elementId: text.id })).toMatchObject({
      align: "right",
      fontWeight: "bold",
      fontStyle: "italic",
      textDecoration: "underline",
      lineHeight: 2.5,
      letterSpacing: -50,
    })
  })

  it("normalizes older text elements that are missing rich style fields", () => {
    const legacyText = {
      ...createTextElement(() => "text-1"),
      align: undefined,
      lineHeight: undefined,
      letterSpacing: undefined,
    }

    expect(normalizeTextElement(legacyText)).toMatchObject({
      align: "center",
      fontWeight: "normal",
      fontStyle: "normal",
      textDecoration: "none",
      lineHeight: 1.08,
      letterSpacing: 0,
    })
  })

  it("ignores text style updates for non-text elements", () => {
    const nextId = idSequence()
    const document = createInitialDocument(nextId)
    const pageId = document.pages[0].id
    const shape = createShapeElement("rect", nextId)
    const withShape = addElementToPage(document, pageId, shape)

    const updated = updateTextStyle(withShape, pageId, shape.id, { fontWeight: "bold" })

    expect(updated).toEqual(withShape)
  })

  it("updates image filters with bounded values", () => {
    const nextId = idSequence()
    const document = createInitialDocument(nextId)
    const pageId = document.pages[0].id
    const image = createImageElement({
      asset,
      imageSize: { width: 1000, height: 600 },
      createId: nextId,
    })
    const withImage = addElementToPage(document, pageId, image)

    const filtered = updateImageFilters(withImage, pageId, image.id, {
      brightness: 2,
      contrast: -2,
      saturation: 1.5,
      blur: 200,
    })

    expect(findElement(filtered, { pageId, elementId: image.id })).toMatchObject({
      filters: {
        brightness: 1,
        contrast: -1,
        saturation: 1,
        blur: 80,
      },
    })
  })

  it("normalizes older image elements that are missing filter fields", () => {
    const legacyImage = {
      ...createImageElement({
        asset,
        imageSize: { width: 1000, height: 600 },
        createId: () => "image-1",
      }),
      filters: undefined,
      crop: undefined,
      mask: undefined,
    }

    expect(normalizeImageElement(legacyImage)).toMatchObject({
      filters: {
        brightness: 0,
        contrast: 0,
        saturation: 0,
        blur: 0,
      },
      crop: {
        x: 0,
        y: 0,
        width: 1,
        height: 1,
      },
      mask: "none",
    })
  })

  it("ignores image filter updates for non-image elements", () => {
    const nextId = idSequence()
    const document = createInitialDocument(nextId)
    const pageId = document.pages[0].id
    const shape = createShapeElement("rect", nextId)
    const withShape = addElementToPage(document, pageId, shape)

    const updated = updateImageFilters(withShape, pageId, shape.id, { brightness: 1 })

    expect(updated).toEqual(withShape)
  })

  it("updates image crop with bounded normalized values", () => {
    const nextId = idSequence()
    const document = createInitialDocument(nextId)
    const pageId = document.pages[0].id
    const image = createImageElement({
      asset,
      imageSize: { width: 1000, height: 600 },
      createId: nextId,
    })
    const withImage = addElementToPage(document, pageId, image)

    const cropped = updateImageCrop(withImage, pageId, image.id, {
      x: 0.9,
      y: -1,
      width: 0.4,
      height: 2,
    })

    expect(findElement(cropped, { pageId, elementId: image.id })).toMatchObject({
      crop: {
        x: 0.6,
        y: 0,
        width: 0.4,
        height: 1,
      },
    })
  })

  it("updates image masks without changing crop or filters", () => {
    const nextId = idSequence()
    const document = createInitialDocument(nextId)
    const pageId = document.pages[0].id
    const image = createImageElement({
      asset,
      imageSize: { width: 1000, height: 600 },
      createId: nextId,
    })
    const withImage = addElementToPage(document, pageId, image)
    const cropped = updateImageCrop(withImage, pageId, image.id, { x: 0.2, width: 0.7 })

    const masked = updateImageMask(cropped, pageId, image.id, "rounded")

    expect(findElement(masked, { pageId, elementId: image.id })).toMatchObject({
      mask: "rounded",
      crop: {
        x: 0.2,
        y: 0,
        width: 0.7,
        height: 1,
      },
      filters: {
        brightness: 0,
        contrast: 0,
        saturation: 0,
        blur: 0,
      },
    })
  })

  it("ignores crop and mask updates for non-image elements", () => {
    const nextId = idSequence()
    const document = createInitialDocument(nextId)
    const pageId = document.pages[0].id
    const shape = createShapeElement("rect", nextId)
    const withShape = addElementToPage(document, pageId, shape)

    expect(updateImageCrop(withShape, pageId, shape.id, { width: 0.5 })).toEqual(withShape)
    expect(updateImageMask(withShape, pageId, shape.id, "circle")).toEqual(withShape)
  })
})
