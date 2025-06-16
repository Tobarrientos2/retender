import { useState } from "react";
import { useQuery, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";

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
type PracticeMode = "loading" | "question" | "validated";

interface AntiAffirmation {
  content: string;
  order: number;
  errorType: string;
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

export function ReviewInterface({ setId, sessionData, collectionId, sessionId, onBack }: ReviewInterfaceProps) {
  const [currentAffirmationIndex, setCurrentAffirmationIndex] = useState(0);
  const [viewMode, setViewMode] = useState<ViewMode>("review");
  const [practiceMode, setPracticeMode] = useState<PracticeMode>("loading");
  const [antiAffirmations, setAntiAffirmations] = useState<AntiAffirmation[]>([]);
  const [currentPracticeIndex, setCurrentPracticeIndex] = useState(0);
  const [isValidated, setIsValidated] = useState(false);
  const [editableText, setEditableText] = useState("");

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

      setAntiAffirmations(antiAffs);
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

  const nextPracticeQuestion = () => {
    if (currentPracticeIndex < affirmations.length - 1) {
      const nextIndex = currentPracticeIndex + 1;
      setCurrentPracticeIndex(nextIndex);
      setIsValidated(false);
      setEditableText(antiAffirmations[nextIndex]?.content || "");
      setPracticeMode("question");
    } else {
      // Practice completed
      setPracticeMode("validated");
    }
  };

  const resetPractice = () => {
    setCurrentPracticeIndex(0);
    setIsValidated(false);
    setEditableText(antiAffirmations[0]?.content || "");
    setPracticeMode("question");
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
            <p className="text-gray-600">Creating anti-affirmations for your practice session...</p>
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
              <h2 className="text-2xl font-light text-gray-900 mb-1">Practice Mode</h2>
              <p className="text-gray-600">Corrige la afirmación editando el texto y luego valida tu respuesta</p>
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
            {practiceMode === "validated" && isValidated ? (
              /* Mostrar comparación palabra por palabra */
              <div>
                <p className="text-lg font-medium text-black mb-4">Afirmación incorrecta:</p>
                <div className="text-xl leading-relaxed text-gray-900 max-w-2xl mx-auto" style={{ lineHeight: '2.4' }}>
                  {compareTexts(currentOriginal?.content || '', editableText).map((item, index) => (
                    <span key={index} className="inline-block mr-1">
                      {item.type === 'different' ? (
                        <span className="relative inline-block">
                          {/* Palabra correcta arriba - perfectamente centrada y más cerca */}
                          <span className="absolute -top-3 left-1/2 transform -translate-x-1/2 text-base text-green-700 whitespace-nowrap">
                            {item.correct}
                          </span>
                          {/* Palabra incorrecta tachada - sutil */}
                          <span className="line-through text-gray-500">
                            {item.incorrect}
                          </span>
                        </span>
                      ) : (
                        /* Palabra igual - normal */
                        <span className="mr-1">{item.word}</span>
                      )}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              /* Campo de texto editable para corregir la afirmación */
              <div>
                <p className="text-lg font-medium text-black mb-4">Corrige la afirmación incorrecta:</p>
                <textarea
                  value={editableText}
                  onChange={(e) => setEditableText(e.target.value)}
                  className="w-full max-w-2xl mx-auto p-4 text-xl leading-relaxed text-black border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={4}
                  placeholder="Edita el texto para corregir la afirmación..."
                />
              </div>
            )}
          </div>
        </div>

        {/* Practice Controls */}
        {practiceMode === "question" ? (
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
