import { describe, expect, it } from "vitest"

import {
  EXPORT_FORMATS,
  buildExportFileName,
  createExportOptions,
  getExportMimeType,
} from "./export"

describe("export helpers", () => {
  it("offers professional export formats", () => {
    expect(EXPORT_FORMATS.map((format) => format.id)).toEqual(["png", "jpg", "pdf"])
  })

  it("builds safe filenames from document names", () => {
    expect(buildExportFileName("  Nuevo Lanzamiento  ", "png")).toBe("nuevo-lanzamiento.png")
    expect(buildExportFileName("", "pdf")).toBe("vacan.pdf")
  })

  it("returns the correct canvas mime type", () => {
    expect(getExportMimeType("png")).toBe("image/png")
    expect(getExportMimeType("jpg")).toBe("image/jpeg")
    expect(getExportMimeType("pdf")).toBe("image/png")
  })

  it("creates stable default options", () => {
    expect(createExportOptions()).toEqual({
      format: "png",
      quality: 0.92,
      transparentBackground: false,
    })
  })

  it("clamps jpg quality into the browser-safe range", () => {
    expect(createExportOptions({ format: "jpg", quality: 1.8 }).quality).toBe(1)
    expect(createExportOptions({ format: "jpg", quality: -0.2 }).quality).toBe(0.1)
  })
})
