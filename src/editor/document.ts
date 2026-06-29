export const CANVAS_SIZE = {
  width: 4096,
  height: 4096,
} as const

export type DocumentSize = {
  width: number
  height: number
}

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
export type TextAlign = "left" | "center" | "right"
export type TextFontWeight = "normal" | "bold"
export type TextFontStyle = "normal" | "italic"
export type TextDecoration = "none" | "underline"
export type ElementAlignment = "left" | "center" | "right" | "top" | "middle" | "bottom"
export type ElementDistributionAxis = "horizontal" | "vertical"

export type Asset = {
  id: string
  name: string
  src: string
}

export type ImageFilters = {
  brightness: number
  contrast: number
  saturation: number
  blur: number
}
export type ImageCrop = {
  x: number
  y: number
  width: number
  height: number
}
export type ImageMask = "none" | "rounded" | "circle"

export type BaseElement = {
  id: string
  name: string
  x: number
  y: number
  width: number
  height: number
  rotation: number
  opacity: number
  locked: boolean
}

export type ImageElement = BaseElement & {
  type: "image"
  assetId: string
  src: string
  filters: ImageFilters
  crop: ImageCrop
  mask: ImageMask
}
type ImageElementWithOptionalEditing = Omit<ImageElement, "filters" | "crop" | "mask"> & {
  filters?: Partial<ImageFilters>
  crop?: Partial<ImageCrop>
  mask?: ImageMask
}

export type TextElement = BaseElement & {
  type: "text"
  text: string
  fontFamily: FontFamily
  fontSize: number
  fill: string
  align: TextAlign
  fontWeight: TextFontWeight
  fontStyle: TextFontStyle
  textDecoration: TextDecoration
  lineHeight: number
  letterSpacing: number
}
type TextStyleFields = Pick<
  TextElement,
  "align" | "fontWeight" | "fontStyle" | "textDecoration" | "lineHeight" | "letterSpacing"
>
type TextElementWithOptionalStyle = Omit<TextElement, keyof TextStyleFields> & Partial<TextStyleFields>

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
  size: DocumentSize
  pages: Page[]
}

export type Selection = {
  pageId: string
  elementId: string
} | null

export type IdFactory = () => string

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
    size: CANVAS_SIZE,
    pages: [createPage(1, createId)],
  }
}

export function createImageElement({
  asset,
  imageSize,
  createId = fallbackIdFactory,
  canvasSize = CANVAS_SIZE,
}: {
  asset: Asset
  imageSize: { width: number; height: number }
  createId?: IdFactory
  canvasSize?: DocumentSize
}): ImageElement {
  const maxWidth = canvasSize.width * 0.68
  const maxHeight = canvasSize.height * 0.68
  const scale = Math.min(maxWidth / imageSize.width, maxHeight / imageSize.height, 1)
  const width = Math.round(imageSize.width * scale)
  const height = Math.round(imageSize.height * scale)

  return {
    id: createId(),
    type: "image",
    assetId: asset.id,
    name: asset.name,
    src: asset.src,
    x: Math.round((canvasSize.width - width) / 2),
    y: Math.round((canvasSize.height - height) / 2),
    width,
    height,
    rotation: 0,
    opacity: 1,
    locked: false,
    filters: createDefaultImageFilters(),
    crop: createDefaultImageCrop(),
    mask: "none",
  }
}

export function createTextElement(
  createId: IdFactory = fallbackIdFactory,
  canvasSize: DocumentSize = CANVAS_SIZE,
): TextElement {
  const width = Math.min(DEFAULT_TEXT_SIZE.width, canvasSize.width * 0.82)
  const height = Math.min(DEFAULT_TEXT_SIZE.height, canvasSize.height * 0.24)

  return {
    id: createId(),
    type: "text",
    name: "Texto",
    text: "Doble click para editar",
    x: Math.round((canvasSize.width - width) / 2),
    y: Math.round((canvasSize.height - height) / 2),
    width,
    height,
    rotation: 0,
    opacity: 1,
    locked: false,
    fontFamily: "Geist Variable",
    fontSize: 184,
    fill: "#111827",
    align: "center",
    fontWeight: "normal",
    fontStyle: "normal",
    textDecoration: "none",
    lineHeight: 1.08,
    letterSpacing: 0,
  }
}

export function createShapeElement(
  shapeType: ShapeType,
  createId: IdFactory = fallbackIdFactory,
  position?: { x: number; y: number },
  canvasSize: DocumentSize = CANVAS_SIZE,
): ShapeElement {
  const preset = SHAPE_OPTIONS.find((shape) => shape.type === shapeType) ?? SHAPE_OPTIONS[0]
  const width = Math.min(DEFAULT_SHAPE_SIZE.width, canvasSize.width * 0.44)
  const height = Math.min(DEFAULT_SHAPE_SIZE.height, canvasSize.height * 0.34)
  const resolvedPosition = position ?? {
    x: Math.round((canvasSize.width - width) / 2),
    y: Math.round((canvasSize.height - height) / 2),
  }

  return {
    id: createId(),
    type: "shape",
    shapeType,
    name: preset.label,
    x: resolvedPosition.x,
    y: resolvedPosition.y,
    width,
    height,
    rotation: 0,
    opacity: 1,
    locked: false,
    fill: preset.fill,
    stroke: "#0f172a",
  }
}

export function normalizeTextElement(element: TextElementWithOptionalStyle): TextElement {
  return {
    ...element,
    align: element.align ?? "center",
    fontWeight: element.fontWeight ?? "normal",
    fontStyle: element.fontStyle ?? "normal",
    textDecoration: element.textDecoration ?? "none",
    lineHeight: element.lineHeight ?? 1.08,
    letterSpacing: element.letterSpacing ?? 0,
  }
}

export function createDefaultImageFilters(): ImageFilters {
  return {
    brightness: 0,
    contrast: 0,
    saturation: 0,
    blur: 0,
  }
}

export function createDefaultImageCrop(): ImageCrop {
  return {
    x: 0,
    y: 0,
    width: 1,
    height: 1,
  }
}

export function normalizeImageElement(element: ImageElementWithOptionalEditing): ImageElement {
  return {
    ...element,
    filters: {
      ...createDefaultImageFilters(),
      ...element.filters,
    },
    crop: normalizeImageCrop(element.crop),
    mask: element.mask ?? "none",
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

export function moveElementForward(
  document: EditorDocument,
  pageId: string,
  elementId: string,
): EditorDocument {
  return moveElementByOffset(document, pageId, elementId, 1)
}

export function moveElementBackward(
  document: EditorDocument,
  pageId: string,
  elementId: string,
): EditorDocument {
  return moveElementByOffset(document, pageId, elementId, -1)
}

export function moveElementToFront(
  document: EditorDocument,
  pageId: string,
  elementId: string,
): EditorDocument {
  return moveElementToIndex(document, pageId, elementId, Number.POSITIVE_INFINITY)
}

export function moveElementToBack(
  document: EditorDocument,
  pageId: string,
  elementId: string,
): EditorDocument {
  return moveElementToIndex(document, pageId, elementId, 0)
}

export function toggleElementLocked(
  document: EditorDocument,
  pageId: string,
  elementId: string,
): EditorDocument {
  return updatePage(document, pageId, (page) => ({
    ...page,
    elements: page.elements.map((element) =>
      element.id === elementId ? { ...element, locked: !element.locked } : element,
    ),
  }))
}

export function alignElementToCanvas(
  document: EditorDocument,
  pageId: string,
  elementId: string,
  alignment: ElementAlignment,
): EditorDocument {
  return updatePage(document, pageId, (page) => ({
    ...page,
    elements: page.elements.map((element) => {
      if (element.id !== elementId) {
        return element
      }

      if (alignment === "left") {
        return { ...element, x: 0 }
      }

      if (alignment === "center") {
        return { ...element, x: (document.size.width - element.width) / 2 }
      }

      if (alignment === "right") {
        return { ...element, x: document.size.width - element.width }
      }

      if (alignment === "top") {
        return { ...element, y: 0 }
      }

      if (alignment === "middle") {
        return { ...element, y: (document.size.height - element.height) / 2 }
      }

      return { ...element, y: document.size.height - element.height }
    }),
  }))
}

export function distributePageElements(
  document: EditorDocument,
  pageId: string,
  axis: ElementDistributionAxis,
): EditorDocument {
  return updatePage(document, pageId, (page) => {
    if (page.elements.length < 3) {
      return page
    }

    const dimension = axis === "horizontal" ? "width" : "height"
    const position = axis === "horizontal" ? "x" : "y"
    const sortedElements = [...page.elements].sort(
      (first, second) => getElementCenter(first, position, dimension) - getElementCenter(second, position, dimension),
    )
    const firstCenter = getElementCenter(sortedElements[0], position, dimension)
    const lastCenter = getElementCenter(sortedElements[sortedElements.length - 1], position, dimension)

    if (firstCenter === lastCenter) {
      return page
    }

    const gap = (lastCenter - firstCenter) / (sortedElements.length - 1)
    const nextPositionById = new Map(
      sortedElements.map((element, index) => [
        element.id,
        firstCenter + gap * index - element[dimension] / 2,
      ]),
    )

    return {
      ...page,
      elements: page.elements.map((element) => ({
        ...element,
        [position]: nextPositionById.get(element.id) ?? element[position],
      })),
    }
  })
}

export function updateTextStyle(
  document: EditorDocument,
  pageId: string,
  elementId: string,
  changes: Partial<Pick<
    TextElement,
    "align" | "fontWeight" | "fontStyle" | "textDecoration" | "lineHeight" | "letterSpacing"
  >>,
): EditorDocument {
  let didUpdate = false
  const nextDocument = updatePage(document, pageId, (page) => ({
    ...page,
    elements: page.elements.map((element) => {
      if (element.id !== elementId || element.type !== "text") {
        return element
      }

      didUpdate = true
      const textElement = normalizeTextElement(element)

      return {
        ...textElement,
        ...changes,
        lineHeight: changes.lineHeight === undefined ? textElement.lineHeight : clamp(changes.lineHeight, 0.7, 2.5),
        letterSpacing:
          changes.letterSpacing === undefined ? textElement.letterSpacing : clamp(changes.letterSpacing, -50, 200),
      }
    }),
  }))

  return didUpdate ? nextDocument : document
}

export function updateImageFilters(
  document: EditorDocument,
  pageId: string,
  elementId: string,
  changes: Partial<ImageFilters>,
): EditorDocument {
  let didUpdate = false
  const nextDocument = updatePage(document, pageId, (page) => ({
    ...page,
    elements: page.elements.map((element) => {
      if (element.id !== elementId || element.type !== "image") {
        return element
      }

      didUpdate = true
      const imageElement = normalizeImageElement(element)

      return {
        ...imageElement,
        filters: {
          brightness:
            changes.brightness === undefined
              ? imageElement.filters.brightness
              : clamp(changes.brightness, -1, 1),
          contrast:
            changes.contrast === undefined ? imageElement.filters.contrast : clamp(changes.contrast, -1, 1),
          saturation:
            changes.saturation === undefined
              ? imageElement.filters.saturation
              : clamp(changes.saturation, -1, 1),
          blur: changes.blur === undefined ? imageElement.filters.blur : clamp(changes.blur, 0, 80),
        },
      }
    }),
  }))

  return didUpdate ? nextDocument : document
}

export function updateImageCrop(
  document: EditorDocument,
  pageId: string,
  elementId: string,
  changes: Partial<ImageCrop>,
): EditorDocument {
  let didUpdate = false
  const nextDocument = updatePage(document, pageId, (page) => ({
    ...page,
    elements: page.elements.map((element) => {
      if (element.id !== elementId || element.type !== "image") {
        return element
      }

      didUpdate = true
      const imageElement = normalizeImageElement(element)

      return {
        ...imageElement,
        crop: normalizeImageCrop({
          ...imageElement.crop,
          ...changes,
        }),
      }
    }),
  }))

  return didUpdate ? nextDocument : document
}

export function updateImageMask(
  document: EditorDocument,
  pageId: string,
  elementId: string,
  mask: ImageMask,
): EditorDocument {
  let didUpdate = false
  const nextDocument = updatePage(document, pageId, (page) => ({
    ...page,
    elements: page.elements.map((element) => {
      if (element.id !== elementId || element.type !== "image") {
        return element
      }

      didUpdate = true

      return {
        ...normalizeImageElement(element),
        mask,
      }
    }),
  }))

  return didUpdate ? nextDocument : document
}

function normalizeImageCrop(crop: Partial<ImageCrop> | undefined): ImageCrop {
  const defaults = createDefaultImageCrop()
  const width = clamp(crop?.width ?? defaults.width, 0.05, 1)
  const height = clamp(crop?.height ?? defaults.height, 0.05, 1)

  return {
    x: clamp(crop?.x ?? defaults.x, 0, 1 - width),
    y: clamp(crop?.y ?? defaults.y, 0, 1 - height),
    width,
    height,
  }
}

function getElementCenter(
  element: CanvasElement,
  position: "x" | "y",
  dimension: "width" | "height",
) {
  return element[position] + element[dimension] / 2
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function moveElementByOffset(
  document: EditorDocument,
  pageId: string,
  elementId: string,
  offset: -1 | 1,
): EditorDocument {
  return updatePage(document, pageId, (page) => {
    const sourceIndex = page.elements.findIndex((element) => element.id === elementId)

    if (sourceIndex < 0) {
      return page
    }

    return moveElementInPage(page, sourceIndex, sourceIndex + offset)
  })
}

function moveElementToIndex(
  document: EditorDocument,
  pageId: string,
  elementId: string,
  targetIndex: number,
): EditorDocument {
  return updatePage(document, pageId, (page) => {
    const sourceIndex = page.elements.findIndex((element) => element.id === elementId)

    if (sourceIndex < 0) {
      return page
    }

    return moveElementInPage(page, sourceIndex, targetIndex)
  })
}

function moveElementInPage(page: Page, sourceIndex: number, targetIndex: number): Page {
  const elements = [...page.elements]
  const [element] = elements.splice(sourceIndex, 1)
  const safeTargetIndex = Math.min(Math.max(targetIndex, 0), elements.length)

  elements.splice(safeTargetIndex, 0, element)

  return {
    ...page,
    elements,
  }
}

function updatePage(document: EditorDocument, pageId: string, updater: (page: Page) => Page): EditorDocument {
  return {
    ...document,
    pages: document.pages.map((page) => (page.id === pageId ? updater(page) : page)),
  }
}
