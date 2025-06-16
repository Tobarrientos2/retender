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
    metadata: v.optional(v.any()), // Para información de audio transcription
  }).index("by_user", ["userId"]),

  affirmations: defineTable({
    setId: v.id("affirmationSets"),
    userId: v.id("users"),
    content: v.string(),
    order: v.number(), // 1, 2, or 3
  }).index("by_set", ["setId"])
    .index("by_user", ["userId"]),

  // Sessions Intelligence System
  sessionCollections: defineTable({
    userId: v.id("users"),
    title: v.string(),
    sourceContent: v.string(),
    totalAffirmations: v.number(),
    totalSessions: v.number(),
    contentType: v.string(), // "general" | "programming"
  }).index("by_user", ["userId"]),

  sessions: defineTable({
    collectionId: v.id("sessionCollections"),
    userId: v.id("users"),
    sessionId: v.number(), // 1, 2, 3, etc.
    theme: v.string(),
  }).index("by_collection", ["collectionId"])
    .index("by_user", ["userId"]),

  sessionAffirmations: defineTable({
    sessionId: v.id("sessions"),
    collectionId: v.id("sessionCollections"),
    userId: v.id("users"),
    content: v.string(),
    order: v.number(), // 1, 2, 3
    subject: v.string(),
    timeframe: v.optional(v.string()),
    category: v.string(),
  }).index("by_session", ["sessionId"])
    .index("by_collection", ["collectionId"])
    .index("by_user", ["userId"]),

  studySessions: defineTable({
    userId: v.id("users"),
    setId: v.id("flashcardSets"),
    cardId: v.id("flashcards"),
    quality: v.number(), // 0-5 scale
    responseTime: v.number(),
  }).index("by_user", ["userId"])
    .index("by_set", ["setId"]),

  // Configuraciones de usuario para grabación de pantalla
  userSettings: defineTable({
    userId: v.id("users"),
    // Configuraciones de grabación
    silenceDuration: v.number(), // Duración en segundos para auto-stop
    soundThreshold: v.number(),  // Umbral para detectar sonido inicial
    silenceThreshold: v.number(), // Umbral para detectar silencio
    // Configuraciones adicionales
    autoTranscribe: v.boolean(),  // Auto-transcribir después de grabar
    preferredLanguage: v.string(), // Idioma preferido para transcripción
  }).index("by_user", ["userId"]),



};

export default defineSchema({
  ...authTables,
  ...applicationTables,
});
