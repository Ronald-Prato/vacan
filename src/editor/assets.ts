import type { Asset } from "./document"

const UNTITLED_ASSET_NAME = "Imagen sin titulo"
const SUPPORTED_IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif", "image/svg+xml"])

export type LibraryAsset = Asset & {
  contentType?: string
  size?: number
  updatedAt?: number
}

export type AssetRecord = {
  _id: string
  name: string
  url: string | null
  contentType?: string
  size?: number
  updatedAt: number
}

export function normalizeAssetName(fileName: string): string {
  const trimmedName = fileName.trim().replace(/\.[^/.]+$/, "")

  return trimmedName || UNTITLED_ASSET_NAME
}

export function createLocalAsset({
  id,
  fileName,
  src,
  contentType,
  size,
}: {
  id: string
  fileName: string
  src: string
  contentType?: string
  size?: number
}): LibraryAsset {
  return {
    id,
    name: normalizeAssetName(fileName),
    src,
    contentType,
    size,
  }
}

export function isSupportedImageAsset(contentType: string): boolean {
  return SUPPORTED_IMAGE_TYPES.has(contentType)
}

export function summarizeAssetRecord(record: AssetRecord): LibraryAsset | null {
  if (!record.url) {
    return null
  }

  return {
    id: record._id,
    name: normalizeAssetName(record.name),
    src: record.url,
    contentType: record.contentType,
    size: record.size,
    updatedAt: record.updatedAt,
  }
}
