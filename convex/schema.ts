import { defineSchema, defineTable } from "convex/server"
import { v } from "convex/values"

export default defineSchema({
  projects: defineTable({
    name: v.string(),
    canvas: v.any(),
    updatedAt: v.number(),
  }),
})
