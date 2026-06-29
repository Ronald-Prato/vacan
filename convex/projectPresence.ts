import { v } from "convex/values"

import { mutation, query } from "./_generated/server"

const ACTIVE_TTL_MS = 45_000

export const list = query({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    const activeSince = Date.now() - ACTIVE_TTL_MS
    const records = await ctx.db
      .query("projectPresence")
      .withIndex("by_projectId_and_updatedAt", (q) => q.eq("projectId", args.projectId))
      .order("desc")
      .take(50)

    return records.filter((record) => record.updatedAt >= activeSince)
  },
})

export const heartbeat = mutation({
  args: {
    projectId: v.id("projects"),
    clientId: v.string(),
    displayName: v.string(),
    color: v.string(),
    pageId: v.union(v.string(), v.null()),
    selectedElementName: v.union(v.string(), v.null()),
  },
  handler: async (ctx, args) => {
    const displayName = args.displayName.trim() || "Colaborador"
    const now = Date.now()
    const existingPresence = await ctx.db
      .query("projectPresence")
      .withIndex("by_projectId_and_clientId", (q) =>
        q.eq("projectId", args.projectId).eq("clientId", args.clientId),
      )
      .first()

    if (existingPresence) {
      await ctx.db.patch(existingPresence._id, {
        displayName,
        color: args.color,
        pageId: args.pageId,
        selectedElementName: args.selectedElementName,
        updatedAt: now,
      })
      return existingPresence._id
    }

    return await ctx.db.insert("projectPresence", {
      projectId: args.projectId,
      clientId: args.clientId,
      displayName,
      color: args.color,
      pageId: args.pageId,
      selectedElementName: args.selectedElementName,
      updatedAt: now,
    })
  },
})

export const leave = mutation({
  args: {
    projectId: v.id("projects"),
    clientId: v.string(),
  },
  handler: async (ctx, args) => {
    const existingPresence = await ctx.db
      .query("projectPresence")
      .withIndex("by_projectId_and_clientId", (q) =>
        q.eq("projectId", args.projectId).eq("clientId", args.clientId),
      )
      .first()

    if (existingPresence) {
      await ctx.db.delete(existingPresence._id)
    }
  },
})
