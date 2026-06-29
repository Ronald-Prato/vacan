import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type DragEvent } from "react"
import { useConvex, useMutation, useQuery } from "convex/react"
import Konva from "konva"
import {
  AppWindow,
  BringToFront,
  ChartColumn,
  ChevronDown,
  Circle,
  Clock,
  CloudUpload,
  CopyPlus,
  Crown,
  Download,
  Folder,
  Grid2x2,
  Home,
  Image as ImageIcon,
  Layers3,
  LayoutTemplate,
  Lock,
  Maximize2,
  MessageCircle,
  MousePointer2,
  Palette,
  PenLine,
  Plus,
  Search,
  Shapes,
  SquarePlus,
  StickyNote,
  Square,
  Trash2,
  Triangle,
  Type,
  WandSparkles,
  type LucideIcon,
} from "lucide-react"
import {
  Circle as KonvaCircle,
  Group as KonvaGroup,
  Image as KonvaImage,
  Layer as KonvaLayer,
  Line,
  Rect,
  RegularPolygon,
  Stage,
  Text,
  Transformer,
} from "react-konva"

import {
  CANVAS_SIZE,
  DEFAULT_SHAPE_SIZE,
  FONT_OPTIONS,
  SHAPE_OPTIONS,
  addElementToPage,
  createImageElement,
  createInitialDocument,
  createShapeElement,
  createTextElement,
  deleteElement,
  duplicateElement,
  duplicateElementBehind,
  findElement,
  insertPageAfter,
  updateElement,
  type Asset,
  type CanvasElement,
  type EditorDocument,
  type Selection,
  type ShapeType,
} from "@/editor/document"
import {
  createDocumentFingerprint,
  createProjectSavePayload,
  isEditorDocument,
  summarizeProjectRecord,
  type ProjectRecord,
  type SavedProject,
} from "@/editor/projects"
import { snapElementPosition, type SnapGuide } from "@/editor/snapping"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Slider } from "@/components/ui/slider"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { api } from "../convex/_generated/api"
import type { Id } from "../convex/_generated/dataModel"

type StageMap = Record<string, Konva.Stage | null>
type SnapPreview = {
  pageId: string
  guides: SnapGuide[]
} | null
type AutosaveStatus = "local" | "saved" | "saving" | "loading" | "error"
type ProjectPersistence = {
  isEnabled: boolean
  isLoading: boolean
  projects: SavedProject[]
  saveProject: (projectId: string | null, document: EditorDocument) => Promise<string | null>
  loadProject: (projectId: string) => Promise<EditorDocument | null>
}

const colorSwatches = ["#111827", "#ffffff", "#ef4444", "#f59e0b", "#14b8a6", "#3b82f6", "#8b5cf6"]
const backgroundSwatches = ["#ffffff", "#f8fafc", "#fef3c7", "#d9f99d", "#ccfbf1", "#dbeafe", "#ede9fe", "#111827"]
const SHOW_INSPECTOR = false
const SHAPE_DRAG_MIME = "application/x-vacan-shape"
const MAX_CANVAS_PREVIEW_SIZE = 720
const SNAP_THRESHOLD_SCREEN_PX = 8
const AUTOSAVE_DELAY_MS = 900

const localProjectPersistence: ProjectPersistence = {
  isEnabled: false,
  isLoading: false,
  projects: [],
  saveProject: async () => null,
  loadProject: async () => null,
}

type ToolId =
  | "templates"
  | "elements"
  | "text"
  | "brand"
  | "uploads"
  | "tools"
  | "projects"
  | "apps"
  | "content"
  | "photos"
  | "background"

type SidebarTool = {
  id: ToolId
  label: string
  shortLabel?: string
  icon: LucideIcon
}

const sidebarTools: SidebarTool[] = [
  { id: "templates", label: "Plantillas", icon: LayoutTemplate },
  { id: "elements", label: "Elementos", icon: Shapes },
  { id: "text", label: "Texto", icon: Type },
  { id: "brand", label: "Marca", icon: Crown },
  { id: "uploads", label: "Archivos subidos", shortLabel: "Archivos su...", icon: CloudUpload },
  { id: "tools", label: "Herramientas", shortLabel: "Herramient...", icon: PenLine },
  { id: "projects", label: "Proyectos", icon: Folder },
  { id: "apps", label: "Apps", icon: AppWindow },
  { id: "content", label: "Contenido magico", shortLabel: "Contenido ...", icon: WandSparkles },
  { id: "photos", label: "Fotos", icon: ImageIcon },
  { id: "background", label: "Fondo", icon: Palette },
]

function createId() {
  return crypto.randomUUID()
}

function readableType(element: CanvasElement) {
  if (element.type === "image") {
    return "Imagen"
  }

  if (element.type === "text") {
    return "Texto"
  }

  return "Forma"
}

function fileNameWithoutExtension(fileName: string) {
  return fileName.replace(/\.[^/.]+$/, "") || "Imagen"
}

function isShapeType(value: string): value is ShapeType {
  return SHAPE_OPTIONS.some((shape) => shape.type === value)
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function useCanvasImage(src: string) {
  const [image, setImage] = useState<HTMLImageElement | null>(null)

  useEffect(() => {
    const nextImage = new window.Image()
    nextImage.onload = () => setImage(nextImage)
    nextImage.src = src

    return () => {
      nextImage.onload = null
    }
  }, [src])

  return image
}

function EditableImage({
  element,
}: {
  element: Extract<CanvasElement, { type: "image" }>
}) {
  const image = useCanvasImage(element.src)

  return (
    <KonvaImage
      image={image ?? undefined}
      width={element.width}
      height={element.height}
      opacity={element.opacity}
    />
  )
}

function EditableShape({
  element,
}: {
  element: Extract<CanvasElement, { type: "shape" }>
}) {
  if (element.shapeType === "circle") {
    return (
      <KonvaCircle
        x={element.width / 2}
        y={element.height / 2}
        radius={Math.min(element.width, element.height) / 2}
        fill={element.fill}
        stroke={element.stroke}
        strokeWidth={2}
        opacity={element.opacity}
      />
    )
  }

  if (element.shapeType === "triangle") {
    return (
      <RegularPolygon
        x={element.width / 2}
        y={element.height / 2}
        sides={3}
        radius={Math.min(element.width, element.height) / 2}
        fill={element.fill}
        stroke={element.stroke}
        strokeWidth={2}
        opacity={element.opacity}
      />
    )
  }

  return (
    <Rect
      width={element.width}
      height={element.height}
      cornerRadius={12}
      fill={element.fill}
      stroke={element.stroke}
      strokeWidth={2}
      opacity={element.opacity}
    />
  )
}

function EditableElement({
  element,
  isSelected,
  onSelect,
  onChange,
  onAltDragStart,
  onDragMove,
  onDragEnd,
  onTextDoubleClick,
}: {
  element: CanvasElement
  isSelected: boolean
  onSelect: () => void
  onChange: (changes: Partial<CanvasElement>) => void
  onAltDragStart: () => void
  onDragMove: (position: { x: number; y: number }) => { x: number; y: number }
  onDragEnd: () => void
  onTextDoubleClick: () => void
}) {
  const groupRef = useRef<Konva.Group>(null)
  const transformerRef = useRef<Konva.Transformer>(null)

  useEffect(() => {
    if (!isSelected || !groupRef.current || !transformerRef.current) {
      return
    }

    transformerRef.current.nodes([groupRef.current])
    transformerRef.current.getLayer()?.batchDraw()
  }, [isSelected, element])

  const handleTransformEnd = () => {
    const node = groupRef.current

    if (!node) {
      return
    }

    const scaleX = node.scaleX()
    const scaleY = node.scaleY()

    node.scaleX(1)
    node.scaleY(1)

    onChange({
      x: node.x(),
      y: node.y(),
      width: Math.max(28, element.width * scaleX),
      height: Math.max(28, element.height * scaleY),
      rotation: node.rotation(),
    })
  }

  return (
    <>
      <KonvaGroup
        ref={groupRef}
        x={element.x}
        y={element.y}
        width={element.width}
        height={element.height}
        rotation={element.rotation}
        draggable
        onClick={onSelect}
        onTap={onSelect}
        onDblClick={() => {
          if (element.type === "text") {
            onTextDoubleClick()
          }
        }}
        onDblTap={() => {
          if (element.type === "text") {
            onTextDoubleClick()
          }
        }}
        onDragStart={(event) => {
          if (event.evt.altKey) {
            onAltDragStart()
          }
        }}
        onDragMove={(event) => {
          const nextPosition = onDragMove({
            x: event.target.x(),
            y: event.target.y(),
          })

          event.target.position(nextPosition)
        }}
        onDragEnd={(event) => {
          onChange({
            x: event.target.x(),
            y: event.target.y(),
          })
          onDragEnd()
        }}
        onTransformEnd={handleTransformEnd}
      >
        {element.type === "image" ? <EditableImage element={element} /> : null}
        {element.type === "shape" ? <EditableShape element={element} /> : null}
        {element.type === "text" ? (
          <Text
            text={element.text}
            width={element.width}
            height={element.height}
            fill={element.fill}
            fontFamily={element.fontFamily}
            fontSize={element.fontSize}
            lineHeight={1.08}
            verticalAlign="middle"
            opacity={element.opacity}
          />
        ) : null}
      </KonvaGroup>
      {isSelected ? (
        <Transformer
          ref={transformerRef}
          rotateEnabled
          borderStroke="#00c4cc"
          anchorStroke="#00c4cc"
          anchorFill="#ffffff"
          anchorSize={10}
          boundBoxFunc={(oldBox, newBox) => {
            if (newBox.width < 28 || newBox.height < 28) {
              return oldBox
            }

            return newBox
          }}
        />
      ) : null}
    </>
  )
}

function PanelSearch({ placeholder }: { placeholder: string }) {
  return (
    <label className="flex h-12 items-center gap-3 rounded-md border border-[#6d28d9]/70 bg-[#12141b] px-3 text-slate-300 focus-within:ring-2 focus-within:ring-[#7c3aed]/60">
      <Search className="size-5 shrink-0" />
      <input
        className="min-w-0 flex-1 bg-transparent text-sm font-medium outline-none placeholder:text-slate-500"
        placeholder={placeholder}
      />
    </label>
  )
}

function TextPreset({ label, size, onClick }: { label: string; size: string; onClick: () => void }) {
  return (
    <button
      type="button"
      className="flex h-16 w-full items-center rounded-md border border-white/10 bg-[#20222b] px-4 text-left font-bold text-white transition hover:border-[#8b5cf6]"
      onClick={onClick}
    >
      <span className={size}>{label}</span>
    </button>
  )
}

function ToolAction({
  icon: Icon,
  label,
  disabled,
  onClick,
}: {
  icon: LucideIcon
  label: string
  disabled?: boolean
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      className="flex h-20 flex-col items-center justify-center gap-2 rounded-md border border-white/10 bg-[#20222b] text-xs font-semibold text-slate-200 transition hover:border-[#00c4cc] disabled:cursor-not-allowed disabled:opacity-40"
      disabled={disabled}
      onClick={onClick}
    >
      <Icon className="size-5" />
      {label}
    </button>
  )
}

function EditorApp({ persistence }: { persistence: ProjectPersistence }) {
  const [document, setDocument] = useState<EditorDocument>(() => createInitialDocument(createId))
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null)
  const [autosaveStatus, setAutosaveStatus] = useState<AutosaveStatus>(
    persistence.isEnabled ? "saved" : "local",
  )
  const [autosaveError, setAutosaveError] = useState("")
  const [assets, setAssets] = useState<Asset[]>([])
  const [activePageId, setActivePageId] = useState<string | null>(null)
  const [activeTool, setActiveTool] = useState<ToolId>("templates")
  const [animatingPageId, setAnimatingPageId] = useState<string | null>(null)
  const [selection, setSelection] = useState<Selection>(null)
  const [editingText, setEditingText] = useState("")
  const [snapPreview, setSnapPreview] = useState<SnapPreview>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const canvasViewportRef = useRef<HTMLDivElement>(null)
  const stageRefs = useRef<StageMap>({})
  const altDuplicatedDragRef = useRef<string | null>(null)
  const lastSavedFingerprintRef = useRef(createDocumentFingerprint(document))
  const [canvasPreviewSize, setCanvasPreviewSize] = useState(MAX_CANVAS_PREVIEW_SIZE)

  const resolvedActivePageId = selection?.pageId ?? activePageId ?? document.pages[0]?.id
  const activePage = document.pages.find((page) => page.id === resolvedActivePageId) ?? document.pages[0]
  const selectedElement = useMemo(() => findElement(document, selection), [document, selection])
  const totalElements = document.pages.reduce((count, page) => count + page.elements.length, 0)
  const canvasScale = canvasPreviewSize / CANVAS_SIZE.width

  useEffect(() => {
    if (!document.pages.some((page) => page.id === activePageId)) {
      setActivePageId(document.pages[0]?.id ?? null)
    }
  }, [activePageId, document.pages])

  useEffect(() => {
    if (selectedElement?.type === "text") {
      setEditingText(selectedElement.text)
    }
  }, [selectedElement])

  useEffect(() => {
    const viewport = canvasViewportRef.current

    if (!viewport) {
      return
    }

    const resizePreview = () => {
      const availableWidth = Math.max(1, viewport.clientWidth - 32)
      const availableHeight = Math.max(1, viewport.clientHeight - 64)

      setCanvasPreviewSize(Math.min(availableWidth, availableHeight, MAX_CANVAS_PREVIEW_SIZE))
    }

    resizePreview()

    const observer = new ResizeObserver(resizePreview)
    observer.observe(viewport)

    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!animatingPageId) {
      return
    }

    const timeoutId = window.setTimeout(() => setAnimatingPageId(null), 520)

    return () => window.clearTimeout(timeoutId)
  }, [animatingPageId])

  useEffect(() => {
    if (!persistence.isEnabled) {
      setAutosaveStatus("local")
      return
    }

    const fingerprint = createDocumentFingerprint(document)

    if (fingerprint === lastSavedFingerprintRef.current) {
      return
    }

    setAutosaveStatus("saving")
    setAutosaveError("")

    let isCancelled = false
    const timeoutId = window.setTimeout(() => {
      void (async () => {
        try {
          const savedProjectId = await persistence.saveProject(currentProjectId, document)

          if (isCancelled) {
            return
          }

          if (savedProjectId) {
            setCurrentProjectId(savedProjectId)
          }

          lastSavedFingerprintRef.current = createDocumentFingerprint(document)
          setAutosaveStatus("saved")
        } catch (error) {
          if (isCancelled) {
            return
          }

          setAutosaveError(error instanceof Error ? error.message : "No se pudo guardar el proyecto")
          setAutosaveStatus("error")
        }
      })()
    }, AUTOSAVE_DELAY_MS)

    return () => {
      isCancelled = true
      window.clearTimeout(timeoutId)
    }
  }, [currentProjectId, document, persistence])

  const saveCurrentProject = useCallback(async () => {
    if (!persistence.isEnabled) {
      return
    }

    setAutosaveStatus("saving")
    setAutosaveError("")

    try {
      const savedProjectId = await persistence.saveProject(currentProjectId, document)

      if (savedProjectId) {
        setCurrentProjectId(savedProjectId)
      }

      lastSavedFingerprintRef.current = createDocumentFingerprint(document)
      setAutosaveStatus("saved")
    } catch (error) {
      setAutosaveError(error instanceof Error ? error.message : "No se pudo guardar el proyecto")
      setAutosaveStatus("error")
    }
  }, [currentProjectId, document, persistence])

  const openProject = useCallback(
    async (projectId: string) => {
      if (!persistence.isEnabled) {
        return
      }

      setAutosaveStatus("loading")
      setAutosaveError("")

      try {
        const loadedDocument = await persistence.loadProject(projectId)

        if (!loadedDocument) {
          throw new Error("El proyecto no tiene un canvas valido")
        }

        setDocument(loadedDocument)
        setCurrentProjectId(projectId)
        setActivePageId(loadedDocument.pages[0]?.id ?? null)
        setSelection(null)
        lastSavedFingerprintRef.current = createDocumentFingerprint(loadedDocument)
        setAutosaveStatus("saved")
      } catch (error) {
        setAutosaveError(error instanceof Error ? error.message : "No se pudo abrir el proyecto")
        setAutosaveStatus("error")
      }
    },
    [persistence],
  )

  const startNewProject = useCallback(() => {
    const nextDocument = createInitialDocument(createId)

    setDocument(nextDocument)
    setCurrentProjectId(null)
    setActivePageId(nextDocument.pages[0]?.id ?? null)
    setSelection(null)
    lastSavedFingerprintRef.current = createDocumentFingerprint(nextDocument)
    setAutosaveError("")
    setAutosaveStatus(persistence.isEnabled ? "saved" : "local")
  }, [persistence.isEnabled])

  const setDocumentName = (name: string) => {
    setDocument((currentDocument) => ({ ...currentDocument, name }))
  }

  const addImageAssetToPage = (
    asset: Asset,
    imageSize: { width: number; height: number },
    pageId = resolvedActivePageId,
  ) => {
    if (!pageId) {
      return
    }

    const element = createImageElement({ asset, imageSize, createId })
    setDocument((currentDocument) => addElementToPage(currentDocument, pageId, element))
    setActivePageId(pageId)
    setSelection({ pageId, elementId: element.id })
  }

  const addAssetFromFile = (file: File) => {
    const reader = new FileReader()

    reader.onload = () => {
      const src = String(reader.result)
      const image = new window.Image()

      image.onload = () => {
        const asset: Asset = {
          id: createId(),
          name: fileNameWithoutExtension(file.name),
          src,
        }

        setAssets((currentAssets) => [asset, ...currentAssets])
        addImageAssetToPage(asset, { width: image.width, height: image.height })
      }

      image.src = src
    }

    reader.readAsDataURL(file)
  }

  const handleUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? [])

    files.forEach(addAssetFromFile)
    event.target.value = ""
  }

  const addText = () => {
    if (!resolvedActivePageId) {
      return
    }

    const element = createTextElement(createId)
    setDocument((currentDocument) => addElementToPage(currentDocument, resolvedActivePageId, element))
    setActivePageId(resolvedActivePageId)
    setSelection({ pageId: resolvedActivePageId, elementId: element.id })
  }

  const addShape = (
    shapeType: ShapeType,
    pageId = resolvedActivePageId,
    position = {
      x: Math.round((CANVAS_SIZE.width - DEFAULT_SHAPE_SIZE.width) / 2),
      y: Math.round((CANVAS_SIZE.height - DEFAULT_SHAPE_SIZE.height) / 2),
    },
  ) => {
    if (!pageId) {
      return
    }

    const element = createShapeElement(shapeType, createId, position)
    setDocument((currentDocument) => addElementToPage(currentDocument, pageId, element))
    setActivePageId(pageId)
    setSelection({ pageId, elementId: element.id })
  }

  const dropShapeOnPage = (event: DragEvent<HTMLDivElement>, pageId: string) => {
    const shapeType = event.dataTransfer.getData(SHAPE_DRAG_MIME)

    if (!isShapeType(shapeType)) {
      return
    }

    event.preventDefault()

    const stage = stageRefs.current[pageId]
    const canvasRect = stage?.container().getBoundingClientRect()

    if (!canvasRect) {
      return
    }

    const shapeWidth = DEFAULT_SHAPE_SIZE.width
    const shapeHeight = DEFAULT_SHAPE_SIZE.height
    const x = clamp(
      (event.clientX - canvasRect.left) / canvasScale - shapeWidth / 2,
      0,
      CANVAS_SIZE.width - shapeWidth,
    )
    const y = clamp(
      (event.clientY - canvasRect.top) / canvasScale - shapeHeight / 2,
      0,
      CANVAS_SIZE.height - shapeHeight,
    )

    addShape(shapeType, pageId, { x, y })
  }

  const addNewPageAfter = (pageId: string) => {
    let nextPageId: string | null = null

    setDocument((currentDocument) => {
      const result = insertPageAfter(currentDocument, pageId, createId)
      nextPageId = result.pageId
      return result.document
    })

    setActivePageId(nextPageId)
    setAnimatingPageId(nextPageId)
    setSelection(null)
  }

  const addNewPage = () => {
    const targetPageId = resolvedActivePageId ?? document.pages.at(-1)?.id

    if (targetPageId) {
      addNewPageAfter(targetPageId)
    }
  }

  const updatePageBackground = (pageId: string, background: string) => {
    setDocument((currentDocument) => ({
      ...currentDocument,
      pages: currentDocument.pages.map((page) => (page.id === pageId ? { ...page, background } : page)),
    }))
    setActivePageId(pageId)
  }

  const updateSelected = (changes: Partial<CanvasElement>) => {
    if (!selection?.elementId) {
      return
    }

    setDocument((currentDocument) =>
      updateElement(currentDocument, selection.pageId, selection.elementId, changes),
    )
  }

  const removeSelected = () => {
    if (!selection?.elementId) {
      return
    }

    setDocument((currentDocument) => deleteElement(currentDocument, selection.pageId, selection.elementId))
    setSelection(null)
  }

  const duplicateSelected = () => {
    if (!selection?.elementId) {
      return
    }

    setDocument((currentDocument) => {
      const result = duplicateElement(currentDocument, selection.pageId, selection.elementId, createId)

      if (result.duplicatedId) {
        setSelection({ pageId: selection.pageId, elementId: result.duplicatedId })
      }

      return result.document
    })
  }

  const duplicateBehindForAltDrag = (pageId: string, elementId: string) => {
    const dragKey = `${pageId}:${elementId}`

    if (altDuplicatedDragRef.current === dragKey) {
      return
    }

    altDuplicatedDragRef.current = dragKey
    setDocument((currentDocument) => duplicateElementBehind(currentDocument, pageId, elementId, createId))
  }

  const exportActivePage = () => {
    if (!resolvedActivePageId) {
      return
    }

    const dataUrl = stageRefs.current[resolvedActivePageId]?.toDataURL({
      pixelRatio: CANVAS_SIZE.width / canvasPreviewSize,
    })

    if (!dataUrl) {
      return
    }

    const link = globalThis.document.createElement("a")
    link.download = `${document.name.trim().toLowerCase().replace(/\s+/g, "-") || "vacan"}.png`
    link.href = dataUrl
    link.click()
  }

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      const isTyping =
        target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.isContentEditable

      if (isTyping) {
        return
      }

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "d") {
        event.preventDefault()
        duplicateSelected()
      }

      if (event.key === "Backspace" || event.key === "Delete") {
        event.preventDefault()
        removeSelected()
      }

      if (event.key.toLowerCase() === "t") {
        event.preventDefault()
        addText()
      }
    }

    window.addEventListener("keydown", handleKeyDown)

    return () => window.removeEventListener("keydown", handleKeyDown)
  })

  const autosaveLabel =
    autosaveStatus === "local"
      ? "Local"
      : autosaveStatus === "saving"
        ? "Guardando"
        : autosaveStatus === "loading"
          ? "Abriendo"
          : autosaveStatus === "error"
            ? "Sin guardar"
            : "Guardado"

  const renderToolPanel = () => {
    if (activeTool === "elements") {
      return (
        <>
          <PanelSearch placeholder="Busca elementos" />
          <div className="grid grid-cols-3 gap-2">
            {SHAPE_OPTIONS.map((shape) => {
              const Icon = shape.type === "circle" ? Circle : shape.type === "triangle" ? Triangle : Square

              return (
                <button
                  key={shape.type}
                  type="button"
                  draggable
                  className="flex h-20 flex-col items-center justify-center gap-2 rounded-md border border-white/10 bg-[#20222b] text-xs font-semibold text-slate-200 transition hover:border-[#00c4cc]"
                  onClick={() => addShape(shape.type)}
                  onDragStart={(event) => {
                    event.dataTransfer.effectAllowed = "copy"
                    event.dataTransfer.setData(SHAPE_DRAG_MIME, shape.type)
                  }}
                >
                  <Icon className="size-6" style={{ color: shape.fill }} />
                  {shape.label}
                </button>
              )
            })}
          </div>
        </>
      )
    }

    if (activeTool === "text") {
      return (
        <>
          <PanelSearch placeholder="Busca fuentes y combinaciones" />
          <Button className="h-12 w-full bg-[#7c3aed] text-base font-bold hover:bg-[#6d28d9]" onClick={addText}>
            <Type data-icon="inline-start" />
            Agregar caja de texto
          </Button>
          <Button className="h-11 w-full border-white/15 bg-transparent text-slate-100 hover:bg-white/10" variant="outline">
            <WandSparkles data-icon="inline-start" />
            Texto Magico
          </Button>
          <TextPreset label="Titulo" size="text-4xl" onClick={addText} />
          <TextPreset label="Subtitulo" size="text-2xl" onClick={addText} />
          <TextPreset label="Agregar algo de texto" size="text-base" onClick={addText} />
        </>
      )
    }

    if (activeTool === "uploads" || activeTool === "photos") {
      return (
        <>
          <PanelSearch placeholder={activeTool === "photos" ? "Busca fotos" : "Busca archivos"} />
          <button
            type="button"
            className="flex h-24 w-full flex-col items-center justify-center gap-2 rounded-md border border-dashed border-[#7c3aed] bg-[#201b2c] text-slate-100 transition hover:bg-[#2a2240]"
            onClick={() => fileInputRef.current?.click()}
          >
            <CloudUpload className="size-7" />
            <span className="text-sm font-bold">Subir imagenes</span>
          </button>
          <div className="grid max-h-[42vh] grid-cols-2 gap-2 overflow-auto pr-1">
            {assets.length === 0 ? (
              <div className="col-span-2 rounded-md border border-white/10 bg-[#20222b] p-4 text-sm text-slate-400">
                Las imagenes que subas apareceran aqui.
              </div>
            ) : null}
            {assets.map((asset) => (
              <button
                key={asset.id}
                type="button"
                className="group overflow-hidden rounded-md border border-white/10 bg-[#20222b] text-left transition hover:border-[#00c4cc]"
                onClick={() => {
                  const image = new window.Image()
                  image.onload = () =>
                    addImageAssetToPage(asset, { width: image.width, height: image.height })
                  image.src = asset.src
                }}
              >
                <img src={asset.src} alt="" className="aspect-square w-full object-cover" />
                <span className="block truncate px-2 py-1.5 text-xs text-slate-300">{asset.name}</span>
              </button>
            ))}
          </div>
        </>
      )
    }

    if (activeTool === "background") {
      return (
        <>
          <PanelSearch placeholder="Busca fondos" />
          <div className="grid grid-cols-4 gap-2">
            {backgroundSwatches.map((color) => (
              <button
                key={color}
                type="button"
                className="aspect-square rounded-md border border-white/15 shadow-sm transition hover:scale-[1.03]"
                style={{ backgroundColor: color }}
                aria-label={`Fondo ${color}`}
                onClick={() => activePage ? updatePageBackground(activePage.id, color) : null}
              />
            ))}
          </div>
        </>
      )
    }

    if (activeTool === "projects") {
      return (
        <>
          <PanelSearch placeholder="Busca proyectos" />
          <div className="grid grid-cols-2 gap-2">
            <Button
              className="border-white/15 bg-transparent text-slate-100 hover:bg-white/10"
              variant="outline"
              onClick={startNewProject}
            >
              <Plus data-icon="inline-start" />
              Nuevo
            </Button>
            <Button
              className="bg-[#7c3aed] text-white hover:bg-[#6d28d9]"
              onClick={saveCurrentProject}
              disabled={!persistence.isEnabled || autosaveStatus === "saving"}
            >
              <CloudUpload data-icon="inline-start" />
              Guardar
            </Button>
          </div>
          {!persistence.isEnabled ? (
            <div className="rounded-md border border-white/10 bg-[#20222b] p-4 text-sm leading-6 text-slate-400">
              Configura VITE_CONVEX_URL para guardar y abrir proyectos con Convex.
            </div>
          ) : null}
          {autosaveError ? (
            <div className="rounded-md border border-red-400/30 bg-red-950/30 p-3 text-sm text-red-100">
              {autosaveError}
            </div>
          ) : null}
          <div className="space-y-2">
            {persistence.isLoading ? (
              <div className="rounded-md border border-white/10 bg-[#20222b] p-4 text-sm text-slate-400">
                Cargando proyectos...
              </div>
            ) : null}
            {persistence.isEnabled && !persistence.isLoading && persistence.projects.length === 0 ? (
              <div className="rounded-md border border-white/10 bg-[#20222b] p-4 text-sm text-slate-400">
                Guarda tu primer diseno para verlo aqui.
              </div>
            ) : null}
            {persistence.projects.map((project) => (
              <button
                key={project.id}
                type="button"
                className={`flex w-full items-center justify-between gap-3 rounded-md border px-3 py-3 text-left text-sm text-slate-200 transition hover:border-[#00c4cc] ${
                  project.id === currentProjectId ? "border-[#00c4cc] bg-[#132b35]" : "border-white/10 bg-[#20222b]"
                }`}
                onClick={() => {
                  void openProject(project.id)
                }}
              >
                <span className="min-w-0">
                  <span className="block truncate font-semibold">{project.name}</span>
                  <span className="text-xs text-slate-400">
                    {project.pageCount} paginas - {project.elementCount} elementos
                  </span>
                </span>
                <span className="shrink-0 text-xs text-slate-500">
                  {new Date(project.updatedAt).toLocaleDateString()}
                </span>
              </button>
            ))}
          </div>
        </>
      )
    }

    if (activeTool === "tools") {
      return (
        <>
          <PanelSearch placeholder="Busca herramientas" />
          <div className="grid grid-cols-2 gap-2">
            <ToolAction icon={MousePointer2} label="Seleccionar" onClick={() => setSelection(null)} />
            <ToolAction icon={Layers3} label="Duplicar" onClick={duplicateSelected} disabled={!selectedElement} />
            <ToolAction icon={Trash2} label="Eliminar" onClick={removeSelected} disabled={!selectedElement} />
            <ToolAction icon={Download} label="Exportar" onClick={exportActivePage} disabled={totalElements === 0} />
          </div>
        </>
      )
    }

    return (
      <>
        <PanelSearch placeholder="Busca plantillas" />
        <div className="grid gap-3">
          {["Post promocional", "Historia dinamica", "Anuncio express"].map((template, index) => (
            <button
              key={template}
              type="button"
              className="overflow-hidden rounded-md border border-white/10 bg-[#20222b] text-left transition hover:border-[#8b5cf6]"
            >
              <span className={`block h-24 ${index === 0 ? "bg-gradient-to-br from-[#00c4cc] to-[#7c3aed]" : index === 1 ? "bg-gradient-to-br from-[#14b8a6] to-[#22c55e]" : "bg-gradient-to-br from-[#f59e0b] to-[#ec4899]"}`} />
              <span className="block px-3 py-2 text-sm font-semibold text-white">{template}</span>
            </button>
          ))}
        </div>
      </>
    )
  }

  return (
    <main className="min-h-screen bg-[#0d0e14] text-slate-100">
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 bg-gradient-to-r from-[#00c4cc] via-[#3b82f6] to-[#7c3aed] px-3 text-white shadow-[0_1px_0_rgba(255,255,255,0.16)]">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleUpload}
        />
        <div className="flex min-w-0 items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="icon-lg" variant="ghost" className="text-white hover:bg-white/15" aria-label="Inicio">
                <Home />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Inicio</TooltipContent>
          </Tooltip>
          <Button variant="ghost" className="hidden text-white hover:bg-white/15 sm:inline-flex">
            Archivo
          </Button>
          <Button
            variant="ghost"
            className="hidden text-white hover:bg-white/15 sm:inline-flex"
            onClick={saveCurrentProject}
            disabled={!persistence.isEnabled || autosaveStatus === "saving"}
          >
            Guardar
          </Button>
          <Button variant="ghost" className="hidden text-white hover:bg-white/15 sm:inline-flex">
            Redimensionar
          </Button>
          <Button variant="ghost" className="hidden text-white hover:bg-white/15 md:inline-flex">
            <PenLine data-icon="inline-start" />
            Editar
            <ChevronDown data-icon="inline-end" />
          </Button>
          <Badge className="hidden border-white/20 bg-white/16 text-white sm:inline-flex">{autosaveLabel}</Badge>
        </div>

        <div className="flex min-w-0 flex-1 justify-center">
          <Input
            value={document.name}
            onChange={(event) => setDocumentName(event.target.value)}
            className="h-9 max-w-[360px] border-transparent bg-white/10 text-center text-sm font-semibold text-white placeholder:text-white/60 focus-visible:border-white/40 focus-visible:ring-white/30"
            aria-label="Nombre del diseno"
          />
        </div>

        <div className="flex items-center gap-2">
          <Button className="hidden bg-white/12 text-white hover:bg-white/20 md:inline-flex" size="sm">
            <Crown data-icon="inline-start" />
            Sube de categoria
          </Button>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="icon-lg" variant="ghost" className="text-white hover:bg-white/15" aria-label="Metricas">
                <ChartColumn />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Metricas</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="icon-lg" variant="ghost" className="text-white hover:bg-white/15" aria-label="Comentarios">
                <MessageCircle />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Comentarios</TooltipContent>
          </Tooltip>
          <Button className="bg-white text-slate-950 shadow-sm hover:bg-slate-100" onClick={exportActivePage} disabled={totalElements === 0}>
            Compartir
          </Button>
        </div>
      </header>

      <div className="grid min-h-[calc(100vh-4rem)] grid-cols-[76px_minmax(0,1fr)] lg:grid-cols-[76px_320px_minmax(0,1fr)]">
        <aside className="relative z-20 border-r border-white/8 bg-[#0b0c11] py-3">
          <nav className="flex flex-col items-center gap-1">
            {sidebarTools.map((tool) => {
              const Icon = tool.icon
              const isActive = activeTool === tool.id

              return (
                <button
                  key={tool.id}
                  type="button"
                  className={`flex h-[72px] w-full flex-col items-center justify-center gap-1 px-1 text-[11px] font-bold transition ${
                    isActive
                      ? "bg-[#242536] text-white"
                      : "text-slate-400 hover:bg-[#171922] hover:text-white"
                  }`}
                  onMouseEnter={() => setActiveTool(tool.id)}
                  onClick={() => setActiveTool(tool.id)}
                >
                  <span className={`grid size-8 place-items-center rounded-md ${isActive ? "bg-[#7c3aed]/28 text-[#c084fc]" : ""}`}>
                    <Icon className="size-5" />
                  </span>
                  <span className="w-full truncate px-1 text-center">{tool.shortLabel ?? tool.label}</span>
                </button>
              )
            })}
          </nav>
        </aside>

        <aside className="hidden overflow-y-auto border-r border-white/8 bg-[#171922] p-4 shadow-[18px_0_40px_rgba(0,0,0,0.22)] lg:block">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-bold text-white">
              {sidebarTools.find((tool) => tool.id === activeTool)?.label}
            </h2>
            <Badge className="border-white/10 bg-white/8 text-slate-200">{assets.length} assets</Badge>
          </div>
          <div className="space-y-4">{renderToolPanel()}</div>
        </aside>

        <section className="flex min-w-0 flex-col bg-[#0d0e14]">
          <div className="flex h-12 items-center justify-between border-b border-white/8 bg-[#0f1017] px-4">
            <div className="flex items-center gap-3 text-xs font-semibold text-slate-400">
              <span>{CANVAS_SIZE.width} x {CANVAS_SIZE.height}px</span>
              <span>{document.pages.length} paginas</span>
              <span>{totalElements} elementos</span>
            </div>
            <div className="flex items-center gap-1 text-slate-300">
              <Button size="icon-sm" variant="ghost" className="text-slate-300 hover:bg-white/10" aria-label="Bloquear">
                <Lock />
              </Button>
              <Button size="icon-sm" variant="ghost" className="text-slate-300 hover:bg-white/10" aria-label="Duplicar" onClick={duplicateSelected} disabled={!selectedElement}>
                <CopyPlus />
              </Button>
              <Button size="icon-sm" variant="ghost" className="text-slate-300 hover:bg-white/10" aria-label="Agregar pagina" onClick={addNewPage}>
                <SquarePlus />
              </Button>
            </div>
          </div>

          <div ref={canvasViewportRef} className="flex flex-1 justify-center overflow-auto px-4 py-8">
            <div className="flex w-full max-w-[1120px] flex-col items-center gap-10">
              {document.pages.map((page, pageIndex) => (
                <section key={page.id} className={`w-full ${page.id === animatingPageId ? "vacan-page-enter" : ""}`}>
                  <div className="mx-auto mb-3 flex items-center justify-between text-slate-300" style={{ width: canvasPreviewSize }}>
                    <div className="flex items-center gap-2">
                      <Badge className={page.id === resolvedActivePageId ? "bg-white text-slate-950" : "bg-white/10 text-slate-300"}>
                        {pageIndex + 1}
                      </Badge>
                      <h2 className="text-sm font-bold">{page.name}</h2>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button size="icon-sm" variant="ghost" className="text-slate-300 hover:bg-white/10" aria-label="Bloquear pagina">
                        <Lock />
                      </Button>
                      <Button size="icon-sm" variant="ghost" className="text-slate-300 hover:bg-white/10" aria-label="Duplicar pagina" onClick={() => addNewPageAfter(page.id)}>
                        <CopyPlus />
                      </Button>
                      <Button size="icon-sm" variant="ghost" className="text-slate-300 hover:bg-white/10" aria-label="Agregar pagina" onClick={() => addNewPageAfter(page.id)}>
                        <SquarePlus />
                      </Button>
                    </div>
                  </div>

                  <div
                    className="mx-auto w-fit bg-white shadow-[0_20px_60px_rgba(0,0,0,0.36)] ring-1 ring-black/40"
                    onDragOver={(event) => {
                      if (event.dataTransfer.types.includes(SHAPE_DRAG_MIME)) {
                        event.preventDefault()
                        event.dataTransfer.dropEffect = "copy"
                      }
                    }}
                    onDrop={(event) => dropShapeOnPage(event, page.id)}
                  >
                    <Stage
                      ref={(stage) => {
                        stageRefs.current[page.id] = stage
                      }}
                      width={canvasPreviewSize}
                      height={canvasPreviewSize}
                      scaleX={canvasScale}
                      scaleY={canvasScale}
                      onMouseDown={(event) => {
                        if (event.target === event.target.getStage()) {
                          setActivePageId(page.id)
                          setSelection(null)
                        }
                      }}
                      onTouchStart={(event) => {
                        if (event.target === event.target.getStage()) {
                          setActivePageId(page.id)
                          setSelection(null)
                        }
                      }}
                    >
                      <KonvaLayer>
                        <Rect width={CANVAS_SIZE.width} height={CANVAS_SIZE.height} fill={page.background} />
                        {page.elements.length === 0 ? (
                          <Text
                            text="Sube una imagen, agrega texto o inserta una forma"
                            x={0}
                            y={CANVAS_SIZE.height / 2 - 42}
                            width={CANVAS_SIZE.width}
                            align="center"
                            fill="#64748b"
                            fontSize={84}
                          />
                        ) : null}
                        {page.elements.map((element) => (
                          <EditableElement
                            key={element.id}
                            element={element}
                            isSelected={selection?.pageId === page.id && selection.elementId === element.id}
                            onSelect={() => {
                              setActivePageId(page.id)
                              setSelection({ pageId: page.id, elementId: element.id })
                            }}
                            onChange={(changes) => {
                              setDocument((currentDocument) =>
                                updateElement(currentDocument, page.id, element.id, changes),
                              )
                            }}
                            onAltDragStart={() => duplicateBehindForAltDrag(page.id, element.id)}
                            onDragMove={(position) => {
                              const snappedPosition = snapElementPosition({
                                element,
                                position,
                                elements: page.elements,
                                threshold: SNAP_THRESHOLD_SCREEN_PX / canvasScale,
                              })

                              setSnapPreview(
                                snappedPosition.guides.length > 0
                                  ? { pageId: page.id, guides: snappedPosition.guides }
                                  : null,
                              )

                              return {
                                x: snappedPosition.x,
                                y: snappedPosition.y,
                              }
                            }}
                            onDragEnd={() => setSnapPreview(null)}
                            onTextDoubleClick={() => {
                              setActivePageId(page.id)
                              setSelection({ pageId: page.id, elementId: element.id })
                              setEditingText(element.type === "text" ? element.text : "")
                            }}
                          />
                        ))}
                        {snapPreview?.pageId === page.id
                          ? snapPreview.guides.map((guide) => (
                              <Line
                                key={`${guide.axis}:${guide.position}`}
                                points={
                                  guide.axis === "vertical"
                                    ? [guide.position, 0, guide.position, CANVAS_SIZE.height]
                                    : [0, guide.position, CANVAS_SIZE.width, guide.position]
                                }
                                stroke="#00c4cc"
                                strokeWidth={2}
                                strokeScaleEnabled={false}
                                dash={[18, 12]}
                                listening={false}
                              />
                            ))
                          : null}
                      </KonvaLayer>
                    </Stage>
                  </div>
                  <div className="mx-auto mt-5 flex h-12 overflow-hidden rounded-md border border-white/35 bg-transparent text-slate-200" style={{ width: canvasPreviewSize }}>
                    <button
                      type="button"
                      className="flex flex-1 items-center justify-center gap-2 text-sm font-bold transition hover:bg-white/10"
                      onClick={() => addNewPageAfter(page.id)}
                    >
                      <Plus className="size-4" />
                      Agregar una pagina
                    </button>
                    <button
                      type="button"
                      className="grid w-12 place-items-center border-l border-white/35 transition hover:bg-white/10"
                      onClick={() => addNewPageAfter(page.id)}
                      aria-label="Mas opciones de pagina"
                    >
                      <ChevronDown className="size-4" />
                    </button>
                  </div>
                </section>
              ))}
            </div>
          </div>
          <footer className="flex h-14 items-center justify-between border-t border-white/8 bg-[#0f1017] px-5 text-sm font-bold text-slate-400">
            <div className="flex items-center gap-5">
              <span className="flex items-center gap-2"><StickyNote className="size-4" />Notas</span>
              <span className="flex items-center gap-2"><Clock className="size-4" />Temporizador</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="hidden h-1 w-44 rounded-full bg-white/20 md:block">
                <div className="h-full w-[61%] rounded-full bg-white/70" />
              </div>
              <span>61%</span>
              <span className="flex items-center gap-2"><Grid2x2 className="size-4" />Paginas</span>
              <span>{resolvedActivePageId ? document.pages.findIndex((page) => page.id === resolvedActivePageId) + 1 : 1} de {document.pages.length}</span>
              <Maximize2 className="size-4" />
            </div>
          </footer>
        </section>

        {SHOW_INSPECTOR ? (
        <aside className="border-l border-slate-200 bg-white p-4">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold">Inspector</h2>
              <p className="text-xs text-slate-500">
                {selectedElement ? `${readableType(selectedElement)} seleccionado` : "Selecciona un elemento"}
              </p>
            </div>
            <div className="flex gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="icon-sm" variant="outline" aria-label="Duplicar" onClick={duplicateSelected}>
                    <Layers3 />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Duplicar</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="icon-sm" variant="outline" aria-label="Eliminar" onClick={removeSelected}>
                    <Trash2 />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Eliminar</TooltipContent>
              </Tooltip>
            </div>
          </div>

          {selectedElement ? (
            <div className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="element-name">Nombre</Label>
                <Input
                  id="element-name"
                  value={selectedElement.name}
                  onChange={(event) => updateSelected({ name: event.target.value })}
                />
              </div>

              {selectedElement.type === "text" ? (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="text-content">Texto</Label>
                    <Input
                      id="text-content"
                      value={editingText}
                      onChange={(event) => {
                        setEditingText(event.target.value)
                        updateSelected({ text: event.target.value })
                      }}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="font-family">Fuente</Label>
                    <select
                      id="font-family"
                      value={selectedElement.fontFamily}
                      onChange={(event) =>
                        updateSelected({ fontFamily: event.target.value as typeof selectedElement.fontFamily })
                      }
                      className="h-8 w-full rounded-lg border border-input bg-background px-2 text-sm"
                    >
                      {FONT_OPTIONS.map((fontFamily) => (
                        <option key={fontFamily} value={fontFamily}>
                          {fontFamily}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Tamano</Label>
                      <span className="text-xs text-slate-500">{selectedElement.fontSize}px</span>
                    </div>
                    <Slider
                      value={[selectedElement.fontSize]}
                      min={12}
                      max={120}
                      step={1}
                      onValueChange={([fontSize]) => updateSelected({ fontSize })}
                    />
                  </div>
                </>
              ) : null}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="element-x">X</Label>
                  <Input
                    id="element-x"
                    type="number"
                    value={Math.round(selectedElement.x)}
                    onChange={(event) => updateSelected({ x: Number(event.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="element-y">Y</Label>
                  <Input
                    id="element-y"
                    type="number"
                    value={Math.round(selectedElement.y)}
                    onChange={(event) => updateSelected({ y: Number(event.target.value) })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="element-width">Ancho</Label>
                  <Input
                    id="element-width"
                    type="number"
                    value={Math.round(selectedElement.width)}
                    onChange={(event) => updateSelected({ width: Number(event.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="element-height">Alto</Label>
                  <Input
                    id="element-height"
                    type="number"
                    value={Math.round(selectedElement.height)}
                    onChange={(event) => updateSelected({ height: Number(event.target.value) })}
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Rotacion</Label>
                  <span className="text-xs text-slate-500">{Math.round(selectedElement.rotation)} deg</span>
                </div>
                <Slider
                  value={[selectedElement.rotation]}
                  min={-180}
                  max={180}
                  step={1}
                  onValueChange={([rotation]) => updateSelected({ rotation })}
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Opacidad</Label>
                  <span className="text-xs text-slate-500">{Math.round(selectedElement.opacity * 100)}%</span>
                </div>
                <Slider
                  value={[selectedElement.opacity]}
                  min={0.1}
                  max={1}
                  step={0.05}
                  onValueChange={([opacity]) => updateSelected({ opacity })}
                />
              </div>

              {selectedElement.type === "shape" || selectedElement.type === "text" ? (
                <div className="space-y-3">
                  <Label>Color</Label>
                  <div className="grid grid-cols-7 gap-2">
                    {colorSwatches.map((color) => (
                      <button
                        key={color}
                        type="button"
                        className="size-7 rounded-full border border-slate-300 shadow-sm"
                        style={{ backgroundColor: color }}
                        aria-label={`Usar color ${color}`}
                        onClick={() => updateSelected({ fill: color })}
                      />
                    ))}
                  </div>
                </div>
              ) : null}

              <Separator />

              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" onClick={duplicateSelected}>
                  <BringToFront data-icon="inline-start" />
                  Duplicar
                </Button>
                <Button variant="destructive" onClick={removeSelected}>
                  <Trash2 data-icon="inline-start" />
                  Eliminar
                </Button>
              </div>
            </div>
          ) : (
            <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-4 text-sm leading-6 text-slate-500">
              Haz click en cualquier imagen, texto o forma para ver sus controladores y propiedades.
            </div>
          )}
        </aside>
        ) : null}
      </div>
    </main>
  )
}

function ConvexBackedApp() {
  const convex = useConvex()
  const projectRecords = useQuery(api.projects.list) as ProjectRecord[] | undefined
  const createProject = useMutation(api.projects.create)
  const updateProject = useMutation(api.projects.updateCanvas)

  const projects = useMemo(
    () => (projectRecords ?? []).map((project) => summarizeProjectRecord(project)),
    [projectRecords],
  )

  const saveProject = useCallback(
    async (projectId: string | null, document: EditorDocument) => {
      const payload = createProjectSavePayload(document)

      if (projectId) {
        await updateProject({
          id: projectId as Id<"projects">,
          ...payload,
        })

        return projectId
      }

      return (await createProject(payload)) as string
    },
    [createProject, updateProject],
  )

  const loadProject = useCallback(
    async (projectId: string) => {
      const project = (await convex.query(api.projects.get, {
        id: projectId as Id<"projects">,
      })) as ProjectRecord | null

      return project && isEditorDocument(project.canvas) ? project.canvas : null
    },
    [convex],
  )

  const persistence = useMemo<ProjectPersistence>(
    () => ({
      isEnabled: true,
      isLoading: projectRecords === undefined,
      projects,
      saveProject,
      loadProject,
    }),
    [loadProject, projectRecords, projects, saveProject],
  )

  return <EditorApp persistence={persistence} />
}

function App() {
  if (import.meta.env.VITE_CONVEX_URL) {
    return <ConvexBackedApp />
  }

  return <EditorApp persistence={localProjectPersistence} />
}

export default App
