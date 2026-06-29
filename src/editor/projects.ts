import type { EditorDocument, Page } from "./document"

const UNTITLED_PROJECT_NAME = "Diseno sin titulo"

export type SavedProject = {
  id: string
  name: string
  updatedAt: number
  pageCount: number
  elementCount: number
}

export type ProjectRecord = {
  _id: string
  name: string
  canvas?: unknown
  updatedAt: number
  pageCount?: number
  elementCount?: number
}
export type ProjectVersionDraft = {
  projectId: string
  label: string
  canvas: EditorDocument
  createdAt: number
  pageCount: number
  elementCount: number
}
export type ProjectVersionRecord = {
  _id: string
  projectId: string
  label: string
  canvas?: unknown
  createdAt: number
  pageCount?: number
  elementCount?: number
}
export type SavedProjectVersion = {
  id: string
  projectId: string
  label: string
  createdAt: number
  pageCount: number
  elementCount: number
}

export function createProjectSavePayload(document: EditorDocument): {
  name: string
  canvas: EditorDocument
} {
  return {
    name: normalizeProjectName(document.name),
    canvas: document,
  }
}

export function summarizeProjectRecord(record: ProjectRecord): SavedProject {
  const document = isEditorDocument(record.canvas) ? record.canvas : null

  return {
    id: record._id,
    name: normalizeProjectName(record.name),
    updatedAt: record.updatedAt,
    pageCount: record.pageCount ?? document?.pages.length ?? 0,
    elementCount: record.elementCount ?? document?.pages.reduce((count, page) => count + page.elements.length, 0) ?? 0,
  }
}

export function createProjectVersionDraft({
  projectId,
  document,
  label,
  createdAt = Date.now(),
}: {
  projectId: string
  document: EditorDocument
  label: string
  createdAt?: number
}): ProjectVersionDraft {
  const canvas = cloneEditorDocument(document)

  return {
    projectId,
    label: normalizeVersionLabel(label, createdAt),
    canvas,
    createdAt,
    pageCount: canvas.pages.length,
    elementCount: canvas.pages.reduce((count, page) => count + page.elements.length, 0),
  }
}

export function summarizeProjectVersionRecord(record: ProjectVersionRecord): SavedProjectVersion {
  const document = isEditorDocument(record.canvas) ? record.canvas : null

  return {
    id: record._id,
    projectId: record.projectId,
    label: normalizeVersionLabel(record.label, record.createdAt),
    createdAt: record.createdAt,
    pageCount: record.pageCount ?? document?.pages.length ?? 0,
    elementCount: record.elementCount ?? document?.pages.reduce((count, page) => count + page.elements.length, 0) ?? 0,
  }
}

export function createProjectVersionDocument(version: ProjectVersionRecord): EditorDocument {
  if (!isEditorDocument(version.canvas)) {
    throw new Error("Project version does not contain a valid canvas")
  }

  return cloneEditorDocument(version.canvas)
}

export function isEditorDocument(value: unknown): value is EditorDocument {
  if (!isPlainObject(value) || typeof value.name !== "string" || !Array.isArray(value.pages)) {
    return false
  }

  return value.pages.every(isEditorPage)
}

export function createDocumentFingerprint(document: EditorDocument): string {
  return JSON.stringify(document)
}

function normalizeProjectName(name: string): string {
  const trimmedName = name.trim()

  return trimmedName.length > 0 ? trimmedName : UNTITLED_PROJECT_NAME
}

function normalizeVersionLabel(label: string, createdAt: number): string {
  const trimmedLabel = label.trim()

  return trimmedLabel.length > 0 ? trimmedLabel : `Version ${new Date(createdAt).toLocaleDateString()}`
}

function cloneEditorDocument(document: EditorDocument): EditorDocument {
  return JSON.parse(JSON.stringify(document)) as EditorDocument
}

function isEditorPage(value: unknown): value is Page {
  return (
    isPlainObject(value) &&
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    typeof value.background === "string" &&
    Array.isArray(value.elements)
  )
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}
