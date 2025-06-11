import { Id } from "../../convex/_generated/dataModel";

interface AffirmationSet {
  _id: Id<"affirmationSets">;
  title: string;
  description?: string;
  totalAffirmations: number;
  _creationTime: number;
}

interface AffirmationSetListProps {
  sets: AffirmationSet[];
  onReviewSet: (setId: Id<"affirmationSets">) => void;
}

export function AffirmationSetList({ sets, onReviewSet }: AffirmationSetListProps) {
  return (
    <div className="grid gap-4">
      {sets.map((set) => (
        <AffirmationSetCard key={set._id} set={set} onReview={() => onReviewSet(set._id)} />
      ))}
    </div>
  );
}

function AffirmationSetCard({ set, onReview }: { set: AffirmationSet; onReview: () => void }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 hover:border-gray-300 transition-all">
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
              <span className="text-lg">💭</span>
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900">{set.title}</h3>
              {set.description && (
                <p className="text-sm text-gray-600">{set.description}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-4 text-xs text-gray-500 ml-13">
            <span>{set.totalAffirmations} affirmations</span>
            <span>Created {new Date(set._creationTime).toLocaleDateString()}</span>
          </div>
        </div>
        
        <div className="flex flex-col items-end gap-2">
          <button
            onClick={onReview}
            className="px-4 py-2 bg-black text-white text-sm rounded-lg hover:bg-gray-800 transition-colors"
          >
            Review
          </button>
        </div>
      </div>
    </div>
  );
}
