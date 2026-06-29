import { describe, expect, it } from "vitest"

import { createWorkspaceStats, listRecentProjects } from "./dashboard"
import type { LibraryAsset } from "./assets"
import type { SavedProject } from "./projects"
import type { SharedTemplateSummary } from "./templates"

const projects: SavedProject[] = [
  { id: "old", name: "Old", updatedAt: 100, pageCount: 1, elementCount: 3 },
  { id: "new", name: "New", updatedAt: 300, pageCount: 2, elementCount: 8 },
  { id: "mid", name: "Mid", updatedAt: 200, pageCount: 1, elementCount: 4 },
]
const assets: LibraryAsset[] = [
  { id: "asset-1", name: "Logo", src: "/logo.png", contentType: "image/png", size: 10 },
]
const sharedTemplates: SharedTemplateSummary[] = [
  {
    id: "template-1",
    name: "Reusable",
    description: "",
    authorName: "Equipo",
    createdAt: 123,
    pageCount: 1,
    elementCount: 4,
  },
]

describe("workspace dashboard helpers", () => {
  it("lists recent projects in descending update order", () => {
    expect(listRecentProjects(projects, 2).map((project) => project.id)).toEqual(["new", "mid"])
  })

  it("summarizes workspace activity for the dashboard", () => {
    expect(
      createWorkspaceStats({
        projects,
        assets,
        sharedTemplates,
        builtInTemplateCount: 3,
      }),
    ).toEqual({
      projectCount: 3,
      assetCount: 1,
      templateCount: 4,
      totalPageCount: 4,
    })
  })
})
