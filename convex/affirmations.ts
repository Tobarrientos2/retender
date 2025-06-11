import { v } from "convex/values";
import { query, mutation, action, internalMutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internal } from "./_generated/api";

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
