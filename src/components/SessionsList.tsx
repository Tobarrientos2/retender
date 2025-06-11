import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";

interface Affirmation {
  content: string;
  order: number;
  subject: string;
  timeframe?: string;
  category: string;
}

interface Session {
  sessionId: number;
  theme: string;
  affirmations: Affirmation[];
}

interface SessionsListProps {
  collectionId: Id<"sessionCollections">;
  onBack: () => void;
  onSelectSession: (collectionId: Id<"sessionCollections">, sessionId: number) => void;
}

export function SessionsList({ collectionId, onBack, onSelectSession }: SessionsListProps) {
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(null);

  const collectionData = useQuery(api.affirmations.getSessionCollection, { collectionId });

  const handleSessionSelect = (sessionId: number) => {
    setSelectedSessionId(sessionId);
    onSelectSession(collectionId, sessionId);
  };

  if (!collectionData) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="w-6 h-6 border-2 border-gray-300 border-t-black rounded-full animate-spin"></div>
      </div>
    );
  }

  const { collection, sessions, totalAffirmations } = collectionData;

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center">
        <button
          onClick={onBack}
          className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-6 transition-colors"
        >
          <span className="mr-2">←</span>
          Back to Collections
        </button>
        <h1 className="text-3xl font-light text-gray-900 mb-4">
          {collection.title}
        </h1>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Your content has been analyzed and organized into {sessions.length} themed sessions
          containing {totalAffirmations} total affirmations. Each session explores a specific aspect or theme.
        </p>
      </div>

      {/* Sessions Stats */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
          <div>
            <div className="text-2xl font-bold text-blue-900">{sessions.length}</div>
            <div className="text-blue-700 text-sm">Themed Sessions</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-blue-900">{totalAffirmations}</div>
            <div className="text-blue-700 text-sm">Total Affirmations</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-blue-900">3</div>
            <div className="text-blue-700 text-sm">Affirmations per Session</div>
          </div>
        </div>
      </div>

      {/* Sessions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sessions.map((session) => (
          <div
            key={session.sessionId}
            className="bg-white border border-gray-200 rounded-lg p-6 hover:border-gray-300 hover:shadow-md transition-all duration-200 cursor-pointer"
            onClick={() => handleSessionSelect(session.sessionId)}
          >
            {/* Session Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Session {session.sessionId}
                </h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {session.theme}
                </p>
              </div>
              <div className="ml-3 flex-shrink-0">
                <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-gray-600">
                    {session.sessionId}
                  </span>
                </div>
              </div>
            </div>

            {/* Affirmations Preview */}
            <div className="space-y-3 mb-6">
              {session.affirmations.map((affirmation, index) => (
                <div key={index} className="bg-gray-50 rounded-lg p-3">
                  <div className="text-sm text-gray-900 leading-relaxed mb-2">
                    {affirmation.content}
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded">
                      {affirmation.category}
                    </span>
                    <span className="bg-green-100 text-green-700 px-2 py-1 rounded">
                      {affirmation.subject}
                    </span>
                    {affirmation.timeframe && (
                      <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded">
                        {affirmation.timeframe}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Action Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleSessionSelect(session.sessionId);
              }}
              className="w-full px-4 py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors text-sm font-medium"
            >
              Practice This Session
            </button>
          </div>
        ))}
      </div>

      {/* Session Analysis */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Session Analysis</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Category Distribution */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Categories</h4>
            <div className="space-y-1">
              {Array.from(new Set(
                sessions.flatMap(s => s.affirmations.map(a => a.category))
              )).map(category => (
                <div key={category} className="text-xs text-gray-600 bg-white px-2 py-1 rounded">
                  {category}
                </div>
              ))}
            </div>
          </div>

          {/* Subject Distribution */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Main Subjects</h4>
            <div className="space-y-1">
              {Array.from(new Set(
                sessions.flatMap(s => s.affirmations.map(a => a.subject))
              )).slice(0, 5).map(subject => (
                <div key={subject} className="text-xs text-gray-600 bg-white px-2 py-1 rounded">
                  {subject}
                </div>
              ))}
            </div>
          </div>

          {/* Timeframes */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Time Periods</h4>
            <div className="space-y-1">
              {Array.from(new Set(
                sessions.flatMap(s =>
                  s.affirmations.map(a => a.timeframe).filter(Boolean)
                )
              )).slice(0, 5).map(timeframe => (
                <div key={timeframe} className="text-xs text-gray-600 bg-white px-2 py-1 rounded">
                  {timeframe}
                </div>
              ))}
            </div>
          </div>

          {/* Session Themes */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Session Themes</h4>
            <div className="space-y-1">
              {sessions.slice(0, 3).map(session => (
                <div key={session.sessionId} className="text-xs text-gray-600 bg-white px-2 py-1 rounded">
                  Session {session.sessionId}
                </div>
              ))}
              {sessions.length > 3 && (
                <div className="text-xs text-gray-500">
                  +{sessions.length - 3} more...
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Help Text */}
      <div className="text-center text-sm text-gray-500">
        <p>
          Select any session to start practicing. Each session contains 3 carefully curated affirmations 
          that are thematically related and build upon each other for effective learning.
        </p>
      </div>
    </div>
  );
}
