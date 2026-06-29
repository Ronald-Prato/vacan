export type ExportFormatId = "png" | "jpg" | "pdf"

export type ExportFormat = {
  id: ExportFormatId
  label: string
  extension: string
}

export type ExportOptions = {
  format: ExportFormatId
  quality: number
  transparentBackground: boolean
}

export const EXPORT_FORMATS: ExportFormat[] = [
  { id: "png", label: "PNG", extension: "png" },
  { id: "jpg", label: "JPG", extension: "jpg" },
  { id: "pdf", label: "PDF", extension: "pdf" },
]

export function createExportOptions(overrides: Partial<ExportOptions> = {}): ExportOptions {
  return {
    format: overrides.format ?? "png",
    quality: clampQuality(overrides.quality ?? 0.92),
    transparentBackground: overrides.transparentBackground ?? false,
  }
}

export function buildExportFileName(documentName: string, format: ExportFormatId): string {
  const extension = EXPORT_FORMATS.find((candidate) => candidate.id === format)?.extension ?? format
  const slug = documentName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")

  return `${slug || "vacan"}.${extension}`
}

export function getExportMimeType(format: ExportFormatId): "image/png" | "image/jpeg" {
  return format === "jpg" ? "image/jpeg" : "image/png"
}

function clampQuality(quality: number): number {
  return Math.min(Math.max(quality, 0.1), 1)
}
