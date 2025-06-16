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

// Function to generate intelligent filtered prompts
function generateIntelligentPrompt(content: string, contentType: 'programming' | 'general'): string {
  const baseInstructions = `
ANÁLISIS INTELIGENTE DE CONTENIDO EDUCATIVO

Contenido a analizar:
${content}

MISIÓN: Identificar y extraer ÚNICAMENTE información valiosa que vale la pena memorizar.

CRITERIOS DE FILTRADO INTELIGENTE:

✅ SÍ GENERAR AFIRMACIONES PARA:
- Datos específicos, números, porcentajes, estadísticas
- Procesos técnicos no obvios
- Mejores prácticas específicas
- Información que se puede olvidar fácilmente
- Conocimiento especializado del tema
- Detalles técnicos importantes
- Configuraciones específicas
- Fórmulas, cálculos, métricas
- Fechas, nombres específicos, eventos importantes

❌ NO GENERAR AFIRMACIONES PARA:
- Conocimiento general obvio
- Información que "todo el mundo sabe"
- Conceptos básicos universales
- Pasos obvios o lógicos
- Información superficial
- Generalidades sin valor específico
- Consejos de sentido común
- Saludos, conversaciones casuales

PROCESO DE ANÁLISIS:
1. Lee todo el contenido cuidadosamente
2. Identifica información ESPECÍFICA y TÉCNICA
3. Filtra conocimiento obvio o general
4. Evalúa si cada dato es "memorizable" vs "obvio"
5. Decide cuántos grupos generar (0-4) basándose en contenido valioso

IMPORTANTE: Genera TODAS las afirmaciones en ESPAÑOL (español). No uses inglés.`;

  if (contentType === 'programming') {
    return `${baseInstructions}

REGLAS ESPECÍFICAS PARA CONTENIDO DE PROGRAMACIÓN:

✅ MEMORIZABLE en programación:
- Sintaxis específica de funciones, métodos, APIs
- Configuraciones técnicas no obvias
- Parámetros específicos y sus valores
- Mejores prácticas técnicas específicas
- Versiones, compatibilidades, limitaciones
- Algoritmos, complejidades, optimizaciones
- Errores comunes y sus soluciones específicas

❌ OBVIO en programación:
- "Necesitas instalar Node.js" (obvio)
- "Guarda el archivo" (obvio)
- "Usa un editor de código" (obvio)
- "Es importante comentar el código" (general)

EJEMPLOS DE FILTRADO EN PROGRAMACIÓN:

Contenido: "Instala Node.js. React useState retorna array con [state, setState]. Guarda el archivo como .jsx"
✅ Memorizable: "React useState retorna un array con [state, setState] para manejar estado local"
❌ Obvio: "Instala Node.js", "Guarda el archivo como .jsx"

FORMATO: Cada afirmación debe incluir sintaxis específica cuando sea relevante.`;
  } else {
    return `${baseInstructions}

REGLAS ESPECÍFICAS PARA CONTENIDO GENERAL:

✅ MEMORIZABLE en contenido general:
- Estadísticas específicas, porcentajes, números exactos
- Fechas importantes, años específicos
- Nombres propios, lugares específicos
- Procesos con pasos técnicos específicos
- Métricas, KPIs, resultados medibles
- Fórmulas, cálculos, conversiones
- Datos de investigación, estudios específicos
- Configuraciones, ajustes técnicos

❌ OBVIO en contenido general:
- "Es importante tener una buena estrategia" (general)
- "Necesitas una cuenta de email" (obvio)
- "Google es un motor de búsqueda" (obvio)
- "Es bueno hacer ejercicio" (sentido común)

EJEMPLOS DE FILTRADO EN CONTENIDO GENERAL:

Contenido: "Para Google Ads necesitas Gmail. El CTR promedio en seguros es 2.47%. Es importante tener buen contenido."
✅ Memorizable: "El CTR promedio en la industria de seguros es 2.47% en Google Ads"
❌ Obvio: "Necesitas Gmail para Google Ads", "Es importante tener buen contenido"

Contenido: "Hola, ¿cómo estás? Hoy vamos a hablar de marketing digital."
✅ Genera 0 grupos (sin información específica memorizable)

FORMATO DE RESPUESTA JSON:
{
  "analysis": {
    "totalContent": "Resumen breve del contenido analizado",
    "valuableInfo": ["Lista de información específica encontrada"],
    "filteredOut": ["Lista de información obvia que se filtró"],
    "educationalValue": "high|medium|low|none",
    "recommendedGroups": 0,
    "reasoning": "Explicación de por qué esta cantidad de grupos"
  },
  "groups": [
    {
      "theme": "Tema específico con datos memorizables",
      "affirmations": [
        {"content": "Afirmación con dato específico memorizable en español", "order": 1},
        {"content": "Afirmación con información técnica valiosa en español", "order": 2},
        {"content": "Afirmación con detalle que se puede olvidar en español", "order": 3}
      ]
    }
  ]
}

IMPORTANTE:
- Si no hay información valiosa, genera 0 grupos con array vacío
- Sé ESTRICTO con el filtrado - mejor pocos datos valiosos que muchos obvios
- Cada grupo debe tener exactamente 3 afirmaciones
- Solo devuelve el JSON, sin texto adicional`;
  }
}

// Legacy function name for compatibility
function generatePrompt(content: string, contentType: 'programming' | 'general'): string {
  return generateIntelligentPrompt(content, contentType);
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

    // Detect content type and generate intelligent prompt
    const contentType = detectContentType(args.content);
    const prompt = generateIntelligentPrompt(args.content, contentType);

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

      // Extract JSON from the response (try both array and object formats)
      let jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        // Fallback to array format for backward compatibility
        jsonMatch = text.match(/\[[\s\S]*\]/);
        if (!jsonMatch) {
          throw new Error("Could not extract JSON from response");
        }
      }

      const parsedResponse = JSON.parse(jsonMatch[0]);

      // Handle new intelligent format
      if (parsedResponse.analysis && parsedResponse.groups) {
        console.log('🧠 Análisis inteligente:', parsedResponse.analysis);

        // If no groups generated (content not valuable enough)
        if (parsedResponse.groups.length === 0) {
          console.log('❌ No se generaron afirmaciones - contenido sin valor educativo suficiente');
          return [];
        }

        // Flatten all affirmations from all groups
        const allAffirmations: Array<{ content: string; order: number }> = [];
        let globalOrder = 1;

        for (const group of parsedResponse.groups) {
          if (group.affirmations && Array.isArray(group.affirmations)) {
            for (const affirmation of group.affirmations) {
              allAffirmations.push({
                content: affirmation.content,
                order: globalOrder++
              });
            }
          }
        }

        console.log(`✅ Generadas ${allAffirmations.length} afirmaciones de ${parsedResponse.groups.length} grupos temáticos`);
        return allAffirmations;
      }

      // Handle legacy format (array of 3 affirmations)
      if (Array.isArray(parsedResponse)) {
        if (parsedResponse.length !== 3) {
          throw new Error("Must generate exactly 3 affirmations in legacy format");
        }

        for (const affirmation of parsedResponse) {
          if (!affirmation.content || !affirmation.order ||
              typeof affirmation.content !== 'string' ||
              typeof affirmation.order !== 'number' ||
              affirmation.order < 1 || affirmation.order > 3) {
            throw new Error("Invalid affirmation structure");
          }
        }

        return parsedResponse;
      }

      throw new Error("Invalid response format - expected intelligent format or legacy array");
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
