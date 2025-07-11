import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { CreateSet } from "./CreateSet";
import { ReviewInterface } from "./ReviewInterface";
import { AffirmationSetList } from "./AffirmationSetList";
import { CreateSessions } from "./CreateSessions";
import { SessionsList } from "./SessionsList";
import { SessionCollectionsList } from "./SessionCollectionsList";

import { RecordScreen } from "./RecordScreen";
import { RecordingSettings } from "./RecordingSettings";
import { BackgroundTranscriber } from "./BackgroundTranscriber";
import { BackgroundTranscriptionNotifier, TranscriptionStatusPanel } from "./BackgroundTranscriptionNotifier";


export function Dashboard() {
  const [currentView, setCurrentView] = useState<
    | "home"
    | "create"
    | "review"
    | "sessions"
    | "sessions-list"
    | "collections"
    | "record-screen"
    | "recording-settings"
    | "background-transcriber"
  >("home");
  const [selectedSetId, setSelectedSetId] = useState<Id<"affirmationSets"> | null>(null);
  const [selectedCollectionId, setSelectedCollectionId] = useState<Id<"sessionCollections"> | null>(null);
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(null);


  const sets = useQuery(api.affirmations.getUserSets) || [];

  // Auto-initialization removed - users must create their own content

  if (currentView === "create") {
    return (
      <CreateSet
        onBack={() => setCurrentView("home")}
        onComplete={() => setCurrentView("home")}
      />
    );
  }

  if (currentView === "sessions") {
    return (
      <CreateSessions
        onBack={() => setCurrentView("home")}
        onComplete={(collectionId) => {
          setSelectedCollectionId(collectionId as Id<"sessionCollections">);
          setCurrentView("sessions-list");
        }}
      />
    );
  }

  if (currentView === "collections") {
    return (
      <SessionCollectionsList
        onBack={() => setCurrentView("home")}
        onSelectCollection={(collectionId) => {
          setSelectedCollectionId(collectionId);
          setCurrentView("sessions-list");
        }}
      />
    );
  }



  if (currentView === "sessions-list" && selectedCollectionId) {
    return (
      <SessionsList
        collectionId={selectedCollectionId}
        onBack={() => setCurrentView("collections")}
        onSelectSession={(collectionId, sessionId) => {
          setSelectedCollectionId(collectionId);
          setSelectedSessionId(sessionId);
          setCurrentView("review");
        }}
      />
    );
  }

  if (currentView === "review") {
    if (selectedCollectionId && selectedSessionId) {
      return (
        <ReviewInterface
          collectionId={selectedCollectionId}
          sessionId={selectedSessionId}
          onBack={() => {
            setCurrentView("sessions-list");
            setSelectedSessionId(null);
          }}
        />
      );
    } else if (selectedSetId) {
      return (
        <ReviewInterface
          setId={selectedSetId}
          onBack={() => {
            setCurrentView("home");
            setSelectedSetId(null);
          }}
        />
      );
    }
  }

  if (currentView === "record-screen") {
    return (
      <RecordScreen onBack={() => setCurrentView("home")} />
    );
  }

  if (currentView === "recording-settings") {
    return (
      <RecordingSettings onBack={() => setCurrentView("home")} />
    );
  }

  if (currentView === "background-transcriber") {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setCurrentView("home")}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <span>←</span>
            <span>Volver al Dashboard</span>
          </button>
        </div>
        <BackgroundTranscriber
          onTranscriptionComplete={(_result) => {
            // Aquí podrías integrar con el sistema de afirmaciones
            // Por ejemplo, generar afirmaciones a partir del texto transcrito
          }}
          onError={(_error) => {
            // Error handling can be implemented here if needed
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-12">

      {/* Background Transcription Notifier - Persiste durante toda la sesión */}
      <BackgroundTranscriptionNotifier
        onTranscriptionComplete={(_jobId, _result) => {
          // Aquí podrías navegar automáticamente o mostrar el resultado
        }}
      />

      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-light text-gray-900 mb-2">
          Your Learning Journey
        </h2>
        <p className="text-gray-600">
          {sets.length > 0
            ? `${sets.length} affirmation sets ready to explore`
            : "Create your first set of AI-generated affirmations to start learning."
          }
        </p>
      </div>

      {/* Panel de Estado de Transcripciones */}
      <TranscriptionStatusPanel />

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-6 max-w-7xl mx-auto">
        <button
          onClick={() => setCurrentView("sessions")}
          className="group p-8 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg hover:border-blue-300 transition-all duration-200 text-left"
        >
          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4 group-hover:bg-blue-200 transition-colors">
            <span className="text-xl">🧠</span>
          </div>
          <h3 className="text-lg font-medium text-blue-900 mb-2">Generate Sessions</h3>
          <p className="text-blue-700 text-sm">
            Analyze extensive content to create multiple themed learning sessions
          </p>
        </button>

        <button
          onClick={() => setCurrentView("collections")}
          className="group p-8 bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-lg hover:border-green-300 transition-all duration-200 text-left"
        >
          <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4 group-hover:bg-green-200 transition-colors">
            <span className="text-xl">📚</span>
          </div>
          <h3 className="text-lg font-medium text-green-900 mb-2">Browse Collections</h3>
          <p className="text-green-700 text-sm">
            View and practice your saved session collections
          </p>
        </button>



        <button
          onClick={() => setCurrentView("create")}
          className="group p-8 bg-white border border-gray-200 rounded-lg hover:border-gray-300 transition-all duration-200 text-left"
        >
          <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mb-4 group-hover:bg-gray-200 transition-colors">
            <span className="text-xl">✨</span>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Create Affirmations</h3>
          <p className="text-gray-600 text-sm">
            Generate a single set of 3 AI-powered affirmations
          </p>
        </button>

        <button
          onClick={() => setCurrentView("record-screen")}
          className="group p-8 bg-gradient-to-br from-purple-50 to-fuchsia-50 border border-purple-200 rounded-lg hover:border-purple-300 transition-all duration-200 text-left"
        >
          <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4 group-hover:bg-purple-200 transition-colors">
            <span className="text-xl">🎬</span>
          </div>
          <h3 className="text-lg font-medium text-purple-900 mb-2">Record Screen</h3>
          <p className="text-purple-700 text-sm">
            Graba tu pantalla y escucha el audio extraído de la grabación
          </p>
        </button>

        <button
          onClick={() => setCurrentView("recording-settings")}
          className="group p-8 bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-200 rounded-lg hover:border-orange-300 transition-all duration-200 text-left"
        >
          <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-4 group-hover:bg-orange-200 transition-colors">
            <span className="text-xl">⚙️</span>
          </div>
          <h3 className="text-lg font-medium text-orange-900 mb-2">Recording Settings</h3>
          <p className="text-orange-700 text-sm">
            Configura la detección de silencio y transcripción automática
          </p>
        </button>

        <button
          onClick={() => setCurrentView("background-transcriber")}
          className="group p-8 bg-gradient-to-br from-cyan-50 to-blue-50 border border-cyan-200 rounded-lg hover:border-cyan-300 transition-all duration-200 text-left"
        >
          <div className="w-12 h-12 bg-cyan-100 rounded-lg flex items-center justify-center mb-4 group-hover:bg-cyan-200 transition-colors">
            <span className="text-xl">🎤</span>
          </div>
          <h3 className="text-lg font-medium text-cyan-900 mb-2">AI Transcription</h3>
          <p className="text-cyan-700 text-sm">
            Transcripción avanzada con Whisper Medium + WebSocket en tiempo real
          </p>
        </button>

        {sets.length > 0 && (
          <button
            onClick={() => {
              if (sets.length > 0) {
                setSelectedSetId(sets[0]._id);
                setCurrentView("review");
              }
            }}
            className="group p-8 bg-black text-white rounded-lg hover:bg-gray-800 transition-all duration-200 text-left"
          >
            <div className="w-12 h-12 bg-white/10 rounded-lg flex items-center justify-center mb-4 group-hover:bg-white/20 transition-colors">
              <span className="text-xl">💭</span>
            </div>
            <h3 className="text-lg font-medium mb-2">Review Affirmations</h3>
            <p className="text-gray-300 text-sm">
              Explore your collection of insights
            </p>
          </button>
        )}
      </div>

      {/* Sets List */}
      {sets.length > 0 && (
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-6">Your Affirmation Sets</h3>
          <AffirmationSetList
            sets={sets}
            onReviewSet={(setId) => {
              setSelectedSetId(setId);
              setCurrentView("review");
            }}
          />
        </div>
      )}

      {sets.length === 0 && (
        <div className="text-center py-16">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">💭</span>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No content yet</h3>
          <p className="text-gray-600 mb-6">
            Create your first set of AI-generated affirmations to start learning
          </p>
          <button
            onClick={() => setCurrentView("create")}
            className="px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
          >
            Create Affirmations
          </button>
        </div>
      )}
    </div>
  );
}
