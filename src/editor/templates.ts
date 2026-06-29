import {
  CANVAS_SIZE,
  createInitialDocument,
  type CanvasElement,
  type DocumentSize,
  type EditorDocument,
  type IdFactory,
  type Page,
} from "./document"

export type DesignFormatId = "square-post" | "story" | "presentation" | "poster"
export type DesignTemplateId = "launch-post" | "story-announcement" | "pitch-deck"

export type DesignFormat = {
  id: DesignFormatId
  name: string
  category: string
  size: DocumentSize
}

export type DesignTemplate = {
  id: DesignTemplateId
  name: string
  formatId: DesignFormatId
  description: string
  accent: string
}

export type SharedTemplateDraft = {
  name: string
  description: string
  authorName: string
  canvas: EditorDocument
  pageCount: number
  elementCount: number
  createdAt: number
}

export type SharedTemplateRecord = SharedTemplateDraft & {
  id: string
}
export type SharedTemplateSummary = Omit<SharedTemplateRecord, "canvas">

export const DESIGN_FORMATS: DesignFormat[] = [
  {
    id: "square-post",
    name: "Post cuadrado",
    category: "Redes",
    size: { width: 1080, height: 1080 },
  },
  {
    id: "story",
    name: "Historia vertical",
    category: "Redes",
    size: { width: 1080, height: 1920 },
  },
  {
    id: "presentation",
    name: "Presentacion 16:9",
    category: "Presentacion",
    size: { width: 1920, height: 1080 },
  },
  {
    id: "poster",
    name: "Poster",
    category: "Impresion",
    size: { width: 1800, height: 2400 },
  },
]

export const DESIGN_TEMPLATES: DesignTemplate[] = [
  {
    id: "launch-post",
    name: "Post promocional",
    formatId: "square-post",
    description: "Anuncio cuadrado para producto o campana.",
    accent: "from-[#00c4cc] to-[#7c3aed]",
  },
  {
    id: "story-announcement",
    name: "Historia dinamica",
    formatId: "story",
    description: "Historia vertical para anuncios rapidos.",
    accent: "from-[#14b8a6] to-[#22c55e]",
  },
  {
    id: "pitch-deck",
    name: "Pitch deck",
    formatId: "presentation",
    description: "Primera diapositiva para una presentacion.",
    accent: "from-[#f59e0b] to-[#ec4899]",
  },
]

export function getDesignFormat(formatId: DesignFormatId): DesignFormat {
  const format = DESIGN_FORMATS.find((candidate) => candidate.id === formatId)

  if (!format) {
    throw new Error(`Unknown design format: ${formatId}`)
  }

  return format
}

export function createBlankDocumentForFormat(
  formatId: DesignFormatId,
  createId: IdFactory,
): EditorDocument {
  const format = getDesignFormat(formatId)
  const document = createInitialDocument(createId)

  return {
    ...document,
    name: format.name,
    size: format.size,
  }
}

export function createDocumentFromTemplate(
  templateId: DesignTemplateId,
  createId: IdFactory,
): EditorDocument {
  const template = getDesignTemplate(templateId)
  const format = getDesignFormat(template.formatId)
  const page = createTemplatePage(template.id, format.size, createId)

  return {
    name: template.name,
    size: format.size,
    pages: [page],
  }
}

export function resizeDocumentToFormat(
  document: EditorDocument,
  formatId: DesignFormatId,
): EditorDocument {
  const nextSize = getDesignFormat(formatId).size
  const currentSize = document.size ?? CANVAS_SIZE
  const scaleX = nextSize.width / currentSize.width
  const scaleY = nextSize.height / currentSize.height

  return {
    ...document,
    size: nextSize,
    pages: document.pages.map((page) => ({
      ...page,
      elements: page.elements.map((element) => resizeElement(element, scaleX, scaleY)),
    })),
  }
}

export function createSharedTemplateDraft({
  document,
  name,
  description,
  authorName,
  createdAt = Date.now(),
}: {
  document: EditorDocument
  name: string
  description: string
  authorName: string
  createdAt?: number
}): SharedTemplateDraft {
  const canvas = cloneEditorDocument(document)

  return {
    name: name.trim() || document.name,
    description: description.trim(),
    authorName: authorName.trim() || "Equipo",
    canvas,
    pageCount: canvas.pages.length,
    elementCount: canvas.pages.reduce((count, page) => count + page.elements.length, 0),
    createdAt,
  }
}

export function createDocumentFromSharedTemplate(
  template: SharedTemplateRecord,
  createId: IdFactory,
): EditorDocument {
  return {
    ...cloneEditorDocument(template.canvas),
    name: template.name,
    pages: template.canvas.pages.map((page) => ({
      ...page,
      id: createId(),
      elements: page.elements.map((element) => ({
        ...element,
        id: createId(),
      }) as CanvasElement),
    })),
  }
}

function getDesignTemplate(templateId: DesignTemplateId): DesignTemplate {
  const template = DESIGN_TEMPLATES.find((candidate) => candidate.id === templateId)

  if (!template) {
    throw new Error(`Unknown design template: ${templateId}`)
  }

  return template
}

function createTemplatePage(
  templateId: DesignTemplateId,
  size: DocumentSize,
  createId: IdFactory,
): Page {
  if (templateId === "story-announcement") {
    return {
      id: createId(),
      name: "Pagina 1",
      background: "#042f2e",
      elements: [
        shape(createId, "circle", "Sello", size.width * 0.1, size.height * 0.1, size.width * 0.34, size.width * 0.34, "#14b8a6"),
        text(createId, "Titulo", "Oferta especial", size.width * 0.1, size.height * 0.35, size.width * 0.78, 220, 92, "#ffffff"),
        text(createId, "Detalle", "Disponible por tiempo limitado", size.width * 0.1, size.height * 0.5, size.width * 0.72, 160, 42, "#ccfbf1"),
      ],
    }
  }

  if (templateId === "pitch-deck") {
    return {
      id: createId(),
      name: "Pagina 1",
      background: "#fff7ed",
      elements: [
        shape(createId, "rect", "Bloque", size.width * 0.08, size.height * 0.16, size.width * 0.34, size.height * 0.58, "#f59e0b"),
        text(createId, "Titulo", "Nueva oportunidad", size.width * 0.48, size.height * 0.24, size.width * 0.42, 190, 72, "#111827"),
        text(createId, "Subtitulo", "Una propuesta clara para empezar rapido.", size.width * 0.48, size.height * 0.48, size.width * 0.38, 120, 34, "#475569"),
      ],
    }
  }

  return {
    id: createId(),
    name: "Pagina 1",
    background: "#101827",
    elements: [
      shape(createId, "rect", "Fondo acento", 96, 96, 888, 888, "#00c4cc"),
      shape(createId, "circle", "Decoracion", 680, 92, 280, 280, "#7c3aed"),
      text(createId, "Titulo", "Lanza algo nuevo", 150, 230, 760, 250, 86, "#ffffff"),
      text(createId, "Subtitulo", "Cambia este texto y publica en minutos.", 150, 520, 690, 150, 38, "#dbeafe"),
    ],
  }
}

function resizeElement(element: CanvasElement, scaleX: number, scaleY: number): CanvasElement {
  return {
    ...element,
    x: element.x * scaleX,
    y: element.y * scaleY,
    width: element.width * scaleX,
    height: element.height * scaleY,
  } as CanvasElement
}

function cloneEditorDocument(document: EditorDocument): EditorDocument {
  return JSON.parse(JSON.stringify(document)) as EditorDocument
}

function shape(
  createId: IdFactory,
  shapeType: "rect" | "circle" | "triangle",
  name: string,
  x: number,
  y: number,
  width: number,
  height: number,
  fill: string,
): CanvasElement {
  return {
    id: createId(),
    type: "shape",
    shapeType,
    name,
    x: Math.round(x),
    y: Math.round(y),
    width: Math.round(width),
    height: Math.round(height),
    rotation: 0,
    opacity: 1,
    locked: false,
    visible: true,
    fill,
    stroke: "transparent",
  }
}

function text(
  createId: IdFactory,
  name: string,
  value: string,
  x: number,
  y: number,
  width: number,
  height: number,
  fontSize: number,
  fill: string,
): CanvasElement {
  return {
    id: createId(),
    type: "text",
    name,
    text: value,
    x: Math.round(x),
    y: Math.round(y),
    width: Math.round(width),
    height: Math.round(height),
    rotation: 0,
    opacity: 1,
    locked: false,
    visible: true,
    fontFamily: "Geist Variable",
    fontSize,
    fill,
    align: "left",
    fontWeight: "normal",
    fontStyle: "normal",
    textDecoration: "none",
    lineHeight: 1.08,
    letterSpacing: 0,
  }
}
