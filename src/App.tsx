import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type DragEvent } from "react"
import { useConvex, useMutation, useQuery } from "convex/react"
import Konva from "konva"
import {
  AppWindow,
  AlignCenter,
  AlignHorizontalJustifyCenter,
  AlignHorizontalJustifyEnd,
  AlignHorizontalJustifyStart,
  AlignHorizontalSpaceBetween,
  AlignLeft,
  AlignRight,
  AlignVerticalJustifyCenter,
  AlignVerticalJustifyEnd,
  AlignVerticalJustifyStart,
  AlignVerticalSpaceBetween,
  Bold,
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
  Italic,
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
  Redo2,
  Underline,
  Undo2,
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
  alignElementToCanvas,
  createDefaultImageCrop,
  createImageElement,
  createInitialDocument,
  createDefaultImageFilters,
  createShapeElement,
  createTextElement,
  deleteElement,
  distributePageElements,
  duplicateElement,
  duplicateElementBehind,
  findElement,
  insertPageAfter,
  moveElementBackward,
  moveElementForward,
  moveElementToBack,
  moveElementToFront,
  normalizeImageElement,
  normalizeTextElement,
  toggleElementLocked,
  updateImageCrop,
  updateImageFilters,
  updateImageMask,
  updateTextStyle,
  updateElement,
  type Asset,
  type CanvasElement,
  type ElementAlignment,
  type ElementDistributionAxis,
  type EditorDocument,
  type ImageMask,
  type Selection,
  type ShapeType,
} from "@/editor/document"
import {
  createLocalAsset,
  isSupportedImageAsset,
  normalizeAssetName,
  summarizeAssetRecord,
  type AssetRecord,
  type LibraryAsset,
} from "@/editor/assets"
import {
  createDocumentFingerprint,
  createProjectSavePayload,
  isEditorDocument,
  summarizeProjectRecord,
  type ProjectRecord,
  type SavedProject,
} from "@/editor/projects"
import {
  createHistoryState,
  pushHistory,
  redoHistory,
  replaceHistoryPresent,
  undoHistory,
} from "@/editor/history"
import {
  createCommentDraft,
  describeCommentTarget,
  summarizeCommentRecord,
  type CommentDraft,
  type CommentRecord,
  type EditorComment,
} from "@/editor/comments"
import { filterSearchItems } from "@/editor/search"
import { snapElementPosition, type SnapGuide } from "@/editor/snapping"
import {
  DESIGN_FORMATS,
  DESIGN_TEMPLATES,
  createBlankDocumentForFormat,
  createDocumentFromTemplate,
  resizeDocumentToFormat,
  type DesignFormatId,
  type DesignTemplateId,
} from "@/editor/templates"
import {
  EXPORT_FORMATS,
  buildExportFileName,
  createExportOptions,
  getExportMimeType,
  type ExportFormatId,
} from "@/editor/export"
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
type AssetPersistence = {
  isEnabled: boolean
  isLoading: boolean
  assets: LibraryAsset[]
  uploadAsset: (file: File) => Promise<LibraryAsset>
}
type CommentPersistence = {
  isEnabled: boolean
  listComments: (projectId: string) => Promise<EditorComment[]>
  createComment: (projectId: string, comment: CommentDraft) => Promise<void>
}
type DocumentUpdater = EditorDocument | ((currentDocument: EditorDocument) => EditorDocument)

const colorSwatches = ["#111827", "#ffffff", "#ef4444", "#f59e0b", "#14b8a6", "#3b82f6", "#8b5cf6"]
const backgroundSwatches = ["#ffffff", "#f8fafc", "#fef3c7", "#d9f99d", "#ccfbf1", "#dbeafe", "#ede9fe", "#111827"]
const SHOW_INSPECTOR = true
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

const localAssetPersistence: AssetPersistence = {
  isEnabled: false,
  isLoading: false,
  assets: [],
  uploadAsset: async (file) =>
    createLocalAsset({
      id: createId(),
      fileName: file.name,
      src: await fileToDataUrl(file),
      contentType: file.type || undefined,
      size: file.size,
    }),
}

const localCommentPersistence: CommentPersistence = {
  isEnabled: false,
  listComments: async () => [],
  createComment: async () => undefined,
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
  | "comments"

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
  { id: "comments", label: "Comentarios", shortLabel: "Comentar...", icon: MessageCircle },
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

function isShapeType(value: string): value is ShapeType {
  return SHAPE_OPTIONS.some((shape) => shape.type === value)
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error ?? new Error("No se pudo leer el archivo"))
    reader.readAsDataURL(file)
  })
}

function loadImageSize(src: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const image = new window.Image()

    image.onload = () => resolve({ width: image.width, height: image.height })
    image.onerror = () => reject(new Error("No se pudo cargar la imagen"))
    image.src = src
  })
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
  const imageRef = useRef<Konva.Image>(null)
  const image = useCanvasImage(element.src)
  const imageElement = normalizeImageElement(element)
  const { filters } = imageElement
  const { crop } = imageElement
  const hasBlur = filters.blur > 0
  const sourceWidth = image?.naturalWidth || image?.width || 1
  const sourceHeight = image?.naturalHeight || image?.height || 1
  const cropConfig = {
    x: Math.round(sourceWidth * crop.x),
    y: Math.round(sourceHeight * crop.y),
    width: Math.round(sourceWidth * crop.width),
    height: Math.round(sourceHeight * crop.height),
  }
  const konvaFilters = useMemo(
    () => [
      Konva.Filters.Brighten,
      Konva.Filters.Contrast,
      Konva.Filters.HSL,
      ...(hasBlur ? [Konva.Filters.Blur] : []),
    ],
    [hasBlur],
  )

  useEffect(() => {
    const node = imageRef.current

    if (!node || !image) {
      return
    }

    node.cache()
    node.getLayer()?.batchDraw()

    return () => {
      node.clearCache()
    }
  }, [image, filters.brightness, filters.contrast, filters.saturation, filters.blur])

  return (
    <KonvaGroup
      clipFunc={
        imageElement.mask === "none"
          ? undefined
          : (context) => {
              if (imageElement.mask === "circle") {
                const radius = Math.min(element.width, element.height) / 2
                context.arc(element.width / 2, element.height / 2, radius, 0, Math.PI * 2)
                return
              }

              const radius = Math.min(72, element.width / 5, element.height / 5)
              context.moveTo(radius, 0)
              context.lineTo(element.width - radius, 0)
              context.quadraticCurveTo(element.width, 0, element.width, radius)
              context.lineTo(element.width, element.height - radius)
              context.quadraticCurveTo(element.width, element.height, element.width - radius, element.height)
              context.lineTo(radius, element.height)
              context.quadraticCurveTo(0, element.height, 0, element.height - radius)
              context.lineTo(0, radius)
              context.quadraticCurveTo(0, 0, radius, 0)
              context.closePath()
            }
      }
    >
      <KonvaImage
        ref={imageRef}
        image={image ?? undefined}
        width={element.width}
        height={element.height}
        opacity={element.opacity}
        crop={cropConfig}
        filters={konvaFilters}
        brightness={filters.brightness}
        contrast={filters.contrast}
        saturation={filters.saturation}
        blurRadius={filters.blur}
      />
    </KonvaGroup>
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
  const textElement = element.type === "text" ? normalizeTextElement(element) : null

  useEffect(() => {
    if (!isSelected || !groupRef.current || !transformerRef.current) {
      return
    }

    transformerRef.current.nodes([groupRef.current])
    transformerRef.current.getLayer()?.batchDraw()
  }, [isSelected, element])

  const handleTransformEnd = () => {
    if (element.locked) {
      return
    }

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
        draggable={!element.locked}
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
        {textElement ? (
          <Text
            text={textElement.text}
            width={textElement.width}
            height={textElement.height}
            fill={textElement.fill}
            fontFamily={textElement.fontFamily}
            fontSize={textElement.fontSize}
            fontStyle={`${textElement.fontWeight}${textElement.fontStyle === "italic" ? " italic" : ""}`}
            textDecoration={textElement.textDecoration}
            align={textElement.align}
            lineHeight={textElement.lineHeight}
            letterSpacing={textElement.letterSpacing}
            verticalAlign="middle"
            opacity={textElement.opacity}
          />
        ) : null}
      </KonvaGroup>
      {isSelected && !element.locked ? (
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

function PanelSearch({
  placeholder,
  value,
  onChange,
}: {
  placeholder: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <label className="flex h-12 items-center gap-3 rounded-md border border-[#6d28d9]/70 bg-[#12141b] px-3 text-slate-300 focus-within:ring-2 focus-within:ring-[#7c3aed]/60">
      <Search className="size-5 shrink-0" />
      <input
        className="min-w-0 flex-1 bg-transparent text-sm font-medium outline-none placeholder:text-slate-500"
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
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

function EditorApp({
  persistence,
  assetPersistence,
  commentPersistence,
}: {
  persistence: ProjectPersistence
  assetPersistence: AssetPersistence
  commentPersistence: CommentPersistence
}) {
  const [documentHistory, setDocumentHistory] = useState(() =>
    createHistoryState<EditorDocument>(createInitialDocument(createId)),
  )
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null)
  const [autosaveStatus, setAutosaveStatus] = useState<AutosaveStatus>(
    persistence.isEnabled ? "saved" : "local",
  )
  const [autosaveError, setAutosaveError] = useState("")
  const [assetUploadError, setAssetUploadError] = useState("")
  const [comments, setComments] = useState<EditorComment[]>([])
  const [commentsLoading, setCommentsLoading] = useState(false)
  const [commentBody, setCommentBody] = useState("")
  const [commentAuthor, setCommentAuthor] = useState("Colaborador")
  const [commentError, setCommentError] = useState("")
  const [localAssets, setLocalAssets] = useState<LibraryAsset[]>([])
  const [activePageId, setActivePageId] = useState<string | null>(null)
  const [activeTool, setActiveTool] = useState<ToolId>("templates")
  const [panelSearchQuery, setPanelSearchQuery] = useState("")
  const [exportOptions, setExportOptions] = useState(() => createExportOptions())
  const [animatingPageId, setAnimatingPageId] = useState<string | null>(null)
  const [selection, setSelection] = useState<Selection>(null)
  const [editingText, setEditingText] = useState("")
  const [snapPreview, setSnapPreview] = useState<SnapPreview>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const canvasViewportRef = useRef<HTMLDivElement>(null)
  const stageRefs = useRef<StageMap>({})
  const altDuplicatedDragRef = useRef<string | null>(null)
  const document = documentHistory.present
  const lastSavedFingerprintRef = useRef(createDocumentFingerprint(document))
  const [canvasPreviewScale, setCanvasPreviewScale] = useState(MAX_CANVAS_PREVIEW_SIZE / CANVAS_SIZE.width)
  const canUndo = documentHistory.past.length > 0
  const canRedo = documentHistory.future.length > 0

  const refreshComments = useCallback(async () => {
    if (!commentPersistence.isEnabled || !currentProjectId) {
      setComments([])
      return
    }

    setCommentsLoading(true)
    setCommentError("")

    try {
      setComments(await commentPersistence.listComments(currentProjectId))
    } catch (error) {
      setCommentError(error instanceof Error ? error.message : "No se pudieron cargar los comentarios")
    } finally {
      setCommentsLoading(false)
    }
  }, [commentPersistence, currentProjectId])

  const setDocument = useCallback((updater: DocumentUpdater) => {
    setDocumentHistory((currentHistory) => {
      const nextDocument =
        typeof updater === "function" ? updater(currentHistory.present) : updater

      return pushHistory(currentHistory, nextDocument, {
        fingerprint: createDocumentFingerprint,
      })
    })
  }, [])

  const replaceDocumentHistory = useCallback((nextDocument: EditorDocument) => {
    setDocumentHistory((currentHistory) => replaceHistoryPresent(currentHistory, nextDocument))
  }, [])

  const undoDocument = useCallback(() => {
    setDocumentHistory((currentHistory) => undoHistory(currentHistory))
  }, [])

  const redoDocument = useCallback(() => {
    setDocumentHistory((currentHistory) => redoHistory(currentHistory))
  }, [])

  const resolvedActivePageId = selection?.pageId ?? activePageId ?? document.pages[0]?.id
  const activePage = document.pages.find((page) => page.id === resolvedActivePageId) ?? document.pages[0]
  const selectedElement = useMemo(() => findElement(document, selection), [document, selection])
  const selectedImageElement = selectedElement?.type === "image" ? normalizeImageElement(selectedElement) : null
  const selectedTextElement = selectedElement?.type === "text" ? normalizeTextElement(selectedElement) : null
  const totalElements = document.pages.reduce((count, page) => count + page.elements.length, 0)
  const assets = assetPersistence.isEnabled ? assetPersistence.assets : localAssets
  const documentSize = document.size ?? CANVAS_SIZE
  const canvasPreviewWidth = Math.round(documentSize.width * canvasPreviewScale)
  const canvasPreviewHeight = Math.round(documentSize.height * canvasPreviewScale)

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
    setPanelSearchQuery("")
  }, [activeTool])

  useEffect(() => {
    void refreshComments()
  }, [refreshComments])

  useEffect(() => {
    const viewport = canvasViewportRef.current

    if (!viewport) {
      return
    }

    const resizePreview = () => {
      const availableWidth = Math.max(1, viewport.clientWidth - 32)
      const availableHeight = Math.max(1, viewport.clientHeight - 64)
      const maxPreviewScale = MAX_CANVAS_PREVIEW_SIZE / Math.max(documentSize.width, documentSize.height)

      setCanvasPreviewScale(
        Math.min(
          availableWidth / documentSize.width,
          availableHeight / documentSize.height,
          maxPreviewScale,
        ),
      )
    }

    resizePreview()

    const observer = new ResizeObserver(resizePreview)
    observer.observe(viewport)

    return () => observer.disconnect()
  }, [documentSize.height, documentSize.width])

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

        replaceDocumentHistory(loadedDocument)
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
    [persistence, replaceDocumentHistory],
  )

  const startNewProject = useCallback(() => {
    const nextDocument = createInitialDocument(createId)

    replaceDocumentHistory(nextDocument)
    setCurrentProjectId(null)
    setActivePageId(nextDocument.pages[0]?.id ?? null)
    setSelection(null)
    lastSavedFingerprintRef.current = createDocumentFingerprint(nextDocument)
    setAutosaveError("")
    setAutosaveStatus(persistence.isEnabled ? "saved" : "local")
  }, [persistence.isEnabled, replaceDocumentHistory])

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

    const element = createImageElement({ asset, imageSize, createId, canvasSize: documentSize })
    setDocument((currentDocument) => addElementToPage(currentDocument, pageId, element))
    setActivePageId(pageId)
    setSelection({ pageId, elementId: element.id })
  }

  const addAssetFromFile = async (file: File) => {
    setAssetUploadError("")

    try {
      if (file.type && !isSupportedImageAsset(file.type)) {
        throw new Error("Solo se pueden subir imagenes compatibles.")
      }

      const asset = await assetPersistence.uploadAsset(file)
      const imageSize = await loadImageSize(asset.src)

      if (!assetPersistence.isEnabled) {
        setLocalAssets((currentAssets) => [asset, ...currentAssets])
      }

      addImageAssetToPage(asset, imageSize)
    } catch (error) {
      setAssetUploadError(error instanceof Error ? error.message : "No se pudo subir la imagen")
    }
  }

  const handleUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? [])

    files.forEach((file) => {
      void addAssetFromFile(file)
    })
    event.target.value = ""
  }

  const addText = () => {
    if (!resolvedActivePageId) {
      return
    }

    const element = createTextElement(createId, documentSize)
    setDocument((currentDocument) => addElementToPage(currentDocument, resolvedActivePageId, element))
    setActivePageId(resolvedActivePageId)
    setSelection({ pageId: resolvedActivePageId, elementId: element.id })
  }

  const addShape = (
    shapeType: ShapeType,
    pageId = resolvedActivePageId,
    position = {
      x: Math.round((documentSize.width - DEFAULT_SHAPE_SIZE.width) / 2),
      y: Math.round((documentSize.height - DEFAULT_SHAPE_SIZE.height) / 2),
    },
  ) => {
    if (!pageId) {
      return
    }

    const element = createShapeElement(shapeType, createId, position, documentSize)
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
      (event.clientX - canvasRect.left) / canvasPreviewScale - shapeWidth / 2,
      0,
      documentSize.width - shapeWidth,
    )
    const y = clamp(
      (event.clientY - canvasRect.top) / canvasPreviewScale - shapeHeight / 2,
      0,
      documentSize.height - shapeHeight,
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

  const updateSelectedTextStyle = (changes: Parameters<typeof updateTextStyle>[3]) => {
    if (!selection?.elementId) {
      return
    }

    setDocument((currentDocument) =>
      updateTextStyle(currentDocument, selection.pageId, selection.elementId, changes),
    )
  }

  const updateSelectedImageFilters = (changes: Parameters<typeof updateImageFilters>[3]) => {
    if (!selection?.elementId) {
      return
    }

    setDocument((currentDocument) =>
      updateImageFilters(currentDocument, selection.pageId, selection.elementId, changes),
    )
  }

  const updateSelectedImageCrop = (changes: Parameters<typeof updateImageCrop>[3]) => {
    if (!selection?.elementId) {
      return
    }

    setDocument((currentDocument) =>
      updateImageCrop(currentDocument, selection.pageId, selection.elementId, changes),
    )
  }

  const updateSelectedImageMask = (mask: ImageMask) => {
    if (!selection?.elementId) {
      return
    }

    setDocument((currentDocument) => updateImageMask(currentDocument, selection.pageId, selection.elementId, mask))
  }

  const submitComment = async () => {
    if (!commentPersistence.isEnabled || !currentProjectId) {
      setCommentError("Guarda el proyecto antes de comentar.")
      return
    }

    const draft = createCommentDraft({
      body: commentBody,
      authorName: commentAuthor,
      pageId: resolvedActivePageId ?? null,
      elementId: selection?.elementId ?? null,
    })

    if (!draft.body) {
      setCommentError("Escribe un comentario antes de enviarlo.")
      return
    }

    setCommentError("")

    try {
      await commentPersistence.createComment(currentProjectId, draft)
      setCommentBody("")
      await refreshComments()
    } catch (error) {
      setCommentError(error instanceof Error ? error.message : "No se pudo crear el comentario")
    }
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

  const moveSelectedForward = () => {
    if (!selection?.elementId) {
      return
    }

    setDocument((currentDocument) =>
      moveElementForward(currentDocument, selection.pageId, selection.elementId),
    )
  }

  const moveSelectedBackward = () => {
    if (!selection?.elementId) {
      return
    }

    setDocument((currentDocument) =>
      moveElementBackward(currentDocument, selection.pageId, selection.elementId),
    )
  }

  const moveSelectedToFront = () => {
    if (!selection?.elementId) {
      return
    }

    setDocument((currentDocument) =>
      moveElementToFront(currentDocument, selection.pageId, selection.elementId),
    )
  }

  const moveSelectedToBack = () => {
    if (!selection?.elementId) {
      return
    }

    setDocument((currentDocument) =>
      moveElementToBack(currentDocument, selection.pageId, selection.elementId),
    )
  }

  const toggleSelectedLocked = () => {
    if (!selection?.elementId) {
      return
    }

    setDocument((currentDocument) =>
      toggleElementLocked(currentDocument, selection.pageId, selection.elementId),
    )
  }

  const alignSelectedToCanvas = (alignment: ElementAlignment) => {
    if (!selection?.elementId) {
      return
    }

    setDocument((currentDocument) =>
      alignElementToCanvas(currentDocument, selection.pageId, selection.elementId, alignment),
    )
  }

  const distributeActivePageElements = (axis: ElementDistributionAxis) => {
    if (!resolvedActivePageId) {
      return
    }

    setDocument((currentDocument) => distributePageElements(currentDocument, resolvedActivePageId, axis))
  }

  const duplicateBehindForAltDrag = (pageId: string, elementId: string) => {
    const dragKey = `${pageId}:${elementId}`

    if (altDuplicatedDragRef.current === dragKey) {
      return
    }

    altDuplicatedDragRef.current = dragKey
    setDocument((currentDocument) => duplicateElementBehind(currentDocument, pageId, elementId, createId))
  }

  const exportActivePage = async () => {
    if (!resolvedActivePageId) {
      return
    }

    const dataUrl = stageRefs.current[resolvedActivePageId]?.toDataURL({
      pixelRatio: 1 / canvasPreviewScale,
      mimeType: getExportMimeType(exportOptions.format),
      quality: exportOptions.quality,
    })

    if (!dataUrl) {
      return
    }

    if (exportOptions.format === "pdf") {
      const { jsPDF } = await import("jspdf")
      const pdf = new jsPDF({
        orientation: documentSize.width >= documentSize.height ? "landscape" : "portrait",
        unit: "px",
        format: [documentSize.width, documentSize.height],
        compress: true,
      })

      pdf.addImage(dataUrl, "PNG", 0, 0, documentSize.width, documentSize.height)
      pdf.save(buildExportFileName(document.name, "pdf"))
      return
    }

    const link = globalThis.document.createElement("a")
    link.download = buildExportFileName(document.name, exportOptions.format)
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

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z") {
        event.preventDefault()

        if (event.shiftKey) {
          redoDocument()
        } else {
          undoDocument()
        }

        return
      }

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "y") {
        event.preventDefault()
        redoDocument()
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

  const applyTemplate = (templateId: DesignTemplateId) => {
    const nextDocument = createDocumentFromTemplate(templateId, createId)

    replaceDocumentHistory(nextDocument)
    setCurrentProjectId(null)
    setActivePageId(nextDocument.pages[0]?.id ?? null)
    setSelection(null)
    setAutosaveError("")
  }

  const createBlankFormat = (formatId: DesignFormatId) => {
    const nextDocument = createBlankDocumentForFormat(formatId, createId)

    replaceDocumentHistory(nextDocument)
    setCurrentProjectId(null)
    setActivePageId(nextDocument.pages[0]?.id ?? null)
    setSelection(null)
    lastSavedFingerprintRef.current = createDocumentFingerprint(nextDocument)
    setAutosaveError("")
    setAutosaveStatus(persistence.isEnabled ? "saved" : "local")
  }

  const resizeCurrentDocument = (formatId: DesignFormatId) => {
    setDocument((currentDocument) => resizeDocumentToFormat(currentDocument, formatId))
  }

  const renderPanelSearch = (placeholder: string) => (
    <PanelSearch
      placeholder={placeholder}
      value={panelSearchQuery}
      onChange={setPanelSearchQuery}
    />
  )

  const renderToolPanel = () => {
    const filteredShapes = filterSearchItems(SHAPE_OPTIONS, panelSearchQuery, ["label", "type"])
    const textPresets = [
      { label: "Titulo", size: "text-4xl" },
      { label: "Subtitulo", size: "text-2xl" },
      { label: "Agregar algo de texto", size: "text-base" },
    ]
    const filteredTextPresets = filterSearchItems(textPresets, panelSearchQuery, ["label"])
    const filteredAssets = filterSearchItems(assets, panelSearchQuery, ["name"])
    const filteredBackgroundSwatches = filterSearchItems(
      backgroundSwatches.map((color) => ({ color })),
      panelSearchQuery,
      ["color"],
    ).map((swatch) => swatch.color)
    const filteredProjects = filterSearchItems(persistence.projects, panelSearchQuery, [
      "name",
      (project) => `${project.pageCount} paginas ${project.elementCount} elementos`,
    ])
    const filteredDesignFormats = filterSearchItems(DESIGN_FORMATS, panelSearchQuery, [
      "name",
      "category",
      (format) => `${format.size.width} ${format.size.height}`,
    ])
    const filteredDesignTemplates = filterSearchItems(DESIGN_TEMPLATES, panelSearchQuery, [
      "name",
      "description",
      "formatId",
    ])
    const toolActions = [
      { icon: MousePointer2, label: "Seleccionar", onClick: () => setSelection(null), disabled: false },
      { icon: Undo2, label: "Deshacer", onClick: undoDocument, disabled: !canUndo },
      { icon: Redo2, label: "Rehacer", onClick: redoDocument, disabled: !canRedo },
      { icon: Layers3, label: "Duplicar", onClick: duplicateSelected, disabled: !selectedElement },
      { icon: BringToFront, label: "Al frente", onClick: moveSelectedToFront, disabled: !selectedElement },
      { icon: Layers3, label: "Adelante", onClick: moveSelectedForward, disabled: !selectedElement },
      { icon: Layers3, label: "Atras", onClick: moveSelectedBackward, disabled: !selectedElement },
      { icon: Layers3, label: "Al fondo", onClick: moveSelectedToBack, disabled: !selectedElement },
      {
        icon: AlignHorizontalSpaceBetween,
        label: "Distribuir horizontal",
        onClick: () => distributeActivePageElements("horizontal"),
        disabled: (activePage?.elements.length ?? 0) < 3,
      },
      {
        icon: AlignVerticalSpaceBetween,
        label: "Distribuir vertical",
        onClick: () => distributeActivePageElements("vertical"),
        disabled: (activePage?.elements.length ?? 0) < 3,
      },
      {
        icon: Lock,
        label: selectedElement?.locked ? "Desbloquear" : "Bloquear",
        onClick: toggleSelectedLocked,
        disabled: !selectedElement,
      },
      { icon: Trash2, label: "Eliminar", onClick: removeSelected, disabled: !selectedElement },
      { icon: Download, label: "Exportar", onClick: exportActivePage, disabled: totalElements === 0 },
    ]
    const filteredToolActions = filterSearchItems(toolActions, panelSearchQuery, ["label"])

    if (activeTool === "elements") {
      return (
        <>
          {renderPanelSearch("Busca elementos")}
          <div className="grid grid-cols-3 gap-2">
            {filteredShapes.map((shape) => {
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
          {renderPanelSearch("Busca fuentes y combinaciones")}
          <Button className="h-12 w-full bg-[#7c3aed] text-base font-bold hover:bg-[#6d28d9]" onClick={addText}>
            <Type data-icon="inline-start" />
            Agregar caja de texto
          </Button>
          <Button className="h-11 w-full border-white/15 bg-transparent text-slate-100 hover:bg-white/10" variant="outline">
            <WandSparkles data-icon="inline-start" />
            Texto Magico
          </Button>
          {filteredTextPresets.map((preset) => (
            <TextPreset key={preset.label} label={preset.label} size={preset.size} onClick={addText} />
          ))}
        </>
      )
    }

    if (activeTool === "uploads" || activeTool === "photos") {
      return (
        <>
          {renderPanelSearch(activeTool === "photos" ? "Busca fotos" : "Busca archivos")}
          <button
            type="button"
            className="flex h-24 w-full flex-col items-center justify-center gap-2 rounded-md border border-dashed border-[#7c3aed] bg-[#201b2c] text-slate-100 transition hover:bg-[#2a2240]"
            onClick={() => fileInputRef.current?.click()}
          >
            <CloudUpload className="size-7" />
            <span className="text-sm font-bold">
              {assetPersistence.isEnabled ? "Subir a biblioteca" : "Subir imagenes"}
            </span>
          </button>
          {assetUploadError ? (
            <div className="rounded-md border border-red-400/30 bg-red-950/30 p-3 text-sm text-red-100">
              {assetUploadError}
            </div>
          ) : null}
          <div className="grid max-h-[42vh] grid-cols-2 gap-2 overflow-auto pr-1">
            {assetPersistence.isLoading ? (
              <div className="col-span-2 rounded-md border border-white/10 bg-[#20222b] p-4 text-sm text-slate-400">
                Cargando biblioteca...
              </div>
            ) : null}
            {assets.length === 0 ? (
              <div className="col-span-2 rounded-md border border-white/10 bg-[#20222b] p-4 text-sm text-slate-400">
                {assetPersistence.isEnabled
                  ? "Las imagenes guardadas en Convex apareceran aqui."
                  : "Las imagenes que subas apareceran aqui."}
              </div>
            ) : null}
            {assets.length > 0 && filteredAssets.length === 0 ? (
              <div className="col-span-2 rounded-md border border-white/10 bg-[#20222b] p-4 text-sm text-slate-400">
                No hay archivos para esa busqueda.
              </div>
            ) : null}
            {filteredAssets.map((asset) => (
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
          {renderPanelSearch("Busca fondos")}
          <div className="grid grid-cols-4 gap-2">
            {filteredBackgroundSwatches.map((color) => (
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
          {renderPanelSearch("Busca proyectos")}
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
            {persistence.projects.length > 0 && filteredProjects.length === 0 ? (
              <div className="rounded-md border border-white/10 bg-[#20222b] p-4 text-sm text-slate-400">
                No hay proyectos para esa busqueda.
              </div>
            ) : null}
            {filteredProjects.map((project) => (
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

    if (activeTool === "comments") {
      const filteredComments = filterSearchItems(comments, panelSearchQuery, ["body", "authorName"])

      return (
        <>
          {renderPanelSearch("Busca comentarios")}
          {!commentPersistence.isEnabled ? (
            <div className="rounded-md border border-white/10 bg-[#20222b] p-4 text-sm leading-6 text-slate-400">
              Configura VITE_CONVEX_URL para comentar con otros colaboradores.
            </div>
          ) : null}
          {commentPersistence.isEnabled && !currentProjectId ? (
            <div className="rounded-md border border-white/10 bg-[#20222b] p-4 text-sm leading-6 text-slate-400">
              Guarda el proyecto antes de crear comentarios.
            </div>
          ) : null}
          <div className="space-y-3 rounded-md border border-white/10 bg-[#20222b] p-3">
            <Input
              value={commentAuthor}
              onChange={(event) => setCommentAuthor(event.target.value)}
              placeholder="Tu nombre"
              className="bg-[#12141b] text-slate-100"
            />
            <textarea
              value={commentBody}
              onChange={(event) => setCommentBody(event.target.value)}
              placeholder="Agrega un comentario"
              className="min-h-24 w-full resize-none rounded-lg border border-white/10 bg-[#12141b] px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus-visible:border-[#7c3aed]"
            />
            <Button
              className="w-full bg-[#7c3aed] text-white hover:bg-[#6d28d9]"
              onClick={() => {
                void submitComment()
              }}
              disabled={!commentPersistence.isEnabled || !currentProjectId}
            >
              <MessageCircle data-icon="inline-start" />
              Comentar
            </Button>
          </div>
          {commentError ? (
            <div className="rounded-md border border-red-400/30 bg-red-950/30 p-3 text-sm text-red-100">
              {commentError}
            </div>
          ) : null}
          <div className="space-y-2">
            {commentsLoading ? (
              <div className="rounded-md border border-white/10 bg-[#20222b] p-4 text-sm text-slate-400">
                Cargando comentarios...
              </div>
            ) : null}
            {!commentsLoading && comments.length === 0 ? (
              <div className="rounded-md border border-white/10 bg-[#20222b] p-4 text-sm text-slate-400">
                Todavia no hay comentarios.
              </div>
            ) : null}
            {comments.length > 0 && filteredComments.length === 0 ? (
              <div className="rounded-md border border-white/10 bg-[#20222b] p-4 text-sm text-slate-400">
                No hay comentarios para esa busqueda.
              </div>
            ) : null}
            {filteredComments.map((comment) => {
              const page = document.pages.find((candidate) => candidate.id === comment.pageId)
              const element = comment.elementId
                ? page?.elements.find((candidate) => candidate.id === comment.elementId)
                : null

              return (
                <article key={comment.id} className="rounded-md border border-white/10 bg-[#20222b] p-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-semibold text-white">{comment.authorName}</span>
                    <span className="shrink-0 text-xs text-slate-500">
                      {new Date(comment.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-sm leading-6 text-slate-300">{comment.body}</p>
                  <p className="mt-2 text-xs text-slate-500">
                    {describeCommentTarget({ pageName: page?.name, elementName: element?.name })}
                  </p>
                </article>
              )
            })}
          </div>
        </>
      )
    }

    if (activeTool === "tools") {
      return (
        <>
          {renderPanelSearch("Busca herramientas")}
          <div className="space-y-3 rounded-md border border-white/10 bg-[#20222b] p-3">
            <div className="space-y-2">
              <Label htmlFor="export-format" className="text-slate-300">Formato</Label>
              <select
                id="export-format"
                value={exportOptions.format}
                onChange={(event) =>
                  setExportOptions((currentOptions) =>
                    createExportOptions({
                      ...currentOptions,
                      format: event.target.value as ExportFormatId,
                    }),
                  )
                }
                className="h-8 w-full rounded-lg border border-white/10 bg-[#12141b] px-2 text-sm text-slate-100"
              >
                {EXPORT_FORMATS.map((format) => (
                  <option key={format.id} value={format.id}>
                    {format.label}
                  </option>
                ))}
              </select>
            </div>
            {exportOptions.format === "jpg" ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-slate-300">Calidad</Label>
                  <span className="text-xs text-slate-400">{Math.round(exportOptions.quality * 100)}%</span>
                </div>
                <Slider
                  value={[exportOptions.quality]}
                  min={0.1}
                  max={1}
                  step={0.05}
                  onValueChange={([quality]) =>
                    setExportOptions((currentOptions) => createExportOptions({ ...currentOptions, quality }))
                  }
                />
              </div>
            ) : null}
          </div>
          <div className="grid grid-cols-2 gap-2">
            {filteredToolActions.map((action) => (
              <ToolAction
                key={action.label}
                icon={action.icon}
                label={action.label}
                onClick={action.onClick}
                disabled={action.disabled}
              />
            ))}
          </div>
        </>
      )
    }

    return (
      <>
        {renderPanelSearch("Busca plantillas")}
        <section className="space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Tamanos</h3>
          <div className="grid grid-cols-2 gap-2">
            {filteredDesignFormats.map((format) => (
              <button
                key={format.id}
                type="button"
                className="rounded-md border border-white/10 bg-[#20222b] px-3 py-3 text-left transition hover:border-[#00c4cc]"
                onClick={() => createBlankFormat(format.id)}
              >
                <span className="block text-sm font-semibold text-white">{format.name}</span>
                <span className="text-xs text-slate-400">
                  {format.size.width} x {format.size.height}
                </span>
              </button>
            ))}
          </div>
        </section>
        <section className="space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Redimensionar</h3>
          <div className="grid grid-cols-2 gap-2">
            {filteredDesignFormats.map((format) => (
              <button
                key={format.id}
                type="button"
                className="rounded-md border border-white/10 bg-[#171922] px-3 py-2 text-left text-xs font-semibold text-slate-300 transition hover:border-[#8b5cf6]"
                onClick={() => resizeCurrentDocument(format.id)}
              >
                {format.name}
              </button>
            ))}
          </div>
        </section>
        <section className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Plantillas</h3>
          <div className="grid gap-3">
            {filteredDesignTemplates.length === 0 ? (
              <div className="rounded-md border border-white/10 bg-[#20222b] p-4 text-sm text-slate-400">
                No hay plantillas para esa busqueda.
              </div>
            ) : null}
            {filteredDesignTemplates.map((template) => (
              <button
                key={template.id}
                type="button"
                className="overflow-hidden rounded-md border border-white/10 bg-[#20222b] text-left transition hover:border-[#8b5cf6]"
                onClick={() => applyTemplate(template.id)}
              >
                <span className={`block h-24 bg-gradient-to-br ${template.accent}`} />
                <span className="block px-3 pt-2 text-sm font-semibold text-white">{template.name}</span>
                <span className="block px-3 pb-3 pt-1 text-xs text-slate-400">{template.description}</span>
              </button>
            ))}
          </div>
        </section>
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
          <Button
            variant="ghost"
            className="hidden text-white hover:bg-white/15 sm:inline-flex"
            onClick={() => setActiveTool("templates")}
          >
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
              <Button
                size="icon-lg"
                variant="ghost"
                className="text-white hover:bg-white/15"
                aria-label="Comentarios"
                onClick={() => setActiveTool("comments")}
              >
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

      <div className="grid min-h-[calc(100vh-4rem)] grid-cols-[76px_minmax(0,1fr)] lg:grid-cols-[76px_320px_minmax(0,1fr)] xl:grid-cols-[76px_320px_minmax(0,1fr)_320px]">
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
              <span>{documentSize.width} x {documentSize.height}px</span>
              <span>{document.pages.length} paginas</span>
              <span>{totalElements} elementos</span>
            </div>
            <div className="flex items-center gap-1 text-slate-300">
              <Button
                size="icon-sm"
                variant="ghost"
                className="text-slate-300 hover:bg-white/10"
                aria-label="Deshacer"
                onClick={undoDocument}
                disabled={!canUndo}
              >
                <Undo2 />
              </Button>
              <Button
                size="icon-sm"
                variant="ghost"
                className="text-slate-300 hover:bg-white/10"
                aria-label="Rehacer"
                onClick={redoDocument}
                disabled={!canRedo}
              >
                <Redo2 />
              </Button>
              <Button
                size="icon-sm"
                variant="ghost"
                className="text-slate-300 hover:bg-white/10"
                aria-label={selectedElement?.locked ? "Desbloquear" : "Bloquear"}
                onClick={toggleSelectedLocked}
                disabled={!selectedElement}
              >
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
                  <div className="mx-auto mb-3 flex items-center justify-between text-slate-300" style={{ width: canvasPreviewWidth }}>
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
                      width={canvasPreviewWidth}
                      height={canvasPreviewHeight}
                      scaleX={canvasPreviewScale}
                      scaleY={canvasPreviewScale}
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
                        <Rect width={documentSize.width} height={documentSize.height} fill={page.background} />
                        {page.elements.length === 0 ? (
                          <Text
                            text="Sube una imagen, agrega texto o inserta una forma"
                            x={0}
                            y={documentSize.height / 2 - 42}
                            width={documentSize.width}
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
                                canvasSize: documentSize,
                                threshold: SNAP_THRESHOLD_SCREEN_PX / canvasPreviewScale,
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
                                    ? [guide.position, 0, guide.position, documentSize.height]
                                    : [0, guide.position, documentSize.width, guide.position]
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
                  <div className="mx-auto mt-5 flex h-12 overflow-hidden rounded-md border border-white/35 bg-transparent text-slate-200" style={{ width: canvasPreviewWidth }}>
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
        <aside className="hidden border-l border-white/8 bg-[#171922] p-4 text-slate-100 xl:block">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-white">Inspector</h2>
              <p className="text-xs text-slate-400">
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

              <div className="space-y-3">
                <Label>Alinear al lienzo</Label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { alignment: "left", icon: AlignHorizontalJustifyStart, label: "Alinear izquierda" },
                    { alignment: "center", icon: AlignHorizontalJustifyCenter, label: "Alinear centro" },
                    { alignment: "right", icon: AlignHorizontalJustifyEnd, label: "Alinear derecha" },
                    { alignment: "top", icon: AlignVerticalJustifyStart, label: "Alinear arriba" },
                    { alignment: "middle", icon: AlignVerticalJustifyCenter, label: "Alinear medio" },
                    { alignment: "bottom", icon: AlignVerticalJustifyEnd, label: "Alinear abajo" },
                  ].map((option) => {
                    const Icon = option.icon

                    return (
                      <Button
                        key={option.alignment}
                        size="icon-sm"
                        variant="outline"
                        aria-label={option.label}
                        onClick={() => alignSelectedToCanvas(option.alignment as ElementAlignment)}
                      >
                        <Icon />
                      </Button>
                    )
                  })}
                </div>
              </div>

              {selectedTextElement ? (
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
	                      value={selectedTextElement.fontFamily}
	                      onChange={(event) =>
	                        updateSelected({ fontFamily: event.target.value as typeof selectedTextElement.fontFamily })
	                      }
	                      className="h-8 w-full rounded-lg border border-white/10 bg-[#12141b] px-2 text-sm text-slate-100"
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
			                      <span className="text-xs text-slate-400">{selectedTextElement.fontSize}px</span>
	                    </div>
                    <Slider
	                      value={[selectedTextElement.fontSize]}
                      min={12}
                      max={120}
                      step={1}
	                      onValueChange={([fontSize]) => updateSelected({ fontSize })}
	                    />
	                  </div>

                  <div className="space-y-3">
                    <Label>Estilo</Label>
                    <div className="grid grid-cols-3 gap-2">
                      <Button
                        size="icon-sm"
	                        variant={selectedTextElement.fontWeight === "bold" ? "default" : "outline"}
                        aria-label="Negrita"
                        onClick={() =>
                          updateSelectedTextStyle({
	                            fontWeight: selectedTextElement.fontWeight === "bold" ? "normal" : "bold",
                          })
                        }
                      >
                        <Bold />
                      </Button>
                      <Button
                        size="icon-sm"
	                        variant={selectedTextElement.fontStyle === "italic" ? "default" : "outline"}
                        aria-label="Italica"
                        onClick={() =>
                          updateSelectedTextStyle({
	                            fontStyle: selectedTextElement.fontStyle === "italic" ? "normal" : "italic",
                          })
                        }
                      >
                        <Italic />
                      </Button>
                      <Button
                        size="icon-sm"
	                        variant={selectedTextElement.textDecoration === "underline" ? "default" : "outline"}
                        aria-label="Subrayado"
                        onClick={() =>
                          updateSelectedTextStyle({
                            textDecoration:
	                              selectedTextElement.textDecoration === "underline" ? "none" : "underline",
                          })
                        }
                      >
                        <Underline />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label>Alineacion</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { value: "left", icon: AlignLeft, label: "Izquierda" },
                        { value: "center", icon: AlignCenter, label: "Centro" },
                        { value: "right", icon: AlignRight, label: "Derecha" },
                      ].map((option) => {
                        const Icon = option.icon

                        return (
                          <Button
                            key={option.value}
                            size="icon-sm"
	                            variant={selectedTextElement.align === option.value ? "default" : "outline"}
	                            aria-label={option.label}
	                            onClick={() => updateSelectedTextStyle({ align: option.value as typeof selectedTextElement.align })}
                          >
                            <Icon />
                          </Button>
                        )
                      })}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Interlineado</Label>
	                      <span className="text-xs text-slate-400">{selectedTextElement.lineHeight.toFixed(2)}</span>
                    </div>
                    <Slider
	                      value={[selectedTextElement.lineHeight]}
                      min={0.7}
                      max={2.5}
                      step={0.05}
                      onValueChange={([lineHeight]) => updateSelectedTextStyle({ lineHeight })}
                    />
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Espaciado</Label>
	                      <span className="text-xs text-slate-400">{Math.round(selectedTextElement.letterSpacing)}px</span>
                    </div>
                    <Slider
	                      value={[selectedTextElement.letterSpacing]}
                      min={-50}
                      max={200}
                      step={1}
                      onValueChange={([letterSpacing]) => updateSelectedTextStyle({ letterSpacing })}
                    />
                  </div>
	                </>
	              ) : null}

              {selectedImageElement ? (
                <>
                  <div className="space-y-3">
                    <Label>Mascara</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { value: "none", label: "Ninguna" },
                        { value: "rounded", label: "Bordes" },
                        { value: "circle", label: "Circulo" },
                      ].map((option) => (
                        <Button
                          key={option.value}
                          type="button"
                          variant={selectedImageElement.mask === option.value ? "default" : "outline"}
                          onClick={() => updateSelectedImageMask(option.value as ImageMask)}
                        >
                          {option.label}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Recorte X</Label>
                      <span className="text-xs text-slate-400">{Math.round(selectedImageElement.crop.x * 100)}%</span>
                    </div>
                    <Slider
                      value={[selectedImageElement.crop.x]}
                      min={0}
                      max={1}
                      step={0.01}
                      onValueChange={([x]) => updateSelectedImageCrop({ x })}
                    />
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Recorte Y</Label>
                      <span className="text-xs text-slate-400">{Math.round(selectedImageElement.crop.y * 100)}%</span>
                    </div>
                    <Slider
                      value={[selectedImageElement.crop.y]}
                      min={0}
                      max={1}
                      step={0.01}
                      onValueChange={([y]) => updateSelectedImageCrop({ y })}
                    />
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Ancho visible</Label>
                      <span className="text-xs text-slate-400">
                        {Math.round(selectedImageElement.crop.width * 100)}%
                      </span>
                    </div>
                    <Slider
                      value={[selectedImageElement.crop.width]}
                      min={0.05}
                      max={1}
                      step={0.01}
                      onValueChange={([width]) => updateSelectedImageCrop({ width })}
                    />
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Alto visible</Label>
                      <span className="text-xs text-slate-400">
                        {Math.round(selectedImageElement.crop.height * 100)}%
                      </span>
                    </div>
                    <Slider
                      value={[selectedImageElement.crop.height]}
                      min={0.05}
                      max={1}
                      step={0.01}
                      onValueChange={([height]) => updateSelectedImageCrop({ height })}
                    />
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => updateSelectedImageCrop(createDefaultImageCrop())}
                  >
                    <ImageIcon data-icon="inline-start" />
                    Restablecer recorte
                  </Button>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Brillo</Label>
                      <span className="text-xs text-slate-400">
                        {Math.round(selectedImageElement.filters.brightness * 100)}%
                      </span>
                    </div>
                    <Slider
                      value={[selectedImageElement.filters.brightness]}
                      min={-1}
                      max={1}
                      step={0.05}
                      onValueChange={([brightness]) => updateSelectedImageFilters({ brightness })}
                    />
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Contraste</Label>
                      <span className="text-xs text-slate-400">
                        {Math.round(selectedImageElement.filters.contrast * 100)}%
                      </span>
                    </div>
                    <Slider
                      value={[selectedImageElement.filters.contrast]}
                      min={-1}
                      max={1}
                      step={0.05}
                      onValueChange={([contrast]) => updateSelectedImageFilters({ contrast })}
                    />
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Saturacion</Label>
                      <span className="text-xs text-slate-400">
                        {Math.round(selectedImageElement.filters.saturation * 100)}%
                      </span>
                    </div>
                    <Slider
                      value={[selectedImageElement.filters.saturation]}
                      min={-1}
                      max={1}
                      step={0.05}
                      onValueChange={([saturation]) => updateSelectedImageFilters({ saturation })}
                    />
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Desenfoque</Label>
                      <span className="text-xs text-slate-400">{Math.round(selectedImageElement.filters.blur)}px</span>
                    </div>
                    <Slider
                      value={[selectedImageElement.filters.blur]}
                      min={0}
                      max={80}
                      step={1}
                      onValueChange={([blur]) => updateSelectedImageFilters({ blur })}
                    />
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => updateSelectedImageFilters(createDefaultImageFilters())}
                  >
                    <WandSparkles data-icon="inline-start" />
                    Restablecer filtros
                  </Button>
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
	                  <span className="text-xs text-slate-400">{Math.round(selectedElement.rotation)} deg</span>
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
	                  <span className="text-xs text-slate-400">{Math.round(selectedElement.opacity * 100)}%</span>
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
	                        className="size-7 rounded-full border border-white/20 shadow-sm"
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
	            <div className="rounded-md border border-dashed border-white/15 bg-[#20222b] p-4 text-sm leading-6 text-slate-400">
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
  const assetRecords = useQuery(api.assets.list) as AssetRecord[] | undefined
  const createProject = useMutation(api.projects.create)
  const updateProject = useMutation(api.projects.updateCanvas)
  const generateAssetUploadUrl = useMutation(api.assets.generateUploadUrl)
  const saveAsset = useMutation(api.assets.save)
  const createComment = useMutation(api.comments.create)

  const projects = useMemo(
    () => (projectRecords ?? []).map((project) => summarizeProjectRecord(project)),
    [projectRecords],
  )
  const assets = useMemo(
    () =>
      (assetRecords ?? [])
        .map((asset) => summarizeAssetRecord(asset))
        .filter((asset): asset is LibraryAsset => Boolean(asset)),
    [assetRecords],
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

  const uploadAsset = useCallback(
    async (file: File) => {
      const uploadUrl = await generateAssetUploadUrl()
      const response = await fetch(uploadUrl, {
        method: "POST",
        headers: file.type ? { "Content-Type": file.type } : undefined,
        body: file,
      })

      if (!response.ok) {
        throw new Error("No se pudo subir la imagen a Convex Storage")
      }

      const { storageId } = (await response.json()) as { storageId: string }
      const assetId = (await saveAsset({
        name: normalizeAssetName(file.name),
        storageId: storageId as Id<"_storage">,
        contentType: file.type || undefined,
        size: file.size,
      })) as string
      const assetRecord = (await convex.query(api.assets.get, {
        id: assetId as Id<"assets">,
      })) as AssetRecord | null
      const asset = assetRecord ? summarizeAssetRecord(assetRecord) : null

      if (!asset) {
        throw new Error("No se pudo cargar la imagen guardada")
      }

      return asset
    },
    [convex, generateAssetUploadUrl, saveAsset],
  )

  const assetPersistence = useMemo<AssetPersistence>(
    () => ({
      isEnabled: true,
      isLoading: assetRecords === undefined,
      assets,
      uploadAsset,
    }),
    [assetRecords, assets, uploadAsset],
  )

  const commentPersistence = useMemo<CommentPersistence>(
    () => ({
      isEnabled: true,
      listComments: async (projectId) => {
        const records = (await convex.query(api.comments.list, {
          projectId: projectId as Id<"projects">,
        })) as CommentRecord[]

        return records.map((record) => summarizeCommentRecord(record))
      },
      createComment: async (projectId, comment) => {
        await createComment({
          projectId: projectId as Id<"projects">,
          body: comment.body,
          authorName: comment.authorName,
          pageId: comment.pageId,
          elementId: comment.elementId,
        })
      },
    }),
    [convex, createComment],
  )

  return (
    <EditorApp
      persistence={persistence}
      assetPersistence={assetPersistence}
      commentPersistence={commentPersistence}
    />
  )
}

function App() {
  if (import.meta.env.VITE_CONVEX_URL) {
    return <ConvexBackedApp />
  }

  return (
    <EditorApp
      persistence={localProjectPersistence}
      assetPersistence={localAssetPersistence}
      commentPersistence={localCommentPersistence}
    />
  )
}

export default App
