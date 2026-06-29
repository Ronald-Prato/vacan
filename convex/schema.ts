import { defineSchema, defineTable } from "convex/server"
import { v } from "convex/values"

export default defineSchema({
  projects: defineTable({
    name: v.string(),
    canvas: v.any(),
    updatedAt: v.number(),
  }),
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
})
