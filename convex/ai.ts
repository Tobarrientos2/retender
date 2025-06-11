"use node";

import { action, internalAction } from "./_generated/server";
import { v } from "convex/values";

export const generateFlashcards = internalAction({
  args: {
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is required");
    }

    const prompt = `
Analyze the following content and create high-quality flashcards for studying. 
Create between 10-20 flashcards that cover the most important concepts, facts, and details.

Guidelines:
- Front: Clear, concise question or prompt
- Back: Comprehensive but focused answer
- Cover key concepts, definitions, facts, and relationships
- Vary question types (what, how, why, when, where)
- Make questions specific and testable
- Ensure answers are complete but not too lengthy

Content to analyze:
${args.content}

Respond with a JSON array of flashcards in this exact format:
[
  {
    "front": "Question or prompt here",
    "back": "Answer here"
  }
]

Only return the JSON array, no other text.`;

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: prompt,
                  },
                ],
              },
            ],
            generationConfig: {
              temperature: 0.7,
              topK: 40,
              topP: 0.95,
              maxOutputTokens: 8192,
            },
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.status}`);
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!text) {
        throw new Error("No response from Gemini API");
      }

      // Extract JSON from the response
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error("Could not extract JSON from response");
      }

      const flashcards = JSON.parse(jsonMatch[0]);
      
      // Validate the structure
      if (!Array.isArray(flashcards)) {
        throw new Error("Response is not an array");
      }

      for (const card of flashcards) {
        if (!card.front || !card.back || typeof card.front !== 'string' || typeof card.back !== 'string') {
          throw new Error("Invalid flashcard structure");
        }
      }

      return flashcards;
    } catch (error) {
      console.error("Error generating flashcards:", error);
      const message = error instanceof Error ? error.message : "Unknown error";
      throw new Error(`Failed to generate flashcards: ${message}`);
    }
  },
});

// Function to detect content type
function detectContentType(content: string): 'programming' | 'general' {
  const programmingKeywords = [
    'function', 'class', 'const', 'let', 'var', 'import', 'export', 'return',
    'if', 'else', 'for', 'while', 'try', 'catch', 'async', 'await',
    'javascript', 'python', 'java', 'react', 'node', 'typescript', 'html', 'css',
    'api', 'database', 'sql', 'json', 'array', 'object', 'method', 'property',
    'component', 'hook', 'state', 'props', 'render', 'useState', 'useEffect',
    '()', '{}', '[]', '=>', '===', '!==', '&&', '||', 'console.log', 'document.',
    'window.', '.map(', '.filter(', '.reduce(', '.forEach(', 'getElementById',
    'querySelector', 'addEventListener', 'fetch(', 'axios', 'express', 'app.',
    'router.', 'middleware', 'schema', 'model', 'controller', 'service'
  ];

  const lowerContent = content.toLowerCase();

  // Count programming keywords
  const programmingMatches = programmingKeywords.filter(keyword =>
    lowerContent.includes(keyword.toLowerCase())
  ).length;

  // Additional check: look for code patterns
  const codePatterns = [
    /\bfunction\s+\w+\s*\(/,
    /\bconst\s+\w+\s*=/,
    /\blet\s+\w+\s*=/,
    /\bvar\s+\w+\s*=/,
    /\bimport\s+.*\bfrom\b/,
    /\bexport\s+(default\s+)?/,
    /\w+\.\w+\(/,
    /=>\s*{/,
    /\w+\[\w*\]/,
    /console\.log\(/
  ];

  const codePatternMatches = codePatterns.filter(pattern =>
    pattern.test(content)
  ).length;

  // Require both keywords AND code patterns for programming detection
  const isProgramming = programmingMatches >= 5 && codePatternMatches >= 2;

  return isProgramming ? 'programming' : 'general';
}

// Function to generate specialized prompts
function generatePrompt(content: string, contentType: 'programming' | 'general'): string {
  const baseInstructions = `
You must carefully analyze the following content and create exactly 3 powerful, insightful affirmations that are SPECIFICALLY about the material provided.

IMPORTANT: Your affirmations must be based on the SPECIFIC details, facts, concepts, and information contained in the content below. Do NOT create generic statements.

Content to analyze:
${content}

REQUIREMENTS:
- Read and understand the ENTIRE content above
- Extract SPECIFIC facts, concepts, names, dates, places, or technical details
- Create affirmations that demonstrate you understood the specific content
- Include specific terminology, names, or concepts from the material
- Avoid generic statements that could apply to any content

Respond with a JSON array of exactly 3 affirmations in this exact format:
[
  {
    "content": "First affirmation with SPECIFIC details from the content",
    "order": 1
  },
  {
    "content": "Second affirmation with SPECIFIC details from the content",
    "order": 2
  },
  {
    "content": "Third affirmation with SPECIFIC details from the content",
    "order": 3
  }
]

Only return the JSON array, no other text.`;

  if (contentType === 'programming') {
    return `${baseInstructions}

PROGRAMMING CONTENT RULES:
- Each affirmation must be maximum 15 words for the main statement
- You can add up to 30 additional words of code syntax/examples after the main statement
- Include SPECIFIC code snippets, function names, or syntax examples FROM THE CONTENT
- Focus on the SPECIFIC programming concepts, libraries, or technologies mentioned
- Use the EXACT technical terminology from the provided content
- Write in OBJECTIVE, THIRD-PERSON language (NO "I" statements)
- Format: "Specific concept from content (max 15 words) + relevant code example (max 30 words)"

EXAMPLES of SPECIFIC programming affirmations:
- "React useState hook manages component state efficiently. const [count, setCount] = useState(0) initializes state variables."
- "Express middleware processes requests sequentially. app.use((req, res, next) => { next(); }) enables request handling."

AVOID generic programming statements - use SPECIFIC details from the content provided.`;
  } else {
    return `${baseInstructions}

GENERAL CONTENT RULES:
- Each affirmation must be maximum 15 words
- Be concise, impactful, and memorable
- Include SPECIFIC names, dates, places, or facts FROM THE CONTENT
- Use EXACT terminology and proper nouns from the provided material
- Write in OBJECTIVE, THIRD-PERSON language (NO "I" statements)
- Focus on the SPECIFIC insights, facts, and principles mentioned in the content
- No code or technical syntax needed

EXAMPLES of SPECIFIC general affirmations:
- "Chile extends 4,300 kilometers from north to south, making it the world's longest country."
- "The French Revolution began in 1789 with the financial crisis and Estates-General convocation."
- "Santiago serves as Chile's capital and most populous city in South America."

AVOID generic statements - use SPECIFIC details, names, dates, and facts from the content provided.`;
  }
}

export const generateAffirmations = internalAction({
  args: {
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is required");
    }

    // Detect content type and generate appropriate prompt
    const contentType = detectContentType(args.content);
    const prompt = generatePrompt(args.content, contentType);

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: prompt,
                  },
                ],
              },
            ],
            generationConfig: {
              temperature: 0.7,
              topK: 40,
              topP: 0.95,
              maxOutputTokens: 8192,
            },
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.status}`);
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!text) {
        throw new Error("No response from Gemini API");
      }

      // Extract JSON from the response
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error("Could not extract JSON from response");
      }

      const affirmations = JSON.parse(jsonMatch[0]);

      // Validate the structure
      if (!Array.isArray(affirmations) || affirmations.length !== 3) {
        throw new Error("Must generate exactly 3 affirmations");
      }

      for (const affirmation of affirmations) {
        if (!affirmation.content || !affirmation.order ||
            typeof affirmation.content !== 'string' ||
            typeof affirmation.order !== 'number' ||
            affirmation.order < 1 || affirmation.order > 3) {
          throw new Error("Invalid affirmation structure");
        }
      }

      return affirmations;
    } catch (error) {
      console.error("Error generating affirmations:", error);
      const message = error instanceof Error ? error.message : "Unknown error";
      throw new Error(`Failed to generate affirmations: ${message}`);
    }
  },
});

export const generateAntiAffirmations = internalAction({
  args: {
    originalAffirmations: v.array(v.object({
      content: v.string(),
      order: v.number(),
    })),
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is required");
    }

    const affirmationsText = args.originalAffirmations
      .map(aff => `${aff.order}. "${aff.content}"`)
      .join('\n');

    const prompt = `
You are tasked with creating subtle, deceptive anti-affirmations based on the following TRUE affirmations.

ORIGINAL TRUE AFFIRMATIONS:
${affirmationsText}

INSTRUCTIONS:
- Create exactly 3 anti-affirmations that look almost identical to the originals
- Make SUBTLE changes that make each statement factually incorrect
- The errors should be difficult to detect at first glance
- Maintain the same structure, length, and technical terminology
- Keep the same professional tone and formatting
- Changes can include: wrong function names, incorrect concepts, reversed logic, false facts

EXAMPLES of subtle changes:
- "useState()" → "useStatus()" (wrong function name)
- "manages state" → "manages props" (wrong concept)
- "1789" → "1879" (wrong date)
- "increases" → "decreases" (reversed logic)

Respond with a JSON array of exactly 3 anti-affirmations in this exact format:
[
  {
    "content": "First anti-affirmation with subtle error",
    "order": 1,
    "errorType": "Brief description of what was changed"
  },
  {
    "content": "Second anti-affirmation with subtle error",
    "order": 2,
    "errorType": "Brief description of what was changed"
  },
  {
    "content": "Third anti-affirmation with subtle error",
    "order": 3,
    "errorType": "Brief description of what was changed"
  }
]

Only return the JSON array, no other text.`;

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: prompt,
                  },
                ],
              },
            ],
            generationConfig: {
              temperature: 0.8,
              topK: 40,
              topP: 0.95,
              maxOutputTokens: 8192,
            },
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.status}`);
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!text) {
        throw new Error("No response from Gemini API");
      }

      // Extract JSON from the response
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error("Could not extract JSON from response");
      }

      const antiAffirmations = JSON.parse(jsonMatch[0]);

      // Validate the structure
      if (!Array.isArray(antiAffirmations) || antiAffirmations.length !== 3) {
        throw new Error("Must generate exactly 3 anti-affirmations");
      }

      for (const antiAff of antiAffirmations) {
        if (!antiAff.content || !antiAff.order || !antiAff.errorType ||
            typeof antiAff.content !== 'string' ||
            typeof antiAff.order !== 'number' ||
            typeof antiAff.errorType !== 'string' ||
            antiAff.order < 1 || antiAff.order > 3) {
          throw new Error("Invalid anti-affirmation structure");
        }
      }

      return antiAffirmations;
    } catch (error) {
      console.error("Error generating anti-affirmations:", error);
      const message = error instanceof Error ? error.message : "Unknown error";
      throw new Error(`Failed to generate anti-affirmations: ${message}`);
    }
  },
});

export const generateSessions = internalAction({
  args: {
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is required");
    }

    const prompt = `
You are an advanced content analyzer that extracts multiple affirmations from text and intelligently groups them into coherent sessions.

TASK: Analyze the following content and create multiple sessions, each containing exactly 3 related affirmations.

Content to analyze:
${args.content}

INSTRUCTIONS:
1. EXTRACT MULTIPLE AFFIRMATIONS: Find all possible factual statements, concepts, dates, events, processes, etc.
2. ANALYZE RELATIONSHIPS: Group affirmations by:
   - Subject/Topic (same person, place, concept)
   - Temporal relationships (same time period, sequential events)
   - Causal relationships (cause and effect)
   - Thematic connections (same domain, related concepts)
   - Grammatical subjects (same entities being discussed)

3. CREATE SESSIONS: Group exactly 3 related affirmations per session
4. ENSURE COHERENCE: Each session should tell a "mini-story" or explore a specific aspect
5. MAXIMIZE COVERAGE: Extract as many meaningful affirmations as possible from the content

EXAMPLES of good session grouping:

SESSION 1 (Temporal sequence):
- "The bicycle was invented in 1817 by Baron von Drais"
- "The first commercial bicycle was sold in 1819 in London"
- "By 1825, bicycle manufacturing had spread across Europe"

SESSION 2 (Same subject - technical aspects):
- "Early bicycles had wooden wheels without pedals"
- "The pedal mechanism was added to bicycles in 1861"
- "Pneumatic tires revolutionized bicycle comfort in 1888"

SESSION 3 (Same subject - social impact):
- "Bicycles provided new mobility for working-class people"
- "The bicycle industry created thousands of manufacturing jobs"
- "Cycling became a popular recreational activity by 1890"

RESPONSE FORMAT:
Return a JSON object with this exact structure:
{
  "totalAffirmations": number,
  "sessions": [
    {
      "sessionId": 1,
      "theme": "Brief description of the session theme",
      "affirmations": [
        {
          "content": "First affirmation (max 15 words)",
          "order": 1,
          "subject": "Main grammatical subject",
          "timeframe": "Time period if applicable",
          "category": "Type of information (fact/event/process/concept)"
        },
        {
          "content": "Second affirmation (max 15 words)",
          "order": 2,
          "subject": "Main grammatical subject",
          "timeframe": "Time period if applicable",
          "category": "Type of information"
        },
        {
          "content": "Third affirmation (max 15 words)",
          "order": 3,
          "subject": "Main grammatical subject",
          "timeframe": "Time period if applicable",
          "category": "Type of information"
        }
      ]
    }
  ]
}

REQUIREMENTS:
- Each affirmation must be maximum 15 words
- Extract as many sessions as possible from the content
- Ensure each session has thematic coherence
- Use SPECIFIC details from the provided content
- Include subject, timeframe, and category analysis
- Write in OBJECTIVE, THIRD-PERSON language

Only return the JSON object, no other text.`;

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: prompt,
                  },
                ],
              },
            ],
            generationConfig: {
              temperature: 0.7,
              topK: 40,
              topP: 0.95,
              maxOutputTokens: 8192,
            },
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.status}`);
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!text) {
        throw new Error("No response from Gemini API");
      }

      // Extract JSON from the response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("Could not extract JSON from response");
      }

      const sessions = JSON.parse(jsonMatch[0]);

      // Validate the structure
      if (!sessions.sessions || !Array.isArray(sessions.sessions)) {
        throw new Error("Invalid sessions structure");
      }

      for (const session of sessions.sessions) {
        if (!session.affirmations || !Array.isArray(session.affirmations) ||
            session.affirmations.length !== 3) {
          throw new Error("Each session must have exactly 3 affirmations");
        }

        for (const affirmation of session.affirmations) {
          if (!affirmation.content || !affirmation.order || !affirmation.subject ||
              typeof affirmation.content !== 'string' ||
              typeof affirmation.order !== 'number' ||
              typeof affirmation.subject !== 'string' ||
              affirmation.order < 1 || affirmation.order > 3) {
            throw new Error("Invalid affirmation structure in session");
          }
        }
      }

      return sessions;
    } catch (error) {
      console.error("Error generating sessions:", error);
      const message = error instanceof Error ? error.message : "Unknown error";
      throw new Error(`Failed to generate sessions: ${message}`);
    }
  },
});

export const analyzeImage = internalAction({
  args: {
    imageBase64: v.string(),
    mimeType: v.string(),
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is required");
    }

    const prompt = `
Analyze this image and extract all text content, including:
- Any written text, notes, or documents
- Diagrams with labels and explanations
- Charts, graphs, or tables with data
- Mathematical formulas or equations
- Any other educational content

Please provide a comprehensive transcription of all visible text and describe any visual elements that contain educational information. Format the output as clear, readable text that can be used to generate flashcards.

If the image contains educational diagrams or visual concepts, describe them in detail so they can be converted into effective study questions.
`;

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: prompt,
                  },
                  {
                    inline_data: {
                      mime_type: args.mimeType,
                      data: args.imageBase64,
                    },
                  },
                ],
              },
            ],
            generationConfig: {
              temperature: 0.3,
              topK: 32,
              topP: 0.95,
              maxOutputTokens: 8192,
            },
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.status}`);
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!text) {
        throw new Error("No response from Gemini API");
      }

      return text;
    } catch (error) {
      console.error("Error analyzing image:", error);
      const message = error instanceof Error ? error.message : "Unknown error";
      throw new Error(`Failed to analyze image: ${message}`);
    }
  },
});
