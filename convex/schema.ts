import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

const applicationTables = {
  affirmationSets: defineTable({
    userId: v.id("users"),
    title: v.string(),
    description: v.optional(v.string()),
    sourceContent: v.string(),
    totalAffirmations: v.number(),
  }).index("by_user", ["userId"]),

  affirmations: defineTable({
    setId: v.id("affirmationSets"),
    userId: v.id("users"),
    content: v.string(),
    order: v.number(), // 1, 2, or 3
  }).index("by_set", ["setId"])
    .index("by_user", ["userId"]),

  studySessions: defineTable({
    userId: v.id("users"),
    setId: v.id("flashcardSets"),
    cardId: v.id("flashcards"),
    quality: v.number(), // 0-5 scale
    responseTime: v.number(),
  }).index("by_user", ["userId"])
    .index("by_set", ["setId"]),


};

export default defineSchema({
  ...authTables,
  ...applicationTables,
});
