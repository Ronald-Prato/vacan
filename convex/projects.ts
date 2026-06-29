import { v } from "convex/values"

import { mutation, query } from "./_generated/server"

export const list = query({
  args: {},
  handler: async (ctx) => {
    const projects = await ctx.db.query("projects").order("desc").take(50)

    return projects.map((project) => ({
      _id: project._id,
      name: project.name,
      updatedAt: project.updatedAt,
      pageCount: Array.isArray(project.canvas?.pages) ? project.canvas.pages.length : 0,
      elementCount: Array.isArray(project.canvas?.pages)
        ? project.canvas.pages.reduce(
            (count: number, page: { elements?: unknown[] }) =>
              count + (Array.isArray(page.elements) ? page.elements.length : 0),
            0,
          )
        : 0,
    }))
  },
})

export const get = query({
  args: {
    id: v.id("projects"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id)
  },
})

export const create = mutation({
  args: {
    name: v.string(),
    canvas: v.any(),
  },
  handler: async (ctx, args) => {
    const now = Date.now()

    return await ctx.db.insert("projects", {
      name: args.name,
      canvas: args.canvas,
      updatedAt: now,
    })
  },
})

export const updateCanvas = mutation({
  args: {
    id: v.id("projects"),
    name: v.string(),
    canvas: v.any(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      name: args.name,
      canvas: args.canvas,
      updatedAt: Date.now(),
    })
  },
})
