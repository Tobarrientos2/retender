import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";

interface SessionCollectionsListProps {
  onBack: () => void;
  onSelectCollection: (collectionId: Id<"sessionCollections">) => void;
}

export function SessionCollectionsList({ onBack, onSelectCollection }: SessionCollectionsListProps) {
  const collections = useQuery(api.affirmations.getSessionCollections);

  if (collections === undefined) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="w-6 h-6 border-2 border-gray-300 border-t-black rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center">
        <button
          onClick={onBack}
          className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-6 transition-colors"
        >
          <span className="mr-2">←</span>
          Back to Dashboard
        </button>
        <h1 className="text-3xl font-light text-gray-900 mb-4">
          Your Session Collections
        </h1>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Browse your saved session collections. Each collection contains multiple themed sessions 
          generated from your content analysis.
        </p>
      </div>

      {/* Collections Grid */}
      {collections.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">🧠</span>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Session Collections Yet</h3>
          <p className="text-gray-600 mb-6">
            Create your first session collection by analyzing some content.
          </p>
          <button
            onClick={onBack}
            className="px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
          >
            Generate Your First Sessions
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {collections.map((collection) => (
            <div
              key={collection._id}
              className="bg-white border border-gray-200 rounded-lg p-6 hover:border-gray-300 hover:shadow-md transition-all duration-200 cursor-pointer"
              onClick={() => onSelectCollection(collection._id)}
            >
              {/* Collection Header */}
              <div className="mb-4">
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {collection.title}
                </h3>
                <p className="text-sm text-gray-500">
                  Created {new Date(collection._creationTime).toLocaleDateString()}
                </p>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-blue-50 rounded-lg p-3 text-center">
                  <div className="text-xl font-bold text-blue-900">{collection.totalSessions}</div>
                  <div className="text-xs text-blue-700">Sessions</div>
                </div>
                <div className="bg-green-50 rounded-lg p-3 text-center">
                  <div className="text-xl font-bold text-green-900">{collection.totalAffirmations}</div>
                  <div className="text-xs text-green-700">Affirmations</div>
                </div>
              </div>

              {/* Content Preview */}
              <div className="mb-4">
                <p className="text-sm text-gray-600 leading-relaxed">
                  {collection.sourceContent.length > 150 
                    ? `${collection.sourceContent.substring(0, 150)}...` 
                    : collection.sourceContent
                  }
                </p>
              </div>

              {/* Content Type Badge */}
              <div className="flex justify-between items-center">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  collection.contentType === 'programming' 
                    ? 'bg-purple-100 text-purple-800' 
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {collection.contentType === 'programming' ? '💻 Programming' : '📚 General'}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectCollection(collection._id);
                  }}
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  View Sessions →
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Quick Actions */}
      {collections.length > 0 && (
        <div className="text-center">
          <button
            onClick={onBack}
            className="px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
          >
            Generate New Sessions
          </button>
        </div>
      )}

      {/* Stats Summary */}
      {collections.length > 0 && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Your Learning Progress</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
            <div>
              <div className="text-2xl font-bold text-gray-900">{collections.length}</div>
              <div className="text-gray-600 text-sm">Collections Created</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-900">
                {collections.reduce((sum, c) => sum + c.totalSessions, 0)}
              </div>
              <div className="text-blue-700 text-sm">Total Sessions</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-900">
                {collections.reduce((sum, c) => sum + c.totalAffirmations, 0)}
              </div>
              <div className="text-green-700 text-sm">Total Affirmations</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
