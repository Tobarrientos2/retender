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
    createdAt: v.optional(v.number()), // Timestamp de creación
    transcriptionJobId: v.optional(v.string()), // ID del job de transcripción
  }).index("by_user", ["userId"])
    .index("by_created_at", ["userId", "createdAt"]),

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
    createdAt: v.optional(v.number()), // Timestamp de creación
    transcriptionJobId: v.optional(v.string()), // ID del job de transcripción
  }).index("by_user", ["userId"])
    .index("by_created_at", ["userId", "createdAt"]),

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

  // Jobs de transcripción en background
  transcriptionJobs: defineTable({
    userId: v.id("users"),
    jobId: v.string(), // ID del job en la API
    status: v.string(), // "pending", "processing", "completed", "failed", "cancelled"
    progress: v.number(), // 0-100
    message: v.string(), // Mensaje de estado
    fileName: v.optional(v.string()), // Nombre del archivo original
    fileSize: v.optional(v.number()), // Tamaño del archivo en bytes
    audioInfo: v.optional(v.any()), // Información del audio
    result: v.optional(v.any()), // Resultado de la transcripción
    error: v.optional(v.string()), // Error si falló
    createdAt: v.number(), // Timestamp de creación
    startedAt: v.optional(v.number()), // Timestamp de inicio
    completedAt: v.optional(v.number()), // Timestamp de finalización
    estimatedTimeRemaining: v.optional(v.number()), // Tiempo estimado restante
  }).index("by_user", ["userId"])
    .index("by_job_id", ["jobId"])
    .index("by_status", ["userId", "status"])
    .index("by_created_at", ["userId", "createdAt"]),



};

export default defineSchema({
  ...authTables,
  ...applicationTables,
});
