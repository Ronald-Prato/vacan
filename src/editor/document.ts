export const CANVAS_SIZE = {
  width: 4096,
  height: 4096,
} as const

export const DEFAULT_SHAPE_SIZE = {
  width: 720,
  height: 560,
} as const

const DEFAULT_TEXT_SIZE = {
  width: 2200,
  height: 320,
} as const

export const FONT_OPTIONS = [
  "Geist Variable",
  "Inter",
  "Arial",
  "Georgia",
  "Times New Roman",
  "Courier New",
  "Verdana",
] as const

export const SHAPE_OPTIONS = [
  { type: "rect", label: "Cuadrado", fill: "#8b5cf6" },
  { type: "circle", label: "Circulo", fill: "#14b8a6" },
  { type: "triangle", label: "Triangulo", fill: "#f59e0b" },
] as const

export type FontFamily = (typeof FONT_OPTIONS)[number]
export type ShapeType = (typeof SHAPE_OPTIONS)[number]["type"]

export type Asset = {
  id: string
  name: string
  src: string
}

export type BaseElement = {
  id: string
  name: string
  x: number
  y: number
  width: number
  height: number
  rotation: number
  opacity: number
}

export type ImageElement = BaseElement & {
  type: "image"
  assetId: string
  src: string
}

export type TextElement = BaseElement & {
  type: "text"
  text: string
  fontFamily: FontFamily
  fontSize: number
  fill: string
}

export type ShapeElement = BaseElement & {
  type: "shape"
  shapeType: ShapeType
  fill: string
  stroke: string
}

export type CanvasElement = ImageElement | TextElement | ShapeElement

export type Page = {
  id: string
  name: string
  background: string
  elements: CanvasElement[]
}

export type EditorDocument = {
  name: string
  pages: Page[]
}

export type Selection = {
  pageId: string
  elementId: string
} | null

type IdFactory = () => string

const fallbackIdFactory: IdFactory = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID()
  }

  return `id-${Math.random().toString(36).slice(2)}`
}

export function createPage(pageNumber: number, createId: IdFactory = fallbackIdFactory): Page {
  return {
    id: createId(),
    name: `Pagina ${pageNumber}`,
    background: "#ffffff",
    elements: [],
  }
}

export function createInitialDocument(createId: IdFactory = fallbackIdFactory): EditorDocument {
  return {
    name: "Post de lanzamiento",
    pages: [createPage(1, createId)],
  }
}

export function createImageElement({
  asset,
  imageSize,
  createId = fallbackIdFactory,
}: {
  asset: Asset
  imageSize: { width: number; height: number }
  createId?: IdFactory
}): ImageElement {
  const maxWidth = CANVAS_SIZE.width * 0.68
  const maxHeight = CANVAS_SIZE.height * 0.68
  const scale = Math.min(maxWidth / imageSize.width, maxHeight / imageSize.height, 1)
  const width = Math.round(imageSize.width * scale)
  const height = Math.round(imageSize.height * scale)

  return {
    id: createId(),
    type: "image",
    assetId: asset.id,
    name: asset.name,
    src: asset.src,
    x: Math.round((CANVAS_SIZE.width - width) / 2),
    y: Math.round((CANVAS_SIZE.height - height) / 2),
    width,
    height,
    rotation: 0,
    opacity: 1,
  }
}

export function createTextElement(createId: IdFactory = fallbackIdFactory): TextElement {
  return {
    id: createId(),
    type: "text",
    name: "Texto",
    text: "Doble click para editar",
    x: Math.round((CANVAS_SIZE.width - DEFAULT_TEXT_SIZE.width) / 2),
    y: Math.round((CANVAS_SIZE.height - DEFAULT_TEXT_SIZE.height) / 2),
    width: DEFAULT_TEXT_SIZE.width,
    height: DEFAULT_TEXT_SIZE.height,
    rotation: 0,
    opacity: 1,
    fontFamily: "Geist Variable",
    fontSize: 184,
    fill: "#111827",
  }
}

export function createShapeElement(
  shapeType: ShapeType,
  createId: IdFactory = fallbackIdFactory,
  position: { x: number; y: number } = {
    x: Math.round((CANVAS_SIZE.width - DEFAULT_SHAPE_SIZE.width) / 2),
    y: Math.round((CANVAS_SIZE.height - DEFAULT_SHAPE_SIZE.height) / 2),
  },
): ShapeElement {
  const preset = SHAPE_OPTIONS.find((shape) => shape.type === shapeType) ?? SHAPE_OPTIONS[0]

  return {
    id: createId(),
    type: "shape",
    shapeType,
    name: preset.label,
    x: position.x,
    y: position.y,
    width: DEFAULT_SHAPE_SIZE.width,
    height: DEFAULT_SHAPE_SIZE.height,
    rotation: 0,
    opacity: 1,
    fill: preset.fill,
    stroke: "#0f172a",
  }
}

export function addPage(document: EditorDocument, createId: IdFactory = fallbackIdFactory): EditorDocument {
  return {
    ...document,
    pages: [...document.pages, createPage(document.pages.length + 1, createId)],
  }
}

export function insertPageAfter(
  document: EditorDocument,
  pageId: string,
  createId: IdFactory = fallbackIdFactory,
): { document: EditorDocument; pageId: string | null } {
  const sourceIndex = document.pages.findIndex((page) => page.id === pageId)

  if (sourceIndex < 0) {
    const nextDocument = addPage(document, createId)
    return {
      document: nextDocument,
      pageId: nextDocument.pages.at(-1)?.id ?? null,
    }
  }

  const nextPage = createPage(document.pages.length + 1, createId)
  const pages = [...document.pages]
  pages.splice(sourceIndex + 1, 0, nextPage)

  return {
    document: {
      ...document,
      pages: pages.map((page, index) => ({
        ...page,
        name: `Pagina ${index + 1}`,
      })),
    },
    pageId: nextPage.id,
  }
}

export function addElementToPage(
  document: EditorDocument,
  pageId: string,
  element: CanvasElement,
): EditorDocument {
  return updatePage(document, pageId, (page) => ({
    ...page,
    elements: [...page.elements, element],
  }))
}

export function updateElement(
  document: EditorDocument,
  pageId: string,
  elementId: string,
  changes: Partial<CanvasElement>,
): EditorDocument {
  return updatePage(document, pageId, (page) => ({
    ...page,
    elements: page.elements.map((element) =>
      element.id === elementId ? ({ ...element, ...changes } as CanvasElement) : element,
    ),
  }))
}

export function deleteElement(document: EditorDocument, pageId: string, elementId: string): EditorDocument {
  return updatePage(document, pageId, (page) => ({
    ...page,
    elements: page.elements.filter((element) => element.id !== elementId),
  }))
}

export function duplicateElement(
  document: EditorDocument,
  pageId: string,
  elementId: string,
  createId: IdFactory = fallbackIdFactory,
  offset = 28,
): { document: EditorDocument; duplicatedId: string | null } {
  let duplicatedId: string | null = null

  const nextDocument = updatePage(document, pageId, (page) => {
    const source = page.elements.find((element) => element.id === elementId)

    if (!source) {
      return page
    }

    duplicatedId = createId()
    const copy: CanvasElement = {
      ...source,
      id: duplicatedId,
      name: `${source.name} copia`,
      x: source.x + offset,
      y: source.y + offset,
    }

    const sourceIndex = page.elements.findIndex((element) => element.id === elementId)
    const elements = [...page.elements]
    elements.splice(sourceIndex + 1, 0, copy)

    return {
      ...page,
      elements,
    }
  })

  return { document: nextDocument, duplicatedId }
}

export function duplicateElementBehind(
  document: EditorDocument,
  pageId: string,
  elementId: string,
  createId: IdFactory = fallbackIdFactory,
): EditorDocument {
  return updatePage(document, pageId, (page) => {
    const sourceIndex = page.elements.findIndex((element) => element.id === elementId)

    if (sourceIndex < 0) {
      return page
    }

    const source = page.elements[sourceIndex]
    const copy: CanvasElement = {
      ...source,
      id: createId(),
      name: `${source.name} copia`,
    }

    const elements = [...page.elements]
    elements.splice(sourceIndex, 0, copy)

    return {
      ...page,
      elements,
    }
  })
}

export function findElement(document: EditorDocument, selection: Selection): CanvasElement | null {
  if (!selection) {
    return null
  }

  return (
    document.pages
      .find((page) => page.id === selection.pageId)
      ?.elements.find((element) => element.id === selection.elementId) ?? null
  )
}

export function pageElementCount(document: EditorDocument, pageId: string): number {
  return document.pages.find((page) => page.id === pageId)?.elements.length ?? 0
}

function updatePage(document: EditorDocument, pageId: string, updater: (page: Page) => Page): EditorDocument {
  return {
    ...document,
    pages: document.pages.map((page) => (page.id === pageId ? updater(page) : page)),
  }
}
