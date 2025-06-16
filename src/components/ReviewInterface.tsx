import { useState } from "react";
import { useQuery, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useRobustConvex, formatConnectionError } from '../hooks/useRobustConvex';

interface SessionAffirmation {
  content: string;
  order: number;
  subject: string;
  timeframe?: string;
  category: string;
}

interface SessionData {
  sessionId: number;
  theme: string;
  affirmations: SessionAffirmation[];
}

interface ReviewInterfaceProps {
  setId?: Id<"affirmationSets">;
  sessionData?: SessionData;
  collectionId?: Id<"sessionCollections">;
  sessionId?: number;
  onBack: () => void;
}

type ViewMode = "review" | "practice";
type PracticeMode = "loading" | "question" | "validated" | "paraphrase";

interface AntiAffirmation {
  content: string;
  order: number;
  errorType: string;
  incorrectTerms: Array<{
    incorrect: string;
    correct: string;
    explanation: string;
  }>;
}

// Función para detectar términos técnicos en el texto
function detectTechnicalTerms(text: string): string[] {
  const technicalPatterns = [
    // Programación
    /\b(subprocesos?|subprocesses?)\b/gi,
    /\b(recolección de basura|garbage collection)\b/gi,
    /\b(algoritmos?|algorithms?)\b/gi,
    /\b(frameworks?|bibliotecas?|libraries?)\b/gi,
    /\b(APIs?|interfaces?)\b/gi,
    /\b(bases? de datos|databases?)\b/gi,
    /\b(servidores?|servers?)\b/gi,
    /\b(compiladores?|compilers?)\b/gi,
    /\b(intérpretes?|interpreters?)\b/gi,
    /\b(middleware|middlewares?)\b/gi,
    /\b(microservicios?|microservices?)\b/gi,
    /\b(contenedores?|containers?)\b/gi,
    /\b(virtualización|virtualization)\b/gi,
    /\b(autenticación|authentication)\b/gi,
    /\b(autorización|authorization)\b/gi,
    /\b(encriptación|encryption)\b/gi,
    /\b(hashing|hash)\b/gi,
    /\b(tokens?|JWT)\b/gi,
    /\b(cookies?|sessions?)\b/gi,
    /\b(caching|caché)\b/gi,
    /\b(load balancing|balanceadores?)\b/gi,
    /\b(CDN|content delivery)\b/gi,
    /\b(webhooks?|callbacks?)\b/gi,
    /\b(REST|GraphQL|SOAP)\b/gi,
    /\b(JSON|XML|YAML)\b/gi,
    /\b(SQL|NoSQL|MongoDB)\b/gi,
    /\b(Redis|PostgreSQL|MySQL)\b/gi,
    /\b(Docker|Kubernetes)\b/gi,
    /\b(CI\/CD|DevOps)\b/gi,
    /\b(testing|pruebas unitarias)\b/gi,
    /\b(debugging|depuración)\b/gi,
    /\b(refactoring|refactorización)\b/gi,
    /\b(deployment|despliegue)\b/gi,
    /\b(monitoring|monitoreo)\b/gi,
    /\b(logging|logs)\b/gi,
    /\b(performance|rendimiento)\b/gi,
    /\b(scalability|escalabilidad)\b/gi,
    /\b(concurrencia|concurrency)\b/gi,
    /\b(paralelismo|parallelism)\b/gi,
    /\b(asíncrono|asynchronous)\b/gi,
    /\b(síncrono|synchronous)\b/gi,
    /\b(threads?|hilos?)\b/gi,
    /\b(procesos?|processes?)\b/gi,
    /\b(memoria|memory)\b/gi,
    /\b(CPU|procesador)\b/gi,
    /\b(bandwidth|ancho de banda)\b/gi,
    /\b(latencia|latency)\b/gi,
    /\b(throughput|rendimiento)\b/gi,

    // Términos generales técnicos
    /\b(métricas?|metrics?)\b/gi,
    /\b(KPIs?|indicadores?)\b/gi,
    /\b(dashboards?|tableros?)\b/gi,
    /\b(analytics|analíticas?)\b/gi,
    /\b(machine learning|aprendizaje automático)\b/gi,
    /\b(inteligencia artificial|AI)\b/gi,
    /\b(big data|datos masivos)\b/gi,
    /\b(cloud computing|computación en la nube)\b/gi,
    /\b(blockchain|cadena de bloques)\b/gi,
    /\b(IoT|Internet of Things)\b/gi,
    /\b(edge computing|computación en el borde)\b/gi,
    /\b(5G|redes móviles)\b/gi,
    /\b(ciberseguridad|cybersecurity)\b/gi,
    /\b(phishing|malware)\b/gi,
    /\b(ransomware|virus)\b/gi,
    /\b(firewall|cortafuegos)\b/gi,
    /\b(VPN|redes privadas)\b/gi,
    /\b(SSL|TLS|HTTPS)\b/gi,
    /\b(certificados digitales)\b/gi,
    /\b(PKI|infraestructura)\b/gi,
  ];

  const foundTerms = new Set<string>();

  for (const pattern of technicalPatterns) {
    const matches = text.match(pattern);
    if (matches) {
      matches.forEach(match => foundTerms.add(match.toLowerCase()));
    }
  }

  return Array.from(foundTerms);
}

// Función para comparar textos palabra por palabra y mostrar diferencias
function compareTexts(correctText: string, incorrectText: string) {
  const correctWords = correctText.split(' ');
  const incorrectWords = incorrectText.split(' ');
  const maxLength = Math.max(correctWords.length, incorrectWords.length);

  const result = [];

  for (let i = 0; i < maxLength; i++) {
    const correctWord = correctWords[i] || '';
    const incorrectWord = incorrectWords[i] || '';

    if (correctWord !== incorrectWord) {
      // Hay diferencia - mostrar palabra correcta arriba y incorrecta tachada
      result.push({
        type: 'different',
        correct: correctWord,
        incorrect: incorrectWord,
        index: i
      });
    } else {
      // Son iguales - mostrar solo la palabra normal
      result.push({
        type: 'same',
        word: correctWord,
        index: i
      });
    }
  }

  return result;
}

// Función para mostrar paráfrasis incorrecta con términos corregibles
function renderParaphraseWithCorrections(
  incorrectText: string,
  incorrectTerms: Array<{ incorrect: string; correct: string; explanation: string }>
): React.ReactNode {
  if (!incorrectTerms || incorrectTerms.length === 0) {
    return incorrectText;
  }

  let processedText = incorrectText;
  const replacements: Array<{
    incorrect: string;
    correct: string;
    explanation: string;
    startIndex: number;
    endIndex: number;
  }> = [];

  // Encontrar todas las posiciones de términos incorrectos
  incorrectTerms.forEach(term => {
    const regex = new RegExp(`\\b${term.incorrect.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
    let match;
    while ((match = regex.exec(incorrectText)) !== null) {
      replacements.push({
        ...term,
        startIndex: match.index,
        endIndex: match.index + match[0].length
      });
    }
  });

  // Ordenar por posición para procesar de izquierda a derecha
  replacements.sort((a, b) => a.startIndex - b.startIndex);

  if (replacements.length === 0) {
    return incorrectText;
  }

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;

  replacements.forEach((replacement, index) => {
    // Añadir texto antes del término incorrecto
    if (replacement.startIndex > lastIndex) {
      parts.push(incorrectText.slice(lastIndex, replacement.startIndex));
    }

    // Añadir el término con corrección
    parts.push(
      <span key={index} className="relative inline-block">
        {/* Término correcto arriba en verde */}
        <span className="absolute -top-3 left-1/2 transform -translate-x-1/2 text-base text-green-700 whitespace-nowrap">
          {replacement.correct}
        </span>
        {/* Término incorrecto tachado */}
        <span
          className="line-through text-gray-500 cursor-help"
          title={replacement.explanation}
        >
          {replacement.incorrect}
        </span>
      </span>
    );

    lastIndex = replacement.endIndex;
  });

  // Añadir texto restante
  if (lastIndex < incorrectText.length) {
    parts.push(incorrectText.slice(lastIndex));
  }

  return parts;
}

// Función para renderizar texto con términos técnicos clickeables
function renderTextWithClickableTerms(
  text: string,
  onTermClick: (term: string) => void
): React.ReactNode {
  const technicalTerms = detectTechnicalTerms(text);

  if (technicalTerms.length === 0) {
    return text;
  }

  // Crear un patrón regex que capture todos los términos técnicos
  const termPattern = new RegExp(
    `\\b(${technicalTerms.map(term => term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\b`,
    'gi'
  );

  const parts = text.split(termPattern);

  return parts.map((part, index) => {
    const isTermMatch = technicalTerms.some(term =>
      part.toLowerCase() === term.toLowerCase()
    );

    if (isTermMatch) {
      return (
        <button
          key={index}
          onClick={() => onTermClick(part)}
          className="text-purple-600 hover:text-purple-800 hover:underline font-medium cursor-pointer bg-transparent border-none p-0 m-0 inline"
          title={`Click para explicar: ${part}`}
        >
          {part}
        </button>
      );
    }

    return part;
  });
}

export function ReviewInterface({ setId, sessionData, collectionId, sessionId, onBack }: ReviewInterfaceProps) {
  const [currentAffirmationIndex, setCurrentAffirmationIndex] = useState(0);
  const [viewMode, setViewMode] = useState<ViewMode>("review");
  const [practiceMode, setPracticeMode] = useState<PracticeMode>("loading");
  const [antiAffirmations, setAntiAffirmations] = useState<AntiAffirmation[]>([]);
  const [currentPracticeIndex, setCurrentPracticeIndex] = useState(0);
  const [isValidated, setIsValidated] = useState(false);
  const [editableText, setEditableText] = useState("");
  const [paraphraseText, setParaphraseText] = useState("");
  const [explanationText, setExplanationText] = useState("");
  const [paraphraseEvaluation, setParaphraseEvaluation] = useState<{
    isValid: boolean;
    feedback: string;
    score: number;
  } | null>(null);
  const [explanationEvaluation, setExplanationEvaluation] = useState<{
    isComplete: boolean;
    feedback: string;
    score: number;
    missedErrors: string[];
  } | null>(null);
  const [selectedTerm, setSelectedTerm] = useState<string | null>(null);
  const [termExplanations, setTermExplanations] = useState<Array<{ content: string; order: number }>>([]);
  const [loadingTerm, setLoadingTerm] = useState(false);

  // Conditional data fetching
  const setData = useQuery(
    api.affirmations.getSetWithAffirmations,
    setId ? { setId } : "skip"
  );
  const dbSessionData = useQuery(
    api.affirmations.getSessionForPractice,
    collectionId && sessionId ? { collectionId, sessionId } : "skip"
  );
  const generateAntiAffirmations = useAction(api.affirmations.generateAntiAffirmations);
  const evaluateParaphrase = useAction(api.affirmations.evaluateParaphrase);
  const evaluateExplanation = useAction(api.affirmations.evaluateExplanation);
  const generateTermExplanations = useAction(api.affirmations.generateTermExplanations);

  // Hook robusto para operaciones críticas
  const {
    generateAntiAffirmationsRobust,
    isLoading: isRobustLoading,
    error: robustError,
    clearError
  } = useRobustConvex();

  // Determine data source
  const isSessionMode = !!sessionData || !!dbSessionData;
  const isLoading = !sessionData && !dbSessionData && !setData;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="w-6 h-6 border-2 border-gray-300 border-t-black rounded-full animate-spin"></div>
      </div>
    );
  }

  // Extract data based on mode
  const currentSessionData = sessionData || dbSessionData;
  const title = isSessionMode ? `Session ${currentSessionData?.sessionId}: ${currentSessionData?.theme}` : setData?.set.title || "";
  const sourceContent = isSessionMode ? null : setData?.set.sourceContent;
  const affirmations = isSessionMode ? currentSessionData?.affirmations || [] : setData?.affirmations || [];
  const currentAffirmation = affirmations[currentAffirmationIndex];

  const handleNext = () => {
    if (currentAffirmationIndex < affirmations.length - 1) {
      setCurrentAffirmationIndex(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentAffirmationIndex > 0) {
      setCurrentAffirmationIndex(prev => prev - 1);
    }
  };

  const startPracticeMode = async () => {
    setViewMode("practice");
    setPracticeMode("loading");

    try {
      const antiAffs = await generateAntiAffirmations({
        originalAffirmations: affirmations.map(aff => ({
          content: aff.content,
          order: aff.order
        }))
      });

      setAntiAffirmations(antiAffs.map(antiAff => ({
        ...antiAff,
        incorrectTerms: antiAff.incorrectTerms || []
      })));
      setCurrentPracticeIndex(0);
      setIsValidated(false);
      setEditableText(antiAffs[0]?.content || "");
      setPracticeMode("question");
    } catch (error) {
      console.error("Error generating anti-affirmations:", error);
      setViewMode("review");
    }
  };

  const handleValidate = () => {
    setIsValidated(true);
    setPracticeMode("validated");
  };

  const startParaphraseMode = async () => {
    setCurrentPracticeIndex(0);
    setParaphraseText("");
    setExplanationText("");
    setParaphraseEvaluation(null);
    setExplanationEvaluation(null);
    setPracticeMode("loading");

    // Limpiar errores previos
    clearError();

    try {
      console.log("🔄 Starting paraphrase mode generation with robust connection...");
      console.log("📝 Input affirmations:", affirmations.map(aff => ({ content: aff.content, order: aff.order })));

      // Usar el hook robusto para generar anti-afirmaciones
      const antiAffs = await generateAntiAffirmationsRobust({
        originalAffirmations: affirmations.map(aff => ({
          content: aff.content,
          order: aff.order
        }))
      });

      if (antiAffs && antiAffs.length > 0) {
        console.log("✅ Received anti-affirmations:", antiAffs);
        console.log("📊 Anti-affirmations count:", antiAffs.length);

        setAntiAffirmations(antiAffs);
        setParaphraseText(antiAffs[0]?.content || "");
        console.log("✅ Successfully set anti-affirmations");
      } else {
        console.warn("⚠️ No anti-affirmations received, continuing without them");
        setAntiAffirmations([]);
      }

      setPracticeMode("paraphrase");

    } catch (error) {
      const errorMessage = formatConnectionError(error);
      console.error("❌ Error in paraphrase mode generation:", errorMessage);

      // Continuar sin anti-afirmaciones en caso de error
      setAntiAffirmations([]);
      setPracticeMode("paraphrase");
    }
  };

  const handleParaphraseEvaluation = async () => {
    if (!paraphraseText.trim()) return;

    const currentOriginal = affirmations[currentPracticeIndex];

    try {
      const evaluation = await evaluateParaphrase({
        originalText: currentOriginal?.content || "",
        paraphraseText: paraphraseText.trim(),
      });

      setParaphraseEvaluation(evaluation);
    } catch (error) {
      console.error("Error evaluating paraphrase:", error);
    }
  };

  const handleExplanationEvaluation = async () => {
    if (!explanationText.trim()) return;

    const currentOriginal = affirmations[currentPracticeIndex];
    const currentAnti = antiAffirmations[currentPracticeIndex];

    try {
      const evaluation = await evaluateExplanation({
        originalText: currentOriginal?.content || "",
        incorrectParaphrase: currentAnti?.content || "",
        userExplanation: explanationText.trim(),
      });

      setExplanationEvaluation(evaluation);
    } catch (error) {
      console.error("Error evaluating explanation:", error);
    }
  };

  const handleTermClick = async (term: string) => {
    const currentOriginal = affirmations[currentPracticeIndex];

    setSelectedTerm(term);
    setLoadingTerm(true);
    setTermExplanations([]);

    try {
      const explanations = await generateTermExplanations({
        term: term,
        context: currentOriginal?.content || "",
      });

      setTermExplanations(explanations);
    } catch (error) {
      console.error("Error generating term explanations:", error);
    } finally {
      setLoadingTerm(false);
    }
  };

  const nextPracticeQuestion = () => {
    if (currentPracticeIndex < affirmations.length - 1) {
      const nextIndex = currentPracticeIndex + 1;
      setCurrentPracticeIndex(nextIndex);
      setIsValidated(false);
      setEditableText(antiAffirmations[nextIndex]?.content || "");
      setParaphraseText(practiceMode === "paraphrase" ? antiAffirmations[nextIndex]?.content || "" : "");
      setExplanationText("");
      setParaphraseEvaluation(null);
      setExplanationEvaluation(null);
      setPracticeMode(practiceMode === "paraphrase" ? "paraphrase" : "question");
    } else {
      // Practice completed
      setPracticeMode("validated");
    }
  };

  const resetPractice = () => {
    setCurrentPracticeIndex(0);
    setIsValidated(false);
    setEditableText(antiAffirmations[0]?.content || "");
    setParaphraseText(practiceMode === "paraphrase" ? antiAffirmations[0]?.content || "" : "");
    setExplanationText("");
    setParaphraseEvaluation(null);
    setExplanationEvaluation(null);
    setPracticeMode(practiceMode === "paraphrase" ? "paraphrase" : "question");
  };

  if (affirmations.length === 0) {
    return (
      <div className="max-w-2xl mx-auto text-center py-16">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl">💭</span>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No affirmations found</h3>
        <p className="text-gray-600 mb-6">
          This set doesn't have any affirmations yet.
        </p>
        <button
          onClick={onBack}
          className="px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  // Practice Mode Rendering
  if (viewMode === "practice") {
    if (practiceMode === "loading") {
      return (
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
              <span className="text-2xl">🎯</span>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Generating Practice Questions</h3>
            <p className="text-gray-600 mb-4">Creating anti-affirmations for your practice session...</p>

            {/* Mostrar estado de conexión robusta */}
            {isRobustLoading && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-md mx-auto">
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin"></div>
                  <span className="text-blue-700 text-sm">Conexión robusta activa...</span>
                </div>
              </div>
            )}

            {/* Mostrar errores de conexión */}
            {robustError && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 max-w-md mx-auto mt-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-yellow-600">⚠️</span>
                  <span className="text-yellow-800 font-medium text-sm">Problema de conexión</span>
                </div>
                <p className="text-yellow-700 text-sm">{formatConnectionError(robustError)}</p>
                <button
                  onClick={clearError}
                  className="mt-2 text-yellow-600 hover:text-yellow-800 text-sm underline"
                >
                  Reintentar
                </button>
              </div>
            )}
          </div>
        </div>
      );
    }

    const currentOriginal = affirmations[currentPracticeIndex];
    const currentAnti = antiAffirmations[currentPracticeIndex];
    const isCompleted = currentPracticeIndex >= affirmations.length;

    if (isCompleted) {
      return (
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">🏆</span>
            </div>
            <h3 className="text-2xl font-medium text-gray-900 mb-2">Practice Complete!</h3>
            <p className="text-gray-600 mb-6">
              Has completado todas las afirmaciones de práctica.
            </p>
            <div className="flex gap-4 justify-center">
              <button
                onClick={resetPractice}
                className="px-6 py-3 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Practice Again
              </button>
              <button
                onClick={() => setViewMode("review")}
                className="px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
              >
                Back to Review
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <button
            onClick={() => setViewMode("review")}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors mb-4"
          >
            <span>←</span>
            Back to Review
          </button>
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-light text-gray-900 mb-1">
                {practiceMode === "paraphrase" ? "Paraphrase Mode" : "Practice Mode"}
              </h2>
              <p className="text-gray-600">
                {practiceMode === "paraphrase"
                  ? "Identifica y explica por qué la paráfrasis mostrada es incorrecta"
                  : "Corrige la paráfrasis incorrecta usando vocabulario técnico preciso"
                }
              </p>
            </div>
            <div className="text-right">
              <span className="text-sm text-gray-600">
                Question {currentPracticeIndex + 1} of {affirmations.length}
              </span>
            </div>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 mt-4">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentPracticeIndex + 1) / affirmations.length) * 100}%` }}
            ></div>
          </div>
        </div>

        {/* Practice Question */}
        <div className="bg-white border border-gray-200 rounded-lg p-12 mb-8 text-center min-h-[300px] flex items-center justify-center">
          <div className="w-full">
            {practiceMode === "paraphrase" ? (
              /* Modo Paráfrasis */
              <div>
                {/* Mostrar paráfrasis incorrecta para corregir */}
                <div className="mb-8">
                  <p className="text-lg font-medium text-black mb-4">
                    Paráfrasis incorrecta a corregir:
                    <span className="text-sm text-purple-600 ml-2">(Click en términos morados para explicaciones)</span>
                  </p>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                    <p className="text-xl leading-relaxed text-gray-900 max-w-2xl mx-auto">
                      {currentAnti?.content ?
                        renderTextWithClickableTerms(currentAnti.content, handleTermClick) :
                        <span className="text-gray-500 italic">Generando paráfrasis incorrecta...</span>
                      }
                    </p>
                  </div>
                  <p className="text-sm text-gray-600 mb-4 max-w-2xl mx-auto">
                    Esta paráfrasis contiene errores conceptuales y vocabulario impreciso. Identifica todos los problemas.
                  </p>
                </div>

                {/* Mostrar explicaciones de términos */}
                {selectedTerm && (
                  <div className="mb-8 bg-purple-50 border border-purple-200 rounded-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-medium text-purple-900">
                        Explicación: "{selectedTerm}"
                      </h3>
                      <button
                        onClick={() => {
                          setSelectedTerm(null);
                          setTermExplanations([]);
                        }}
                        className="text-purple-600 hover:text-purple-800 text-xl"
                      >
                        ✕
                      </button>
                    </div>

                    {loadingTerm ? (
                      <div className="text-center py-4">
                        <div className="w-6 h-6 border-2 border-purple-300 border-t-purple-600 rounded-full animate-spin mx-auto mb-2"></div>
                        <p className="text-purple-700">Generando explicaciones...</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {termExplanations.map((explanation, index) => (
                          <div key={index} className="bg-white rounded-lg p-4 border border-purple-100">
                            <div className="flex items-start gap-3">
                              <span className="bg-purple-100 text-purple-700 rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium flex-shrink-0 mt-1">
                                {explanation.order}
                              </span>
                              <p className="text-gray-900 leading-relaxed">
                                {explanation.content}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Campo para explicar por qué la paráfrasis está mal */}
                <div className="mb-6">
                  <p className="text-lg font-medium text-black mb-4">Explica por qué esta paráfrasis está incorrecta:</p>
                  <textarea
                    value={explanationText}
                    onChange={(e) => setExplanationText(e.target.value)}
                    className="w-full max-w-2xl mx-auto p-4 text-xl leading-relaxed text-black border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    rows={4}
                    placeholder="Identifica los errores conceptuales, vocabulario impreciso y problemas técnicos..."
                  />
                </div>

                {/* Mostrar evaluación de explicación si existe */}
                {explanationEvaluation && (
                  <div className={`p-6 rounded-lg border ${
                    explanationEvaluation.isComplete
                      ? 'bg-green-50 border-green-200'
                      : 'bg-yellow-50 border-yellow-200'
                  }`}>
                    <div className="flex items-center justify-center mb-4">
                      <span className={`text-2xl mr-3 ${
                        explanationEvaluation.isComplete ? 'text-green-600' : 'text-yellow-600'
                      }`}>
                        {explanationEvaluation.isComplete ? '✅' : '⚠️'}
                      </span>
                      <span className={`text-lg font-medium ${
                        explanationEvaluation.isComplete ? 'text-green-800' : 'text-yellow-800'
                      }`}>
                        Puntuación: {explanationEvaluation.score}/100
                      </span>
                    </div>
                    <p className={`text-sm leading-relaxed max-w-2xl mx-auto mb-4 ${
                      explanationEvaluation.isComplete ? 'text-green-700' : 'text-yellow-700'
                    }`}>
                      {explanationEvaluation.feedback}
                    </p>
                    
                    {/* Mostrar errores no identificados */}
                    {explanationEvaluation.missedErrors && explanationEvaluation.missedErrors.length > 0 && (
                      <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 max-w-2xl mx-auto">
                        <h4 className="text-orange-800 font-medium mb-2">Errores que no identificaste:</h4>
                        <ul className="list-disc list-inside space-y-1">
                          {explanationEvaluation.missedErrors.map((error, index) => (
                            <li key={index} className="text-orange-700 text-sm">{error}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : practiceMode === "validated" && isValidated ? (
              /* Mostrar paráfrasis incorrecta con correcciones */
              <div>
                <p className="text-lg font-medium text-black mb-4">Paráfrasis incorrecta:</p>
                <div className="text-xl leading-relaxed text-gray-900 max-w-2xl mx-auto mb-6" style={{ lineHeight: '2.4' }}>
                  {renderParaphraseWithCorrections(currentAnti?.content || '', currentAnti?.incorrectTerms || [])}
                </div>

                {/* Mostrar explicaciones de términos incorrectos */}
                {currentAnti?.incorrectTerms && currentAnti.incorrectTerms.length > 0 && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 max-w-2xl mx-auto">
                    <h4 className="text-lg font-medium text-yellow-800 mb-4">¿Por qué estos términos son incorrectos?</h4>
                    <div className="space-y-3">
                      {currentAnti.incorrectTerms.map((term, index) => (
                        <div key={index} className="bg-white rounded-lg p-4 border border-yellow-100">
                          <div className="flex items-start gap-3">
                            <span className="bg-yellow-100 text-yellow-700 rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium flex-shrink-0 mt-1">
                              {index + 1}
                            </span>
                            <div>
                              <p className="text-gray-900 font-medium mb-1">
                                <span className="line-through text-red-600">"{term.incorrect}"</span>
                                {" → "}
                                <span className="text-green-600">"{term.correct}"</span>
                              </p>
                              <p className="text-gray-700 text-sm leading-relaxed">
                                {term.explanation}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Campo de texto editable para corregir la paráfrasis */
              <div>
                <p className="text-lg font-medium text-black mb-4">Corrige la paráfrasis incorrecta:</p>
                <p className="text-sm text-gray-600 mb-4 max-w-2xl mx-auto">
                  Esta paráfrasis usa vocabulario impreciso. Reemplaza los términos incorrectos con vocabulario técnico apropiado.
                </p>
                <textarea
                  value={editableText}
                  onChange={(e) => setEditableText(e.target.value)}
                  className="w-full max-w-2xl mx-auto p-4 text-xl leading-relaxed text-black border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={4}
                  placeholder="Reemplaza términos imprecisos con vocabulario técnico correcto..."
                />
              </div>
            )}
          </div>
        </div>

        {/* Practice Controls */}
        {practiceMode === "paraphrase" ? (
          <div className="flex justify-center gap-4">
            {!explanationEvaluation ? (
              <button
                onClick={handleExplanationEvaluation}
                disabled={!explanationText.trim()}
                className="px-8 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                🤖 Evaluar Explicación
              </button>
            ) : (
              <button
                onClick={nextPracticeQuestion}
                className="px-8 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
              >
                {currentPracticeIndex < affirmations.length - 1 ? 'Siguiente →' : 'Finalizar'}
              </button>
            )}
          </div>
        ) : practiceMode === "question" ? (
          <div className="flex justify-center">
            <button
              onClick={handleValidate}
              className="px-8 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              🔍 Validar
            </button>
          </div>
        ) : (
          <div className="flex justify-center">
            <button
              onClick={nextPracticeQuestion}
              className="px-8 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
            >
              {currentPracticeIndex < affirmations.length - 1 ? 'Siguiente →' : 'Finalizar'}
            </button>
          </div>
        )}
      </div>
    );
  }

  // Review Mode Rendering
  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors mb-4"
        >
          <span>←</span>
          Back to Dashboard
        </button>
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-light text-gray-900 mb-1">{title}</h2>
            <p className="text-gray-600">
              {isSessionMode ? "Review this themed session" : "Review your affirmations"}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={startPracticeMode}
              className="px-4 py-2 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 transition-colors"
            >
              🎯 Practice Mode
            </button>
            <button
              onClick={async () => {
                setViewMode("practice");
                await startParaphraseMode();
              }}
              className="px-4 py-2 bg-purple-500 text-white text-sm rounded-lg hover:bg-purple-600 transition-colors"
            >
              ✍️ Paraphrase Mode
            </button>
            <span className="text-sm text-gray-600">
              {currentAffirmationIndex + 1} of {affirmations.length}
            </span>
          </div>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2 mt-4">
          <div
            className="bg-black h-2 rounded-full transition-all duration-300"
            style={{ width: `${((currentAffirmationIndex + 1) / affirmations.length) * 100}%` }}
          ></div>
        </div>
      </div>

      {/* Affirmation Card */}
      <div className="bg-white border border-gray-200 rounded-lg p-12 mb-8 text-center min-h-[300px] flex items-center justify-center">
        <div>
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-2xl">💭</span>
          </div>
          <p className="text-xl leading-relaxed text-gray-900 max-w-2xl">
            {currentAffirmation?.content}
          </p>
          <div className="mt-6 text-sm text-gray-500">
            Affirmation {currentAffirmation?.order}
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between items-center">
        <button
          onClick={handlePrevious}
          disabled={currentAffirmationIndex === 0}
          className="px-6 py-3 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Previous
        </button>

        <div className="flex gap-2">
          {affirmations.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentAffirmationIndex(index)}
              className={`w-3 h-3 rounded-full transition-colors ${
                index === currentAffirmationIndex 
                  ? 'bg-black' 
                  : 'bg-gray-300 hover:bg-gray-400'
              }`}
            />
          ))}
        </div>

        <button
          onClick={handleNext}
          disabled={currentAffirmationIndex === affirmations.length - 1}
          className="px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Next
        </button>
      </div>

      {/* Source Content or Session Info */}
      {isSessionMode ? (
        <div className="mt-12 bg-blue-50 rounded-lg p-6">
          <h3 className="text-sm font-medium text-blue-900 mb-3">Session Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <h4 className="text-xs font-medium text-blue-700 mb-1">Session Theme</h4>
              <p className="text-sm text-blue-800">{currentSessionData?.theme}</p>
            </div>
            <div>
              <h4 className="text-xs font-medium text-blue-700 mb-1">Main Subjects</h4>
              <div className="flex flex-wrap gap-1">
                {Array.from(new Set(currentSessionData?.affirmations.map(a => a.subject) || [])).map(subject => (
                  <span key={subject} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                    {subject}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <h4 className="text-xs font-medium text-blue-700 mb-1">Categories</h4>
              <div className="flex flex-wrap gap-1">
                {Array.from(new Set(currentSessionData?.affirmations.map(a => a.category) || [])).map(category => (
                  <span key={category} className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                    {category}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        sourceContent && (
          <div className="mt-12 bg-gray-50 rounded-lg p-6">
            <h3 className="text-sm font-medium text-gray-900 mb-3">Source Content</h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              {sourceContent.length > 500
                ? `${sourceContent.substring(0, 500)}...`
                : sourceContent
              }
            </p>
          </div>
        )
      )}
    </div>
  );
}
