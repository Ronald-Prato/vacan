import { CANVAS_SIZE, type CanvasElement } from "./document"

export type SnapGuide = {
  axis: "vertical" | "horizontal"
  position: number
}

type AxisReference = {
  position: number
  source: "canvas" | "element"
}

type SnapPoint = {
  position: number
}

type SnapCandidate = {
  delta: number
  distance: number
  guide: SnapGuide
  source: "canvas" | "element"
}

export const DEFAULT_SNAP_THRESHOLD = 48

export function snapElementPosition({
  element,
  position,
  elements,
  canvasSize = CANVAS_SIZE,
  threshold = DEFAULT_SNAP_THRESHOLD,
}: {
  element: Pick<CanvasElement, "id" | "width" | "height">
  position: { x: number; y: number }
  elements: CanvasElement[]
  canvasSize?: { width: number; height: number }
  threshold?: number
}): { x: number; y: number; guides: SnapGuide[] } {
  const verticalReferences = createVerticalReferences(elements, element.id, canvasSize.width)
  const horizontalReferences = createHorizontalReferences(elements, element.id, canvasSize.height)

  const verticalSnap = findBestSnap(
    [
      { position: position.x },
      { position: position.x + element.width / 2 },
      { position: position.x + element.width },
    ],
    verticalReferences,
    threshold,
    "vertical",
  )
  const horizontalSnap = findBestSnap(
    [
      { position: position.y },
      { position: position.y + element.height / 2 },
      { position: position.y + element.height },
    ],
    horizontalReferences,
    threshold,
    "horizontal",
  )

  return {
    x: verticalSnap ? position.x + verticalSnap.delta : position.x,
    y: horizontalSnap ? position.y + horizontalSnap.delta : position.y,
    guides: [verticalSnap?.guide, horizontalSnap?.guide].filter((guide): guide is SnapGuide => Boolean(guide)),
  }
}

function createVerticalReferences(
  elements: CanvasElement[],
  activeElementId: string,
  canvasWidth: number,
): AxisReference[] {
  return [
    { position: 0, source: "canvas" },
    { position: canvasWidth / 2, source: "canvas" },
    { position: canvasWidth, source: "canvas" },
    ...elements
      .filter((element) => element.id !== activeElementId)
      .flatMap((element): AxisReference[] => [
        { position: element.x, source: "element" },
        { position: element.x + element.width / 2, source: "element" },
        { position: element.x + element.width, source: "element" },
      ]),
  ]
}

function createHorizontalReferences(
  elements: CanvasElement[],
  activeElementId: string,
  canvasHeight: number,
): AxisReference[] {
  return [
    { position: 0, source: "canvas" },
    { position: canvasHeight / 2, source: "canvas" },
    { position: canvasHeight, source: "canvas" },
    ...elements
      .filter((element) => element.id !== activeElementId)
      .flatMap((element): AxisReference[] => [
        { position: element.y, source: "element" },
        { position: element.y + element.height / 2, source: "element" },
        { position: element.y + element.height, source: "element" },
      ]),
  ]
}

function findBestSnap(
  points: SnapPoint[],
  references: AxisReference[],
  threshold: number,
  axis: SnapGuide["axis"],
): SnapCandidate | null {
  let bestCandidate: SnapCandidate | null = null

  for (const point of points) {
    for (const reference of references) {
      const delta = reference.position - point.position
      const distance = Math.abs(delta)

      if (distance > threshold) {
        continue
      }

      const candidate: SnapCandidate = {
        delta,
        distance,
        guide: {
          axis,
          position: reference.position,
        },
        source: reference.source,
      }

      if (!bestCandidate || compareSnapCandidates(candidate, bestCandidate) < 0) {
        bestCandidate = candidate
      }
    }
  }

  return bestCandidate
}

function compareSnapCandidates(candidate: SnapCandidate, current: SnapCandidate) {
  if (candidate.distance !== current.distance) {
    return candidate.distance - current.distance
  }

  if (candidate.source !== current.source) {
    return candidate.source === "element" ? -1 : 1
  }

  return 0
}
