import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Id } from "./_generated/dataModel";

/**
 * Crear un nuevo job de transcripción
 */
export const createTranscriptionJob = mutation({
  args: {
    jobId: v.string(),
    fileName: v.optional(v.string()),
    fileSize: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("No autenticado");
    }

    const now = Date.now();

    const transcriptionJobId = await ctx.db.insert("transcriptionJobs", {
      userId,
      jobId: args.jobId,
      status: "pending",
      progress: 0,
      message: "Job creado, esperando procesamiento...",
      fileName: args.fileName,
      fileSize: args.fileSize,
      createdAt: now,
    });

    return transcriptionJobId;
  },
});

/**
 * Actualizar el progreso de un job de transcripción
 */
export const updateTranscriptionJobProgress = internalMutation({
  args: {
    jobId: v.string(),
    status: v.string(),
    progress: v.number(),
    message: v.string(),
    audioInfo: v.optional(v.any()),
    result: v.optional(v.any()),
    error: v.optional(v.string()),
    startedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    estimatedTimeRemaining: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const job = await ctx.db
      .query("transcriptionJobs")
      .withIndex("by_job_id", (q) => q.eq("jobId", args.jobId))
      .unique();

    if (!job) {
      throw new Error(`Job ${args.jobId} no encontrado`);
    }

    const updateData: any = {
      status: args.status,
      progress: args.progress,
      message: args.message,
    };

    if (args.audioInfo !== undefined) updateData.audioInfo = args.audioInfo;
    if (args.result !== undefined) updateData.result = args.result;
    if (args.error !== undefined) updateData.error = args.error;
    if (args.startedAt !== undefined) updateData.startedAt = args.startedAt;
    if (args.completedAt !== undefined) updateData.completedAt = args.completedAt;
    if (args.estimatedTimeRemaining !== undefined) updateData.estimatedTimeRemaining = args.estimatedTimeRemaining;

    await ctx.db.patch(job._id, updateData);

    return job._id;
  },
});

/**
 * Obtener todos los jobs de transcripción del usuario
 */
export const getUserTranscriptionJobs = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }

    const jobs = await ctx.db
      .query("transcriptionJobs")
      .withIndex("by_created_at", (q) => q.eq("userId", userId))
      .order("desc")
      .take(50); // Últimos 50 jobs

    return jobs;
  },
});

/**
 * Obtener un job específico por ID
 */
export const getTranscriptionJobById = query({
  args: { jobId: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }

    const job = await ctx.db
      .query("transcriptionJobs")
      .withIndex("by_job_id", (q) => q.eq("jobId", args.jobId))
      .unique();

    // Verificar que el job pertenece al usuario
    if (!job || job.userId !== userId) {
      return null;
    }

    return job;
  },
});

/**
 * Obtener jobs activos (en progreso)
 */
export const getActiveTranscriptionJobs = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }

    const activeJobs = await ctx.db
      .query("transcriptionJobs")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) =>
        q.or(
          q.eq(q.field("status"), "pending"),
          q.eq(q.field("status"), "processing")
        )
      )
      .collect();

    return activeJobs;
  },
});

/**
 * Cancelar un job de transcripción
 */
export const cancelTranscriptionJob = mutation({
  args: { jobId: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("No autenticado");
    }

    const job = await ctx.db
      .query("transcriptionJobs")
      .withIndex("by_job_id", (q) => q.eq("jobId", args.jobId))
      .unique();

    if (!job || job.userId !== userId) {
      throw new Error("Job no encontrado");
    }

    // Solo permitir cancelar jobs que estén pendientes o procesando
    if (job.status !== "pending" && job.status !== "processing") {
      throw new Error("No se puede cancelar un job que ya está completado o falló");
    }

    await ctx.db.patch(job._id, {
      status: "cancelled",
      message: "Job cancelado por el usuario",
      completedAt: Date.now(),
    });

    return job._id;
  },
});

/**
 * Actualizar job de transcripción desde la API Python (función interna)
 * Esta función es llamada por el HTTP endpoint para sincronizar estados
 */
export const updateTranscriptionJobFromAPI = internalMutation({
  args: {
    jobId: v.string(),
    status: v.string(),
    progress: v.number(),
    message: v.string(),
    result: v.optional(v.any()),
    error: v.optional(v.string()),
    startedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Buscar el job por jobId
    const job = await ctx.db
      .query("transcriptionJobs")
      .withIndex("by_job_id", (q) => q.eq("jobId", args.jobId))
      .unique();

    if (!job) {
      throw new Error(`Job ${args.jobId} no encontrado en Convex DB`);
    }

    // Preparar datos de actualización
    const updateData: any = {
      status: args.status,
      progress: args.progress,
      message: args.message,
    };

    // Agregar campos opcionales si están presentes
    if (args.result !== undefined) {
      updateData.result = args.result;
    }

    if (args.error !== undefined) {
      updateData.error = args.error;
    }

    if (args.startedAt !== undefined) {
      updateData.startedAt = args.startedAt;
    }

    if (args.completedAt !== undefined) {
      updateData.completedAt = args.completedAt;
    }

    // Actualizar el job en la base de datos
    await ctx.db.patch(job._id, updateData);

    console.log(`🔄 Job ${args.jobId} actualizado desde API: ${args.status} (${args.progress}%)`);

    return job._id;
  },
});

/**
 * Limpiar jobs huérfanos (jobs que están en pending pero no existen en la API)
 * Esta función se puede llamar manualmente para limpiar jobs desincronizados
 */
export const cleanupOrphanedJobs = mutation({
  args: {},
  handler: async (ctx) => {
    // Buscar jobs que están en pending por más de 1 hora (probablemente huérfanos)
    const oneHourAgo = Date.now() - (60 * 60 * 1000);

    const orphanedJobs = await ctx.db
      .query("transcriptionJobs")
      .filter((q) =>
        q.and(
          q.eq(q.field("status"), "pending"),
          q.lt(q.field("createdAt"), oneHourAgo)
        )
      )
      .collect();

    for (const job of orphanedJobs) {
      await ctx.db.delete(job._id);
    }

    console.log(`🧹 Limpiados ${orphanedJobs.length} jobs huérfanos`);
    return orphanedJobs.length;
  },
});

/**
 * Limpiar jobs antiguos (más de 7 días)
 */
export const cleanupOldTranscriptionJobs = internalMutation({
  args: {},
  handler: async (ctx) => {
    const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);

    const oldJobs = await ctx.db
      .query("transcriptionJobs")
      .filter((q) => q.lt(q.field("createdAt"), sevenDaysAgo))
      .collect();

    for (const job of oldJobs) {
      await ctx.db.delete(job._id);
    }

    return oldJobs.length;
  },
});

/**
 * Obtener estadísticas de transcripciones del usuario
 */
export const getTranscriptionStats = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }

    const allJobs = await ctx.db
      .query("transcriptionJobs")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const stats = {
      total: allJobs.length,
      completed: allJobs.filter(job => job.status === "completed").length,
      failed: allJobs.filter(job => job.status === "failed").length,
      cancelled: allJobs.filter(job => job.status === "cancelled").length,
      active: allJobs.filter(job => job.status === "pending" || job.status === "processing").length,
      totalProcessingTime: allJobs
        .filter(job => job.startedAt && job.completedAt)
        .reduce((sum, job) => sum + (job.completedAt! - job.startedAt!), 0),
    };

    return stats;
  },
});
