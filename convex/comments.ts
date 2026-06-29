import { v } from "convex/values"

import { mutation, query } from "./_generated/server"

export const list = query({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("comments")
      .withIndex("by_projectId_and_createdAt", (q) => q.eq("projectId", args.projectId))
      .order("desc")
      .take(100)
  },
})

export const create = mutation({
  args: {
    projectId: v.id("projects"),
    body: v.string(),
    authorName: v.string(),
    pageId: v.union(v.string(), v.null()),
    elementId: v.union(v.string(), v.null()),
  },
  handler: async (ctx, args) => {
    const body = args.body.trim()

    if (!body) {
      throw new Error("Comment body is required")
    }

    return await ctx.db.insert("comments", {
      projectId: args.projectId,
      body,
      authorName: args.authorName.trim() || "Colaborador",
      pageId: args.pageId,
      elementId: args.elementId,
      createdAt: Date.now(),
    })
  },
})
