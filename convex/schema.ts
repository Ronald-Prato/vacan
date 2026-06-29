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
})
