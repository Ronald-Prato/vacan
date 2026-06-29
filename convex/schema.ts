import { defineSchema, defineTable } from "convex/server"
import { v } from "convex/values"

export default defineSchema({
  projects: defineTable({
    name: v.string(),
    canvas: v.any(),
    updatedAt: v.number(),
  }),
  projectVersions: defineTable({
    projectId: v.id("projects"),
    label: v.string(),
    canvas: v.any(),
    pageCount: v.number(),
    elementCount: v.number(),
    createdAt: v.number(),
  }).index("by_projectId_and_createdAt", ["projectId", "createdAt"]),
  projectShares: defineTable({
    projectId: v.id("projects"),
    access: v.union(v.literal("view"), v.literal("comment"), v.literal("edit")),
    token: v.string(),
    createdAt: v.number(),
    revokedAt: v.optional(v.number()),
  })
    .index("by_projectId_and_createdAt", ["projectId", "createdAt"])
    .index("by_token", ["token"]),
  assets: defineTable({
    name: v.string(),
    storageId: v.id("_storage"),
    contentType: v.optional(v.string()),
    size: v.optional(v.number()),
    updatedAt: v.number(),
  }).index("by_updatedAt", ["updatedAt"]),
  comments: defineTable({
    projectId: v.id("projects"),
    body: v.string(),
    authorName: v.string(),
    pageId: v.union(v.string(), v.null()),
    elementId: v.union(v.string(), v.null()),
    createdAt: v.number(),
  }).index("by_projectId_and_createdAt", ["projectId", "createdAt"]),
  sharedTemplates: defineTable({
    name: v.string(),
    description: v.string(),
    authorName: v.string(),
    canvas: v.any(),
    pageCount: v.number(),
    elementCount: v.number(),
    createdAt: v.number(),
  }).index("by_createdAt", ["createdAt"]),
})
