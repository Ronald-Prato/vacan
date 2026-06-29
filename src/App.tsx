import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react"
import Konva from "konva"
import {
  Download,
  ImagePlus,
  Layers3,
  MousePointer2,
  RotateCcw,
  RotateCw,
  Scan,
  Trash2,
} from "lucide-react"
import { Image as KonvaImage, Layer as KonvaLayer, Rect, Stage, Text, Transformer } from "react-konva"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Slider } from "@/components/ui/slider"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

type CanvasImageLayer = {
  id: string
  name: string
  src: string
  x: number
  y: number
  width: number
  height: number
  rotation: number
  opacity: number
}

const CANVAS_SIZE = {
  width: 980,
  height: 620,
}

const featureBacklog = [
  "Subir imagenes y organizarlas como capas",
  "Mover, escalar, rotar y ajustar opacidad",
  "Recortar imagenes y aplicar mascaras",
  "Agregar texto editable con fuentes y estilos",
  "Formas basicas, lineas, iconos y stickers",
  "Plantillas con tamanos para redes sociales",
  "Alinear, distribuir, agrupar y bloquear capas",
  "Historial de deshacer/rehacer",
  "Filtros, brillo, contraste y saturacion",
  "Exportar PNG/JPG/PDF y guardar proyectos",
  "Colaboracion en tiempo real con Convex",
  "Biblioteca de assets reutilizables",
]

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
  layer,
  isSelected,
  onSelect,
  onChange,
}: {
  layer: CanvasImageLayer
  isSelected: boolean
  onSelect: () => void
  onChange: (layer: CanvasImageLayer) => void
}) {
  const image = useCanvasImage(layer.src)
  const shapeRef = useRef<Konva.Image>(null)
  const transformerRef = useRef<Konva.Transformer>(null)

  useEffect(() => {
    if (!isSelected || !shapeRef.current || !transformerRef.current) {
      return
    }

    transformerRef.current.nodes([shapeRef.current])
    transformerRef.current.getLayer()?.batchDraw()
  }, [isSelected])

  return (
    <>
      <KonvaImage
        ref={shapeRef}
        image={image ?? undefined}
        x={layer.x}
        y={layer.y}
        width={layer.width}
        height={layer.height}
        rotation={layer.rotation}
        opacity={layer.opacity}
        draggable
        onClick={onSelect}
        onTap={onSelect}
        onDragEnd={(event) => {
          onChange({
            ...layer,
            x: event.target.x(),
            y: event.target.y(),
          })
        }}
        onTransformEnd={() => {
          const node = shapeRef.current

          if (!node) {
            return
          }

          const scaleX = node.scaleX()
          const scaleY = node.scaleY()

          node.scaleX(1)
          node.scaleY(1)

          onChange({
            ...layer,
            x: node.x(),
            y: node.y(),
            width: Math.max(48, node.width() * scaleX),
            height: Math.max(48, node.height() * scaleY),
            rotation: node.rotation(),
          })
        }}
      />
      {isSelected ? (
        <Transformer
          ref={transformerRef}
          rotateEnabled
          borderStroke="#0f766e"
          anchorStroke="#0f766e"
          anchorFill="#f8fafc"
          anchorSize={10}
          boundBoxFunc={(oldBox, newBox) => {
            if (newBox.width < 48 || newBox.height < 48) {
              return oldBox
            }

            return newBox
          }}
        />
      ) : null}
    </>
  )
}

function App() {
  const [layers, setLayers] = useState<CanvasImageLayer[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [canvasName, setCanvasName] = useState("Post de lanzamiento")
  const fileInputRef = useRef<HTMLInputElement>(null)
  const stageRef = useRef<Konva.Stage>(null)

  const selectedLayer = useMemo(
    () => layers.find((layer) => layer.id === selectedId) ?? null,
    [layers, selectedId],
  )

  const updateLayer = (layerId: string, changes: Partial<CanvasImageLayer>) => {
    setLayers((currentLayers) =>
      currentLayers.map((layer) => (layer.id === layerId ? { ...layer, ...changes } : layer)),
    )
  }

  const addImage = (file: File) => {
    const reader = new FileReader()

    reader.onload = () => {
      const src = String(reader.result)
      const image = new window.Image()

      image.onload = () => {
        const maxWidth = CANVAS_SIZE.width * 0.68
        const maxHeight = CANVAS_SIZE.height * 0.68
        const scale = Math.min(maxWidth / image.width, maxHeight / image.height, 1)
        const width = Math.round(image.width * scale)
        const height = Math.round(image.height * scale)
        const layer: CanvasImageLayer = {
          id: crypto.randomUUID(),
          name: file.name.replace(/\.[^/.]+$/, "") || "Imagen",
          src,
          x: Math.round((CANVAS_SIZE.width - width) / 2),
          y: Math.round((CANVAS_SIZE.height - height) / 2),
          width,
          height,
          rotation: 0,
          opacity: 1,
        }

        setLayers((currentLayers) => [...currentLayers, layer])
        setSelectedId(layer.id)
      }

      image.src = src
    }

    reader.readAsDataURL(file)
  }

  const handleUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]

    if (file) {
      addImage(file)
    }

    event.target.value = ""
  }

  const deleteSelected = () => {
    if (!selectedId) {
      return
    }

    setLayers((currentLayers) => currentLayers.filter((layer) => layer.id !== selectedId))
    setSelectedId(null)
  }

  const duplicateSelected = () => {
    if (!selectedLayer) {
      return
    }

    const copy = {
      ...selectedLayer,
      id: crypto.randomUUID(),
      name: `${selectedLayer.name} copia`,
      x: selectedLayer.x + 28,
      y: selectedLayer.y + 28,
    }

    setLayers((currentLayers) => [...currentLayers, copy])
    setSelectedId(copy.id)
  }

  const exportCanvas = () => {
    const dataUrl = stageRef.current?.toDataURL({ pixelRatio: 2 })

    if (!dataUrl) {
      return
    }

    const link = document.createElement("a")
    link.download = `${canvasName.trim().toLowerCase().replace(/\s+/g, "-") || "vacan"}.png`
    link.href = dataUrl
    link.click()
  }

  return (
    <main className="min-h-screen bg-[#f4f6f2] text-slate-950">
      <header className="flex min-h-14 flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="grid size-8 place-items-center rounded-lg bg-teal-700 text-sm font-semibold text-white">
            V
          </div>
          <div>
            <h1 className="text-base font-semibold leading-none">vacan</h1>
            <p className="text-xs text-slate-500">Editor open source con Convex + React</p>
          </div>
        </div>
        <div className="flex w-full items-center gap-2 sm:w-auto">
          <Input
            value={canvasName}
            onChange={(event) => setCanvasName(event.target.value)}
            className="h-8 w-full bg-white sm:w-56"
            aria-label="Nombre del diseno"
          />
          <Button variant="outline" size="sm" onClick={exportCanvas} disabled={layers.length === 0}>
            <Download data-icon="inline-start" />
            Exportar PNG
          </Button>
        </div>
      </header>

      <div className="grid min-h-[calc(100vh-3.5rem)] grid-cols-1 xl:grid-cols-[280px_minmax(680px,1fr)_300px]">
        <aside className="border-r border-slate-200 bg-white p-4">
          <div className="space-y-4">
            <div>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold">Herramientas</h2>
                <Badge variant="secondary">MVP</Badge>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleUpload}
              />
              <Button className="w-full" onClick={() => fileInputRef.current?.click()}>
                <ImagePlus data-icon="inline-start" />
                Subir imagen
              </Button>
            </div>

            <Separator />

            <div className="grid grid-cols-3 gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="icon" variant="outline" aria-label="Seleccionar">
                    <MousePointer2 />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Seleccionar capas</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="icon" variant="outline" aria-label="Duplicar" onClick={duplicateSelected}>
                    <Layers3 />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Duplicar capa</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="icon" variant="outline" aria-label="Eliminar" onClick={deleteSelected}>
                    <Trash2 />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Eliminar capa</TooltipContent>
              </Tooltip>
            </div>

            <Separator />

            <section className="space-y-3">
              <h2 className="text-sm font-semibold">Basicos tipo Canva</h2>
              <div className="space-y-2">
                {featureBacklog.map((feature, index) => (
                  <div key={feature} className="flex gap-2 rounded-md border border-slate-200 bg-slate-50 p-2">
                    <span className="mt-0.5 text-xs font-semibold text-teal-700">{index + 1}</span>
                    <p className="text-xs leading-5 text-slate-600">{feature}</p>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </aside>

        <section className="flex flex-col bg-[#eef1ea]">
          <div className="flex h-11 items-center justify-between border-b border-slate-200 bg-white px-4">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Scan className="size-4 text-teal-700" />
              Canvas {CANVAS_SIZE.width} x {CANVAS_SIZE.height}
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span>{layers.length} capas</span>
              <span>Arrastra una imagen para moverla</span>
            </div>
          </div>

          <div className="flex flex-1 items-center justify-center overflow-auto p-8">
            <div className="border border-slate-300 bg-white shadow-[0_24px_60px_rgba(15,23,42,0.18)]">
              <Stage
                ref={stageRef}
                width={CANVAS_SIZE.width}
                height={CANVAS_SIZE.height}
                onMouseDown={(event) => {
                  if (event.target === event.target.getStage()) {
                    setSelectedId(null)
                  }
                }}
                onTouchStart={(event) => {
                  if (event.target === event.target.getStage()) {
                    setSelectedId(null)
                  }
                }}
              >
                <KonvaLayer>
                  <Rect width={CANVAS_SIZE.width} height={CANVAS_SIZE.height} fill="#ffffff" />
                  {layers.length === 0 ? (
                    <Text
                      text="Sube una imagen para empezar"
                      x={0}
                      y={CANVAS_SIZE.height / 2 - 14}
                      width={CANVAS_SIZE.width}
                      align="center"
                      fill="#64748b"
                      fontSize={18}
                    />
                  ) : null}
                  {layers.map((layer) => (
                    <EditableImage
                      key={layer.id}
                      layer={layer}
                      isSelected={layer.id === selectedId}
                      onSelect={() => setSelectedId(layer.id)}
                      onChange={(nextLayer) => updateLayer(layer.id, nextLayer)}
                    />
                  ))}
                </KonvaLayer>
              </Stage>
            </div>
          </div>
        </section>

        <aside className="border-l border-slate-200 bg-white p-4">
          <div className="mb-4">
            <h2 className="text-sm font-semibold">Inspector</h2>
            <p className="text-xs text-slate-500">
              {selectedLayer ? selectedLayer.name : "Selecciona una imagen para editarla"}
            </p>
          </div>

          {selectedLayer ? (
            <div className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="layer-name">Nombre</Label>
                <Input
                  id="layer-name"
                  value={selectedLayer.name}
                  onChange={(event) => updateLayer(selectedLayer.id, { name: event.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="layer-x">X</Label>
                  <Input
                    id="layer-x"
                    type="number"
                    value={Math.round(selectedLayer.x)}
                    onChange={(event) => updateLayer(selectedLayer.id, { x: Number(event.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="layer-y">Y</Label>
                  <Input
                    id="layer-y"
                    type="number"
                    value={Math.round(selectedLayer.y)}
                    onChange={(event) => updateLayer(selectedLayer.id, { y: Number(event.target.value) })}
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Rotacion</Label>
                  <span className="text-xs text-slate-500">{Math.round(selectedLayer.rotation)} deg</span>
                </div>
                <Slider
                  value={[selectedLayer.rotation]}
                  min={-180}
                  max={180}
                  step={1}
                  onValueChange={([rotation]) => updateLayer(selectedLayer.id, { rotation })}
                />
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => updateLayer(selectedLayer.id, { rotation: selectedLayer.rotation - 15 })}
                  >
                    <RotateCcw data-icon="inline-start" />
                    -15
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => updateLayer(selectedLayer.id, { rotation: selectedLayer.rotation + 15 })}
                  >
                    <RotateCw data-icon="inline-start" />
                    +15
                  </Button>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Opacidad</Label>
                  <span className="text-xs text-slate-500">{Math.round(selectedLayer.opacity * 100)}%</span>
                </div>
                <Slider
                  value={[selectedLayer.opacity]}
                  min={0.1}
                  max={1}
                  step={0.05}
                  onValueChange={([opacity]) => updateLayer(selectedLayer.id, { opacity })}
                />
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" onClick={duplicateSelected}>
                  Duplicar
                </Button>
                <Button variant="destructive" onClick={deleteSelected}>
                  Eliminar
                </Button>
              </div>
            </div>
          ) : (
            <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-4 text-sm leading-6 text-slate-500">
              Sube una imagen y seleccionala en el canvas para ver controles de transformacion.
            </div>
          )}
        </aside>
      </div>
    </main>
  )
}

export default App
