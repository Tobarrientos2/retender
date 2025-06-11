import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

export const createSampleData = internalMutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    // Create sample affirmation sets
    const mathSetId = await ctx.db.insert("affirmationSets", {
      userId: args.userId,
      title: "Calculus Fundamentals",
      description: "Generated from 1,250 characters of content",
      sourceContent: "Calculus is the mathematical study of continuous change. It has two major branches: differential calculus and integral calculus. Differential calculus concerns instantaneous rates of change and slopes of curves. Integral calculus concerns accumulation of quantities and areas under curves.",
      totalAffirmations: 3,
    });

    const physicsSetId = await ctx.db.insert("affirmationSets", {
      userId: args.userId,
      title: "Quantum Physics Basics",
      description: "Generated from 980 characters of content",
      sourceContent: "Quantum physics is the branch of physics that deals with the behavior of matter and energy at the molecular, atomic, nuclear, and even smaller microscopic levels.",
      totalAffirmations: 3,
    });

    const historySetId = await ctx.db.insert("affirmationSets", {
      userId: args.userId,
      title: "World War II Timeline",
      description: "Generated from 1,500 characters of content",
      sourceContent: "World War II was a global war that lasted from 1939 to 1945. It involved the vast majority of the world's countries forming two opposing military alliances.",
      totalAffirmations: 3,
    });

    // Create sample affirmations for Calculus
    const calcAffirmations = [
      { content: "Calculus is the mathematical study of continuous change, providing powerful tools to analyze rates of change and accumulation.", order: 1 },
      { content: "Differential calculus focuses on instantaneous rates of change and slopes of curves, while integral calculus deals with accumulation of quantities and areas under curves.", order: 2 },
      { content: "The two major branches of calculus work together to solve complex problems involving motion, optimization, and area calculations.", order: 3 },
    ];

    for (const affirmation of calcAffirmations) {
      await ctx.db.insert("affirmations", {
        setId: mathSetId,
        userId: args.userId,
        content: affirmation.content,
        order: affirmation.order,
      });
    }

    // Create sample affirmations for Physics
    const physicsAffirmations = [
      { content: "Quantum physics reveals the fundamental behavior of matter and energy at the molecular, atomic, and subatomic levels.", order: 1 },
      { content: "The quantum world operates on principles that challenge our everyday understanding, including wave-particle duality and uncertainty.", order: 2 },
      { content: "Quantum mechanics provides the theoretical foundation for understanding phenomena like superposition, entanglement, and quantum tunneling.", order: 3 },
    ];

    for (const affirmation of physicsAffirmations) {
      await ctx.db.insert("affirmations", {
        setId: physicsSetId,
        userId: args.userId,
        content: affirmation.content,
        order: affirmation.order,
      });
    }

    // Create sample affirmations for History
    const historyAffirmations = [
      { content: "World War II was a global conflict that lasted from 1939 to 1945, involving the vast majority of the world's countries in two opposing military alliances.", order: 1 },
      { content: "The war fundamentally changed the global political landscape, leading to the emergence of the United States and Soviet Union as superpowers.", order: 2 },
      { content: "WWII demonstrated both the devastating potential of modern warfare and the importance of international cooperation in maintaining peace.", order: 3 },
    ];

    for (const affirmation of historyAffirmations) {
      await ctx.db.insert("affirmations", {
        setId: historySetId,
        userId: args.userId,
        content: affirmation.content,
        order: affirmation.order,
      });
    }

    return { mathSetId, physicsSetId, historySetId };
  },
});
