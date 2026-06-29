import { v } from "convex/values"

import { mutation, query } from "./_generated/server"

function countCanvasElements(canvas: unknown) {
  const candidate = canvas as { pages?: { elements?: unknown[] }[] } | null

  if (!candidate || !Array.isArray(candidate.pages)) {
    return {
      pageCount: 0,
      elementCount: 0,
    }
  }

  return {
    pageCount: candidate.pages.length,
    elementCount: candidate.pages.reduce(
      (count: number, page: { elements?: unknown[] }) =>
        count + (Array.isArray(page.elements) ? page.elements.length : 0),
      0,
    ),
  }
}

export const list = query({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    const versions = await ctx.db
      .query("projectVersions")
      .withIndex("by_projectId_and_createdAt", (q) => q.eq("projectId", args.projectId))
      .order("desc")
      .take(25)

    return versions.map((version) => ({
      _id: version._id,
      projectId: version.projectId,
      label: version.label,
      createdAt: version.createdAt,
      pageCount: version.pageCount,
      elementCount: version.elementCount,
    }))
  },
})

export const get = query({
  args: {
    id: v.id("projectVersions"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id)
  },
})

export const create = mutation({
  args: {
    projectId: v.id("projects"),
    label: v.string(),
    canvas: v.any(),
  },
  handler: async (ctx, args) => {
    const project = await ctx.db.get(args.projectId)

    if (!project) {
      throw new Error("Project not found")
    }

    const counts = countCanvasElements(args.canvas)

    return await ctx.db.insert("projectVersions", {
      projectId: args.projectId,
      label: args.label,
      canvas: args.canvas,
      pageCount: counts.pageCount,
      elementCount: counts.elementCount,
      createdAt: Date.now(),
    })
  },
})
