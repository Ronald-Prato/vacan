import { v } from "convex/values"

import { mutation, query } from "./_generated/server"

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("projects").order("desc").collect()
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
