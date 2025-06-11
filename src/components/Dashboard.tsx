import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { CreateSet } from "./CreateSet";
import { ReviewInterface } from "./ReviewInterface";
import { AffirmationSetList } from "./AffirmationSetList";


export function Dashboard() {
  const [currentView, setCurrentView] = useState<"home" | "create" | "review">("home");
  const [selectedSetId, setSelectedSetId] = useState<Id<"affirmationSets"> | null>(null);

  const sets = useQuery(api.affirmations.getUserSets) || [];

  const initializeSampleData = useMutation(api.affirmations.initializeSampleData);

  // Initialize sample data on first load
  useEffect(() => {
    if (sets.length === 0) {
      initializeSampleData();
    }
  }, [sets.length, initializeSampleData]);

  if (currentView === "create") {
    return (
      <CreateSet 
        onBack={() => setCurrentView("home")}
        onComplete={() => setCurrentView("home")}
      />
    );
  }



  if (currentView === "review" && selectedSetId) {
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

  return (
    <div className="space-y-12">
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

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
        <button
          onClick={() => setCurrentView("create")}
          className="group p-8 bg-white border border-gray-200 rounded-lg hover:border-gray-300 transition-all duration-200 text-left"
        >
          <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mb-4 group-hover:bg-gray-200 transition-colors">
            <span className="text-xl">✨</span>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Create Affirmations</h3>
          <p className="text-gray-600 text-sm">
            Upload documents or paste text to generate AI-powered affirmations
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
