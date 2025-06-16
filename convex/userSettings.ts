import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

// Configuraciones por defecto
const DEFAULT_SETTINGS = {
  silenceDuration: 3, // 3 segundos
  soundThreshold: 8,  // Umbral para detectar sonido inicial
  silenceThreshold: 5, // Umbral para detectar silencio
  autoTranscribe: true, // Auto-transcribir por defecto
  preferredLanguage: "auto", // Detección automática de idioma
};

/**
 * Obtener configuraciones del usuario
 */
export const getUserSettings = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return DEFAULT_SETTINGS;

    const settings = await ctx.db
      .query("userSettings")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();

    // Si no existen configuraciones, devolver las por defecto
    if (!settings) {
      return DEFAULT_SETTINGS;
    }

    return {
      silenceDuration: settings.silenceDuration,
      soundThreshold: settings.soundThreshold,
      silenceThreshold: settings.silenceThreshold,
      autoTranscribe: settings.autoTranscribe,
      preferredLanguage: settings.preferredLanguage,
    };
  },
});

/**
 * Actualizar configuraciones del usuario
 */
export const updateUserSettings = mutation({
  args: {
    silenceDuration: v.optional(v.number()),
    soundThreshold: v.optional(v.number()),
    silenceThreshold: v.optional(v.number()),
    autoTranscribe: v.optional(v.boolean()),
    preferredLanguage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Buscar configuraciones existentes
    const existingSettings = await ctx.db
      .query("userSettings")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();

    // Validar valores
    if (args.silenceDuration !== undefined && (args.silenceDuration < 1 || args.silenceDuration > 900)) {
      throw new Error("La duración de silencio debe estar entre 1 segundo y 15 minutos (900 segundos)");
    }
    if (args.soundThreshold !== undefined && (args.soundThreshold < 1 || args.soundThreshold > 100)) {
      throw new Error("El umbral de sonido debe estar entre 1 y 100");
    }
    if (args.silenceThreshold !== undefined && (args.silenceThreshold < 1 || args.silenceThreshold > 100)) {
      throw new Error("El umbral de silencio debe estar entre 1 y 100");
    }

    if (existingSettings) {
      // Actualizar configuraciones existentes
      await ctx.db.patch(existingSettings._id, {
        ...(args.silenceDuration !== undefined && { silenceDuration: args.silenceDuration }),
        ...(args.soundThreshold !== undefined && { soundThreshold: args.soundThreshold }),
        ...(args.silenceThreshold !== undefined && { silenceThreshold: args.silenceThreshold }),
        ...(args.autoTranscribe !== undefined && { autoTranscribe: args.autoTranscribe }),
        ...(args.preferredLanguage !== undefined && { preferredLanguage: args.preferredLanguage }),
      });
      return existingSettings._id;
    } else {
      // Crear nuevas configuraciones
      return await ctx.db.insert("userSettings", {
        userId,
        silenceDuration: args.silenceDuration ?? DEFAULT_SETTINGS.silenceDuration,
        soundThreshold: args.soundThreshold ?? DEFAULT_SETTINGS.soundThreshold,
        silenceThreshold: args.silenceThreshold ?? DEFAULT_SETTINGS.silenceThreshold,
        autoTranscribe: args.autoTranscribe ?? DEFAULT_SETTINGS.autoTranscribe,
        preferredLanguage: args.preferredLanguage ?? DEFAULT_SETTINGS.preferredLanguage,
      });
    }
  },
});

/**
 * Resetear configuraciones a valores por defecto
 */
export const resetUserSettings = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const existingSettings = await ctx.db
      .query("userSettings")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();

    if (existingSettings) {
      await ctx.db.patch(existingSettings._id, DEFAULT_SETTINGS);
      return existingSettings._id;
    } else {
      return await ctx.db.insert("userSettings", {
        userId,
        ...DEFAULT_SETTINGS,
      });
    }
  },
});
