import { v } from "convex/values";
import { query, mutation, action, internalMutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internal } from "./_generated/api";

interface SessionsResponse {
  totalAffirmations: number;
  sessions: Array<{
    sessionId: number;
    theme: string;
    affirmations: Array<{
      content: string;
      order: number;
      subject: string;
      timeframe?: string;
      category: string;
    }>;
  }>;
}

export const getUserSets = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    return await ctx.db
      .query("affirmationSets")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
  },
});

export const getSetWithAffirmations = query({
  args: { setId: v.id("affirmationSets") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const set = await ctx.db.get(args.setId);
    if (!set || set.userId !== userId) {
      throw new Error("Set not found or unauthorized");
    }

    const affirmations = await ctx.db
      .query("affirmations")
      .withIndex("by_set", (q) => q.eq("setId", args.setId))
      .order("asc")
      .collect();

    return { set, affirmations };
  },
});

export const createAffirmationSet = action({
  args: {
    title: v.string(),
    content: v.string(),
  },
  handler: async (ctx, args): Promise<string> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Generate affirmations using Gemini AI
    const affirmations: Array<{ content: string; order: number }> = await ctx.runAction(internal.ai.generateAffirmations, {
      content: args.content,
    });

    // Create the set
    const setId = await ctx.runMutation(internal.affirmations.createSet, {
      userId,
      title: args.title,
      content: args.content,
      totalAffirmations: affirmations.length,
    });

    // Create individual affirmations
    for (const affirmation of affirmations) {
      await ctx.runMutation(internal.affirmations.createAffirmation, {
        setId,
        userId,
        content: affirmation.content,
        order: affirmation.order,
      });
    }

    return setId;
  },
});

export const generateAntiAffirmations = action({
  args: {
    originalAffirmations: v.array(v.object({
      content: v.string(),
      order: v.number(),
    })),
  },
  handler: async (ctx, args): Promise<Array<{ content: string; order: number; errorType: string }>> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    return await ctx.runAction(internal.ai.generateAntiAffirmations, {
      originalAffirmations: args.originalAffirmations,
    });
  },
});

export const generateSessions = action({
  args: {
    content: v.string(),
    title: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{ collectionId: string; sessions: SessionsResponse }> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Generate sessions using AI
    const sessionsData: SessionsResponse = await ctx.runAction(internal.ai.generateSessions, {
      content: args.content,
    });

    // Save to database using mutation
    const collectionId = await ctx.runMutation(internal.affirmations.createSessionCollection, {
      userId,
      title: args.title || `Sessions from ${new Date().toLocaleDateString()}`,
      sourceContent: args.content,
      totalAffirmations: sessionsData.totalAffirmations,
      totalSessions: sessionsData.sessions.length,
      contentType: "general", // TODO: detect from AI response
      sessionsData,
    });

    return {
      collectionId,
      sessions: sessionsData,
    };
  },
});

export const createAffirmationsFromTranscription = action({
  args: {
    transcriptionText: v.string(),
    title: v.optional(v.string()),
    language: v.optional(v.string()),
    audioInfo: v.optional(v.object({
      duration: v.number(),
      processingTime: v.number(),
    })),
  },
  handler: async (ctx, args): Promise<string> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Validate content length
    if (args.transcriptionText.length < 50) {
      throw new Error("La transcripción es muy corta para generar afirmaciones de calidad");
    }

    // Generate affirmations using AI (using the existing generateAffirmations function)
    // Add language context to ensure Spanish generation
    const contentWithLanguageContext = `IDIOMA DETECTADO: ${args.language || 'español'}

CONTENIDO PARA ANALIZAR:
${args.transcriptionText}

NOTA: Genera todas las afirmaciones en español, independientemente del idioma del contenido original.`;

    const affirmations: Array<{ content: string; order: number }> = await ctx.runAction(internal.ai.generateAffirmations, {
      content: contentWithLanguageContext,
    });

    // Check if AI determined content is not valuable enough
    if (affirmations.length === 0) {
      throw new Error("La IA determinó que el contenido no contiene información suficientemente valiosa para generar afirmaciones de estudio. Intenta con contenido más específico y técnico.");
    }

    // Create the set with transcription-specific metadata
    const title = args.title || `Afirmaciones de Audio - ${new Date().toLocaleDateString()}`;

    const setId = await ctx.runMutation(internal.affirmations.createSet, {
      userId,
      title,
      content: args.transcriptionText,
      totalAffirmations: affirmations.length,
    });

    // Create individual affirmations
    for (const affirmation of affirmations) {
      await ctx.runMutation(internal.affirmations.createAffirmation, {
        setId,
        userId,
        content: affirmation.content,
        order: affirmation.order,
      });
    }

    return setId;
  },
});

export const analyzeImage = action({
  args: {
    imageBase64: v.string(),
    mimeType: v.string(),
  },
  handler: async (ctx, args): Promise<string> => {
    return await ctx.runAction(internal.ai.analyzeImage, {
      imageBase64: args.imageBase64,
      mimeType: args.mimeType,
    });
  },
});

export const initializeSampleData = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Check if user already has data
    const existingSets = await ctx.db
      .query("affirmationSets")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    if (existingSets.length === 0) {
      await ctx.runMutation(internal.sampleData.createSampleData, { userId });
    }
  },
});

export const createSet = internalMutation({
  args: {
    userId: v.id("users"),
    title: v.string(),
    content: v.string(),
    totalAffirmations: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("affirmationSets", {
      userId: args.userId,
      title: args.title,
      description: `Generated from ${args.content.length} characters of content`,
      sourceContent: args.content,
      totalAffirmations: args.totalAffirmations,
    });
  },
});



export const createAffirmation = internalMutation({
  args: {
    setId: v.id("affirmationSets"),
    userId: v.id("users"),
    content: v.string(),
    order: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("affirmations", {
      setId: args.setId,
      userId: args.userId,
      content: args.content,
      order: args.order,
    });
  },
});

// Session Collection Management
export const createSessionCollection = internalMutation({
  args: {
    userId: v.id("users"),
    title: v.string(),
    sourceContent: v.string(),
    totalAffirmations: v.number(),
    totalSessions: v.number(),
    contentType: v.string(),
    sessionsData: v.any(),
  },
  handler: async (ctx, args) => {
    // Create the collection
    const collectionId = await ctx.db.insert("sessionCollections", {
      userId: args.userId,
      title: args.title,
      sourceContent: args.sourceContent,
      totalAffirmations: args.totalAffirmations,
      totalSessions: args.totalSessions,
      contentType: args.contentType,
    });

    // Create individual sessions and their affirmations
    for (const sessionData of args.sessionsData.sessions) {
      const sessionId = await ctx.db.insert("sessions", {
        collectionId,
        userId: args.userId,
        sessionId: sessionData.sessionId,
        theme: sessionData.theme,
      });

      // Create affirmations for this session
      for (const affirmation of sessionData.affirmations) {
        await ctx.db.insert("sessionAffirmations", {
          sessionId,
          collectionId,
          userId: args.userId,
          content: affirmation.content,
          order: affirmation.order,
          subject: affirmation.subject,
          timeframe: affirmation.timeframe,
          category: affirmation.category,
        });
      }
    }

    return collectionId;
  },
});

// Query Functions for Sessions
export const getSessionCollections = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    return await ctx.db
      .query("sessionCollections")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
  },
});



export const getSessionCollection = query({
  args: { collectionId: v.id("sessionCollections") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const collection = await ctx.db.get(args.collectionId);
    if (!collection || collection.userId !== userId) {
      throw new Error("Collection not found");
    }

    // Get all sessions for this collection
    const sessions = await ctx.db
      .query("sessions")
      .withIndex("by_collection", (q) => q.eq("collectionId", args.collectionId))
      .collect();

    // Get affirmations for each session
    const sessionsWithAffirmations = await Promise.all(
      sessions.map(async (session) => {
        const affirmations = await ctx.db
          .query("sessionAffirmations")
          .withIndex("by_session", (q) => q.eq("sessionId", session._id))
          .collect();

        return {
          sessionId: session.sessionId,
          theme: session.theme,
          affirmations: affirmations
            .sort((a, b) => a.order - b.order)
            .map((aff) => ({
              content: aff.content,
              order: aff.order,
              subject: aff.subject,
              timeframe: aff.timeframe,
              category: aff.category,
            })),
        };
      })
    );

    return {
      collection,
      sessions: sessionsWithAffirmations.sort((a, b) => a.sessionId - b.sessionId),
      totalAffirmations: collection.totalAffirmations,
    };
  },
});

export const getSessionForPractice = query({
  args: {
    collectionId: v.id("sessionCollections"),
    sessionId: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Get the session
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_collection", (q) => q.eq("collectionId", args.collectionId))
      .filter((q) => q.eq(q.field("sessionId"), args.sessionId))
      .first();

    if (!session || session.userId !== userId) {
      throw new Error("Session not found");
    }

    // Get affirmations for this session
    const affirmations = await ctx.db
      .query("sessionAffirmations")
      .withIndex("by_session", (q) => q.eq("sessionId", session._id))
      .collect();

    return {
      sessionId: session.sessionId,
      theme: session.theme,
      affirmations: affirmations
        .sort((a, b) => a.order - b.order)
        .map((aff) => ({
          content: aff.content,
          order: aff.order,
          subject: aff.subject,
          timeframe: aff.timeframe,
          category: aff.category,
        })),
    };
  },
});

export const evaluateParaphrase = action({
  args: {
    originalText: v.string(),
    paraphraseText: v.string(),
  },
  handler: async (ctx, args): Promise<{
    isValid: boolean;
    feedback: string;
    score: number;
  }> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    return await ctx.runAction(internal.ai.evaluateParaphrase, {
      originalText: args.originalText,
      paraphraseText: args.paraphraseText,
    });
  },
});

export const evaluateExplanation = action({
  args: {
    originalText: v.string(),
    incorrectParaphrase: v.string(),
    userExplanation: v.string(),
  },
  handler: async (ctx, args): Promise<{
    isComplete: boolean;
    feedback: string;
    score: number;
    missedErrors: string[];
  }> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    return await ctx.runAction(internal.ai.evaluateExplanation, {
      originalText: args.originalText,
      incorrectParaphrase: args.incorrectParaphrase,
      userExplanation: args.userExplanation,
    });
  },
});

export const generateTermExplanations = action({
  args: {
    term: v.string(),
    context: v.string(),
  },
  handler: async (ctx, args): Promise<Array<{ content: string; order: number }>> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    return await ctx.runAction(internal.ai.generateTermExplanations, {
      term: args.term,
      context: args.context,
    });
  },
});
