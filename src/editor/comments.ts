export type CommentDraft = {
  body: string
  authorName: string
  pageId: string | null
  elementId: string | null
}

export type CommentRecord = CommentDraft & {
  _id: string
  createdAt: number
}

export type EditorComment = CommentDraft & {
  id: string
  createdAt: number
}

export function createCommentDraft({
  body,
  authorName,
  pageId,
  elementId,
}: {
  body: string
  authorName: string
  pageId?: string | null
  elementId?: string | null
}): CommentDraft {
  return {
    body: body.trim(),
    authorName: authorName.trim() || "Colaborador",
    pageId: pageId ?? null,
    elementId: elementId ?? null,
  }
}

export function describeCommentTarget({
  pageName,
  elementName,
}: {
  pageName?: string
  elementName?: string
}): string {
  if (pageName && elementName) {
    return `${pageName} - ${elementName}`
  }

  return pageName ?? "Proyecto"
}

export function summarizeCommentRecord(record: CommentRecord): EditorComment {
  return {
    id: record._id,
    body: record.body,
    authorName: record.authorName,
    pageId: record.pageId,
    elementId: record.elementId,
    createdAt: record.createdAt,
  }
}
