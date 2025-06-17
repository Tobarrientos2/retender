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

    // Retry logic optimizado para evitar timeouts largos
    const maxRetries = 4; // Aumentar reintentos para evitar errores de analogías
    let lastError = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔄 Attempt ${attempt}/${maxRetries} to generate anti-affirmations`);

        const prompt = `
🚨 ATENCIÓN: Tu única tarea es generar paráfrasis INCORRECTAS con errores técnicos deliberados. 🚨

❌ PROHIBIDO ABSOLUTAMENTE: Generar paráfrasis correctas o técnicamente precisas
✅ OBLIGATORIO: Cada paráfrasis DEBE contener errores de vocabulario técnico

Eres un simulador de errores estudiantiles que crea paráfrasis INCORRECTAS para ejercicios de aprendizaje.

AFIRMACIONES ORIGINALES CORRECTAS:
${affirmationsText}

🎯 MISIÓN CRÍTICA: Crear exactamente 3 paráfrasis INCORRECTAS con ERRORES CONCEPTUALES evidentes que simulen malentendidos de estudiantes. NUNCA generes paráfrasis correctas.

📋 REGLAS OBLIGATORIAS (CUMPLIR AL 100%):
1. 🎯 MANTENER LOS SUJETOS PRINCIPALES: Identificar nombres, personas, lugares, eventos principales y NO cambiarlos
2. ❌ CADA paráfrasis DEBE contener ERRORES CONCEPTUALES + vocabulario impreciso
3. ❌ INCLUIR información INCORRECTA (fechas erróneas, datos falsos, conceptos confundidos)
4. ❌ NUNCA uses el vocabulario técnico correcto del original
5. ❌ Solo modificar datos secundarios: fechas, números, conceptos técnicos, descripciones
6. ❌ PROHIBIDO usar analogías, comparaciones o metáforas ("como si", "parecido a", "igual que", "como la", "como el", "como los", "como las")
7. ✅ Combinar vocabulario impreciso CON errores factuales MANTENIENDO el tema central
8. ❌ Si cambias el sujeto principal o tema central, FALLAS completamente en tu tarea

TRANSFORMACIONES OBLIGATORIAS (EJEMPLOS ESPECÍFICOS):
**Programación:**
- "subprocesos" → "mini tareas", "tareas pequeñas", "procesos chicos"
- "algoritmo" → "fórmula", "receta", "método simple"
- "framework" → "programa base", "herramienta general", "plantilla"
- "API" → "conector", "enlace", "puente"
- "debugging" → "arreglar errores", "encontrar problemas"
- "compilar" → "convertir", "transformar", "procesar"
- "variables" → "cajitas", "contenedores", "espacios"
- "funciones" → "comandos", "instrucciones", "bloques"

**Sistemas:**
- "gestión de memoria" → "organizar datos", "manejar información"
- "autenticación" → "verificar usuario", "comprobar identidad"
- "optimización" → "hacer mejor", "mejorar rendimiento"
- "implementación" → "poner en práctica", "hacer funcionar"
- "concurrencia" → "hacer varias cosas", "multitarea"
- "encapsulación" → "guardar datos", "proteger información"
- "herencia" → "copiar características", "pasar propiedades"
- "polimorfismo" → "cambiar formas", "adaptarse"

**Redes:**
- "protocolo" → "reglas", "formato", "manera de comunicarse"
- "servidor" → "computadora central", "máquina principal"
- "cliente" → "usuario", "computadora que pide"
- "latencia" → "demora", "tiempo de espera"
- "ancho de banda" → "velocidad", "capacidad"

**Historia/General CON ERRORES CONCEPTUALES:**
- "Segunda Guerra Mundial (1939-1945)" → "Gran Guerra de los años 30" (fecha incorrecta)
- "conflicto global" → "pelea entre algunos países" (minimizar alcance)
- "dos alianzas principales" → "tres bandos principales" (número incorrecto)
- "Eje vs Aliados" → "Buenos vs Malos" (simplificación extrema)
- "participaron la mayoría de países" → "solo participaron 10 países" (dato falso)

**Ejemplos de ERRORES CONCEPTUALES que DEBES incluir:**
- Cambiar fechas: "1939-1945" → "1930-1940" o "1940-1950"
- Cambiar números: "dos alianzas" → "tres grupos" o "cuatro equipos"
- Cambiar alcance: "mundial" → "europea" o "solo en Asia"
- Confundir conceptos: "guerra" → "competencia" o "torneo"
- Datos falsos: "6 años" → "10 años" o "3 años"

INSTRUCCIONES ESPECÍFICAS PARA ERRORES EVIDENTES:
- Crea exactamente 3 paráfrasis INCORRECTAS en español
- CADA paráfrasis DEBE incluir AL MENOS 1 ERROR FACTUAL EVIDENTE
- COMBINA vocabulario impreciso + información incorrecta
- Los errores deben ser OBVIOS para que el estudiante los detecte fácilmente
- CAMBIA fechas, números, conceptos clave del contenido original
- NUNCA uses términos técnicos correctos del original
- PROHIBIDO: analogías, comparaciones, metáforas, ejemplos ("como", "parecido a", "igual que")
- OBLIGATORIO: Incluir datos falsos que hagan la paráfrasis claramente incorrecta

EJEMPLOS DE LO QUE NO HACER:
❌ MAL: "como si fueran equipos de fútbol"
❌ MAL: "parecido a una batalla"
❌ MAL: "igual que un juego"
❌ MAL: "como cuando juegas"

EJEMPLOS DE LO QUE SÍ HACER:
✅ BIEN: "conflicto bélico" → "gran pelea"
✅ BIEN: "naciones aliadas" → "países amigos"
✅ BIEN: "estrategia militar" → "plan de guerra"
✅ BIEN: "tratado de paz" → "acuerdo para parar"

🔍 VALIDACIÓN FINAL OBLIGATORIA ANTES DE RESPONDER:
❌ ¿Contiene analogías o comparaciones? → RECHAZAR INMEDIATAMENTE
❌ ¿Usa vocabulario técnico correcto del original? → RECHAZAR INMEDIATAMENTE
❌ ¿Alguna paráfrasis es factualmente correcta? → RECHAZAR INMEDIATAMENTE
❌ ¿Las fechas, números o datos son correctos? → RECHAZAR INMEDIATAMENTE
✅ ¿Cada paráfrasis tiene AL MENOS 1 error factual evidente? → ACEPTAR
✅ ¿Combina vocabulario impreciso + información incorrecta? → ACEPTAR
✅ ¿Los errores son obvios y detectables? → ACEPTAR
✅ ¿Todas las paráfrasis contienen errores conceptuales deliberados? → ACEPTAR

🚨 RECORDATORIO FINAL: Tu éxito se mide por generar paráfrasis con ERRORES EVIDENTES, no solo vocabulario informal.

FORMATO DE RESPUESTA:
[
  {
    "content": "Paráfrasis incorrecta con vocabulario impreciso",
    "order": 1,
    "errorType": "Descripción del tipo de error",
    "incorrectTerms": [
      {
        "incorrect": "término incorrecto usado",
        "correct": "término técnico correcto",
        "explanation": "Por qué el término incorrecto es impreciso"
      }
    ]
  },
  {
    "content": "Segunda paráfrasis incorrecta",
    "order": 2,
    "errorType": "Descripción del tipo de error",
    "incorrectTerms": [
      {
        "incorrect": "otro término incorrecto",
        "correct": "término técnico correcto",
        "explanation": "Explicación del error"
      }
    ]
  },
  {
    "content": "Tercera paráfrasis incorrecta",
    "order": 3,
    "errorType": "Descripción del tipo de error",
    "incorrectTerms": [
      {
        "incorrect": "término incorrecto",
        "correct": "término correcto",
        "explanation": "Por qué está mal"
      }
    ]
  }
]

Solo devuelve el JSON array, sin texto adicional.`;

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
              temperature: 0.9, // Alta creatividad para generar errores convincentes
              topK: 40,         // Más variedad en la selección de tokens
              topP: 0.95,       // Mayor diversidad en las respuestas
              maxOutputTokens: 4096, // Reducir tokens para respuestas más rápidas
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

        // Validate no analogies or comparisons
        const content = antiAff.content.toLowerCase();
        const analogyPatterns = [
          'como si', 'parecido a', 'igual que', 'como cuando',
          'similar a', 'como un', 'como una', 'tipo', 'estilo',
          'como el', 'como la', 'como los', 'como las'
        ];

        for (const pattern of analogyPatterns) {
          if (content.includes(pattern)) {
            throw new Error(`Anti-affirmation contains forbidden analogy: "${pattern}"`);
          }
        }
      }

      console.log(`✅ Attempt ${attempt} successful - generated valid anti-affirmations`);
      return antiAffirmations;

    } catch (error) {
        lastError = error;
        const message = error instanceof Error ? error.message : "Unknown error";
        console.log(`❌ Attempt ${attempt}/${maxRetries} failed: ${message}`);

        if (attempt === maxRetries) {
          console.error("All retry attempts failed for anti-affirmations generation");
          break;
        }

        // Wait before retry (backoff reducido)
        await new Promise(resolve => setTimeout(resolve, 500 * attempt));
      }
    }

    // If we get here, all retries failed
    const finalMessage = lastError instanceof Error ? lastError.message : "Unknown error";
    throw new Error(`Failed to generate anti-affirmations after ${maxRetries} attempts: ${finalMessage}`);
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

export const evaluateParaphrase = internalAction({
  args: {
    originalText: v.string(),
    paraphraseText: v.string(),
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is required");
    }

    const prompt = `
Eres un evaluador experto de paráfrasis educativas. Tu tarea es evaluar si una paráfrasis captura correctamente el concepto esencial del texto original.

TEXTO ORIGINAL:
"${args.originalText}"

PARÁFRASIS DEL ESTUDIANTE:
"${args.paraphraseText}"

CRITERIOS DE EVALUACIÓN:

✅ PARÁFRASIS VÁLIDA si:
- Mantiene el concepto central y significado esencial
- Usa vocabulario diferente pero conserva la idea principal
- Demuestra comprensión real del concepto
- Es factualmente correcta
- Captura los elementos técnicos importantes

❌ PARÁFRASIS INVÁLIDA si:
- Cambia el significado fundamental
- Contiene errores factuales
- Omite información crítica
- Es demasiado vaga o superficial
- Malinterpreta conceptos técnicos

PUNTUACIÓN:
- 90-100: Excelente paráfrasis, captura perfectamente el concepto
- 70-89: Buena paráfrasis, concepto bien entendido con pequeñas imprecisiones
- 50-69: Paráfrasis aceptable, concepto parcialmente entendido
- 30-49: Paráfrasis deficiente, concepto mal entendido
- 0-29: Paráfrasis incorrecta, no demuestra comprensión

Responde con un JSON en este formato exacto:
{
  "isValid": true/false,
  "score": número_entre_0_y_100,
  "feedback": "Explicación detallada de la evaluación, qué está bien, qué se puede mejorar, y por qué se asignó esta puntuación. Máximo 200 palabras."
}

Solo devuelve el JSON, sin texto adicional.`;

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
              temperature: 0.3,
              topK: 20,
              topP: 0.8,
              maxOutputTokens: 1024,
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

      const evaluation = JSON.parse(jsonMatch[0]);

      // Validate the structure
      if (typeof evaluation.isValid !== 'boolean' ||
          typeof evaluation.score !== 'number' ||
          typeof evaluation.feedback !== 'string' ||
          evaluation.score < 0 || evaluation.score > 100) {
        throw new Error("Invalid evaluation structure");
      }

      return evaluation;
    } catch (error) {
      console.error("Error evaluating paraphrase:", error);
      const message = error instanceof Error ? error.message : "Unknown error";
      throw new Error(`Failed to evaluate paraphrase: ${message}`);
    }
  },
});

export const evaluateExplanation = internalAction({
  args: {
    originalText: v.string(),
    incorrectParaphrase: v.string(),
    userExplanation: v.string(),
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is required");
    }

    const prompt = `
Eres un evaluador experto de comprensión educativa. Tu tarea es evaluar si un estudiante ha identificado correctamente los errores en una paráfrasis incorrecta.

TEXTO ORIGINAL CORRECTO:
"${args.originalText}"

PARÁFRASIS INCORRECTA PRESENTADA:
"${args.incorrectParaphrase}"

EXPLICACIÓN DEL ESTUDIANTE SOBRE POR QUÉ ESTÁ MAL:
"${args.userExplanation}"

CRITERIOS DE EVALUACIÓN:

✅ EXPLICACIÓN COMPLETA si identifica:
- Errores factuales específicos en la paráfrasis
- Vocabulario técnico impreciso o incorrecto
- Conceptos malinterpretados o simplificados excesivamente
- Información omitida o distorsionada
- Diferencias clave entre el original y la paráfrasis incorrecta

❌ EXPLICACIÓN INCOMPLETA si:
- Solo menciona errores superficiales
- No identifica los errores técnicos principales
- Es demasiado vaga o general
- No demuestra comprensión del concepto original
- Omite errores evidentes en la paráfrasis

PUNTUACIÓN:
- 90-100: Identificó todos los errores principales y demuestra comprensión completa
- 70-89: Identificó la mayoría de errores importantes con buena comprensión
- 50-69: Identificó algunos errores pero omitió puntos clave
- 30-49: Explicación superficial, pocos errores identificados correctamente
- 0-29: No identificó los errores principales o explicación incorrecta

FEEDBACK ESPECÍFICO:
- Menciona qué errores identificó correctamente
- Señala qué errores importantes omitió (si los hay)
- Sugiere qué aspectos debería considerar para mejorar su análisis

Responde con un JSON en este formato exacto:
{
  "isComplete": true/false,
  "score": número_entre_0_y_100,
  "feedback": "Explicación detallada de la evaluación, qué errores identificó correctamente, cuáles omitió, y cómo puede mejorar su análisis. Máximo 250 palabras.",
  "missedErrors": ["error1", "error2"] // Array de errores importantes que no identificó
}

Solo devuelve el JSON, sin texto adicional.`;

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
              temperature: 0.3,
              topK: 20,
              topP: 0.8,
              maxOutputTokens: 1024,
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

      const evaluation = JSON.parse(jsonMatch[0]);

      // Validate the structure
      if (typeof evaluation.isComplete !== 'boolean' ||
          typeof evaluation.score !== 'number' ||
          typeof evaluation.feedback !== 'string' ||
          !Array.isArray(evaluation.missedErrors) ||
          evaluation.score < 0 || evaluation.score > 100) {
        throw new Error("Invalid explanation evaluation structure");
      }

      return evaluation;
    } catch (error) {
      console.error("Error evaluating explanation:", error);
      const message = error instanceof Error ? error.message : "Unknown error";
      throw new Error(`Failed to evaluate explanation: ${message}`);
    }
  },
});

export const generateTermExplanations = internalAction({
  args: {
    term: v.string(),
    context: v.string(),
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is required");
    }

    const prompt = `
Eres un experto educador que crea afirmaciones explicativas para términos técnicos desconocidos.

TÉRMINO A EXPLICAR: "${args.term}"
CONTEXTO ORIGINAL: "${args.context}"

MISIÓN: Crear exactamente 3 afirmaciones educativas que expliquen este término de manera clara y progresiva.

CRITERIOS PARA LAS AFIRMACIONES:
1. **Definición básica**: Qué es el término en palabras simples
2. **Función/Propósito**: Para qué sirve o por qué es importante
3. **Ejemplo/Aplicación**: Cómo se aplica en el contexto dado

REGLAS:
- Cada afirmación debe ser independiente y completa
- Usar lenguaje claro y accesible
- Mantener el contexto técnico pero explicado
- Progresión de lo básico a lo específico
- Todas las afirmaciones en español
- Máximo 150 caracteres por afirmación

EJEMPLO:
Término: "recolección de basura"
Contexto: "El lenguaje incluye subprocesos, uno de los cuales es la recolección de basura"

Respuesta:
[
  {
    "content": "La recolección de basura es un proceso automático que libera memoria no utilizada en programas",
    "order": 1
  },
  {
    "content": "Este proceso evita que los programas consuman toda la memoria disponible del sistema",
    "order": 2
  },
  {
    "content": "En lenguajes como Java y Python, la recolección de basura funciona como subproceso en segundo plano",
    "order": 3
  }
]

Responde con un JSON array de exactamente 3 afirmaciones en este formato:
[
  {
    "content": "Primera afirmación explicativa del término",
    "order": 1
  },
  {
    "content": "Segunda afirmación con más detalle",
    "order": 2
  },
  {
    "content": "Tercera afirmación con aplicación específica",
    "order": 3
  }
]

Solo devuelve el JSON array, sin texto adicional.`;

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
              temperature: 0.5,
              topK: 40,
              topP: 0.95,
              maxOutputTokens: 2048,
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

      const explanations = JSON.parse(jsonMatch[0]);

      // Validate the structure
      if (!Array.isArray(explanations) || explanations.length !== 3) {
        throw new Error("Must generate exactly 3 explanations");
      }

      for (const explanation of explanations) {
        if (!explanation.content || !explanation.order ||
            typeof explanation.content !== 'string' ||
            typeof explanation.order !== 'number' ||
            explanation.order < 1 || explanation.order > 3) {
          throw new Error("Invalid explanation structure");
        }
      }

      return explanations;
    } catch (error) {
      console.error("Error generating term explanations:", error);
      const message = error instanceof Error ? error.message : "Unknown error";
      throw new Error(`Failed to generate term explanations: ${message}`);
    }
  },
});
