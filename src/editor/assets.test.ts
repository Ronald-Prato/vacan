import { describe, expect, it } from "vitest"

import {
  createLocalAsset,
  isSupportedImageAsset,
  normalizeAssetName,
  summarizeAssetRecord,
} from "./assets"

describe("asset library helpers", () => {
  it("normalizes filenames for display", () => {
    expect(normalizeAssetName("  campaign-hero.PNG  ")).toBe("campaign-hero")
    expect(normalizeAssetName("")).toBe("Imagen sin titulo")
  })

  it("creates local uploaded assets from data urls", () => {
    const asset = createLocalAsset({
      id: "asset-1",
      fileName: "logo.png",
      src: "data:image/png;base64,abc",
      contentType: "image/png",
      size: 123,
    })

    expect(asset).toEqual({
      id: "asset-1",
      name: "logo",
      src: "data:image/png;base64,abc",
      contentType: "image/png",
      size: 123,
    })
  })

  it("rejects unsupported asset content types", () => {
    expect(isSupportedImageAsset("image/png")).toBe(true)
    expect(isSupportedImageAsset("image/jpeg")).toBe(true)
    expect(isSupportedImageAsset("image/svg+xml")).toBe(true)
    expect(isSupportedImageAsset("application/pdf")).toBe(false)
  })

  it("summarizes persisted asset records only when a storage url is available", () => {
    expect(
      summarizeAssetRecord({
        _id: "asset-1",
        name: "Hero",
        url: "https://files.example/hero.png",
        contentType: "image/png",
        size: 5000,
        updatedAt: 123,
      }),
    ).toEqual({
      id: "asset-1",
      name: "Hero",
      src: "https://files.example/hero.png",
      contentType: "image/png",
      size: 5000,
      updatedAt: 123,
    })

    expect(
      summarizeAssetRecord({
        _id: "asset-2",
        name: "Missing",
        url: null,
        updatedAt: 123,
      }),
    ).toBeNull()
  })
})
