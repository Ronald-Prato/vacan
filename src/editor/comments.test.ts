import { describe, expect, it } from "vitest"

import {
  createCommentDraft,
  describeCommentTarget,
  summarizeCommentRecord,
} from "./comments"

describe("editor comments", () => {
  it("normalizes draft author and body", () => {
    expect(
      createCommentDraft({
        body: "  Revisar el contraste  ",
        authorName: "  Ana  ",
        pageId: "page-1",
        elementId: "element-1",
      }),
    ).toEqual({
      body: "Revisar el contraste",
      authorName: "Ana",
      pageId: "page-1",
      elementId: "element-1",
    })
  })

  it("uses safe fallbacks for empty drafts", () => {
    expect(createCommentDraft({ body: "", authorName: "" })).toEqual({
      body: "",
      authorName: "Colaborador",
      pageId: null,
      elementId: null,
    })
  })

  it("describes comment targets for UI lists", () => {
    expect(describeCommentTarget({ pageName: "Pagina 2", elementName: "Logo" })).toBe("Pagina 2 - Logo")
    expect(describeCommentTarget({ pageName: "Pagina 1" })).toBe("Pagina 1")
    expect(describeCommentTarget({})).toBe("Proyecto")
  })

  it("summarizes comment records", () => {
    expect(
      summarizeCommentRecord({
        _id: "comment-1",
        body: "Listo",
        authorName: "Ron",
        pageId: "page-1",
        elementId: null,
        createdAt: 123,
      }),
    ).toEqual({
      id: "comment-1",
      body: "Listo",
      authorName: "Ron",
      pageId: "page-1",
      elementId: null,
      createdAt: 123,
    })
  })
})
