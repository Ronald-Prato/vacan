import type { LibraryAsset } from "./assets"
import type { SavedProject } from "./projects"
import type { SharedTemplateSummary } from "./templates"

export type WorkspaceStats = {
  projectCount: number
  assetCount: number
  templateCount: number
  totalPageCount: number
}

export function listRecentProjects(projects: SavedProject[], limit = 6): SavedProject[] {
  return [...projects].sort((first, second) => second.updatedAt - first.updatedAt).slice(0, limit)
}

export function createWorkspaceStats({
  projects,
  assets,
  sharedTemplates,
  builtInTemplateCount,
}: {
  projects: SavedProject[]
  assets: LibraryAsset[]
  sharedTemplates: SharedTemplateSummary[]
  builtInTemplateCount: number
}): WorkspaceStats {
  return {
    projectCount: projects.length,
    assetCount: assets.length,
    templateCount: builtInTemplateCount + sharedTemplates.length,
    totalPageCount: projects.reduce((count, project) => count + project.pageCount, 0),
  }
}
