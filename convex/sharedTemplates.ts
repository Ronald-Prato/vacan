import { v } from "convex/values"

import { mutation, query } from "./_generated/server"

function countTemplateElements(canvas: unknown) {
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
  args: {},
  handler: async (ctx) => {
    const templates = await ctx.db
      .query("sharedTemplates")
      .withIndex("by_createdAt")
      .order("desc")
      .take(50)

    return templates.map((template) => ({
      _id: template._id,
      name: template.name,
      description: template.description,
      authorName: template.authorName,
      pageCount: template.pageCount,
      elementCount: template.elementCount,
      createdAt: template.createdAt,
    }))
  },
})

export const get = query({
  args: {
    id: v.id("sharedTemplates"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id)
  },
})

export const create = mutation({
  args: {
    name: v.string(),
    description: v.string(),
    authorName: v.string(),
    canvas: v.any(),
  },
  handler: async (ctx, args) => {
    const counts = countTemplateElements(args.canvas)

    return await ctx.db.insert("sharedTemplates", {
      name: args.name,
      description: args.description,
      authorName: args.authorName,
      canvas: args.canvas,
      pageCount: counts.pageCount,
      elementCount: counts.elementCount,
      createdAt: Date.now(),
    })
  },
})
