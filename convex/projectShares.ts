import { v } from "convex/values"

import { mutation, query } from "./_generated/server"

const accessValidator = v.union(v.literal("view"), v.literal("comment"), v.literal("edit"))

export const list = query({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("projectShares")
      .withIndex("by_projectId_and_createdAt", (q) => q.eq("projectId", args.projectId))
      .order("desc")
      .take(50)
  },
})

export const getByToken = query({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const share = await ctx.db
      .query("projectShares")
      .withIndex("by_token", (q) => q.eq("token", args.token.trim()))
      .first()

    if (!share || share.revokedAt !== undefined) {
      return null
    }

    const project = await ctx.db.get(share.projectId)

    if (!project) {
      return null
    }

    return {
      share,
      project,
    }
  },
})

export const create = mutation({
  args: {
    projectId: v.id("projects"),
    access: accessValidator,
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const token = args.token.trim()

    if (!token) {
      throw new Error("Share token is required")
    }

    const project = await ctx.db.get(args.projectId)

    if (!project) {
      throw new Error("Project not found")
    }

    const existingShare = await ctx.db
      .query("projectShares")
      .withIndex("by_token", (q) => q.eq("token", token))
      .first()

    if (existingShare) {
      throw new Error("Share token already exists")
    }

    return await ctx.db.insert("projectShares", {
      projectId: args.projectId,
      access: args.access,
      token,
      createdAt: Date.now(),
    })
  },
})

export const revoke = mutation({
  args: {
    id: v.id("projectShares"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      revokedAt: Date.now(),
    })
  },
})
