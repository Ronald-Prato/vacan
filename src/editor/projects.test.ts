import { describe, expect, it } from "vitest"

import { addElementToPage, createInitialDocument, createShapeElement } from "./document"
import {
  createDocumentFingerprint,
  createProjectSavePayload,
  isEditorDocument,
  summarizeProjectRecord,
} from "./projects"

function idSequence() {
  let index = 0

  return () => {
    index += 1
    return `id-${index}`
  }
}

describe("project persistence helpers", () => {
  it("normalizes save payloads without mutating the editor document", () => {
    const document = createInitialDocument(idSequence())
    const payload = createProjectSavePayload({ ...document, name: "  " })

    expect(payload.name).toBe("Diseno sin titulo")
    expect(payload.canvas).toBe(payload.canvas)
    expect(document.name).toBe("Post de lanzamiento")
  })

  it("summarizes saved project records for scalable project lists", () => {
    const nextId = idSequence()
    const document = createInitialDocument(nextId)
    const pageId = document.pages[0].id
    const shape = createShapeElement("rect", nextId)
    const withShape = addElementToPage(document, pageId, shape)

    const summary = summarizeProjectRecord({
      _id: "project-1",
      name: "Launch",
      canvas: withShape,
      updatedAt: 1710000000000,
    })

    expect(summary).toEqual({
      id: "project-1",
      name: "Launch",
      updatedAt: 1710000000000,
      pageCount: 1,
      elementCount: 1,
    })
  })

  it("rejects invalid loaded canvases before they replace the editor state", () => {
    expect(isEditorDocument(createInitialDocument(idSequence()))).toBe(true)
    expect(isEditorDocument({ name: "Broken", pages: [{ id: "p1" }] })).toBe(false)
    expect(isEditorDocument(null)).toBe(false)
  })

  it("creates stable fingerprints for autosave change detection", () => {
    const nextId = idSequence()
    const document = createInitialDocument(nextId)
    const sameDocument = { ...document, pages: [...document.pages] }
    const changedDocument = { ...document, name: "Nuevo nombre" }

    expect(createDocumentFingerprint(document)).toBe(createDocumentFingerprint(sameDocument))
    expect(createDocumentFingerprint(document)).not.toBe(createDocumentFingerprint(changedDocument))
  })
})
