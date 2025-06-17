import { Id } from "../../convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useState } from "react";

interface AffirmationSet {
  _id: Id<"affirmationSets">;
  title: string;
  description?: string;
  totalAffirmations: number;
  _creationTime: number;
  createdAt?: number;
  transcriptionJobId?: string;
  metadata?: {
    source?: string;
    audioInfo?: any;
    createdTimestamp?: number;
    generatedAt?: string;
  };
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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const deleteSet = useMutation(api.affirmations.deleteAffirmationSet);
  
  // Determinar el timestamp a usar (createdAt tiene prioridad sobre _creationTime)
  const timestamp = set.createdAt || set._creationTime;
  const isFromAudio = set.metadata?.source === 'audio_transcription' || set.metadata?.source === 'transcription';

  const handleDelete = async () => {
    try {
      await deleteSet({ setId: set._id });
      setShowDeleteConfirm(false);
    } catch (error) {
      console.error('Error deleting set:', error);
    }
  };

  // Formatear fecha y hora
  const formatDateTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('es-ES', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 hover:border-gray-300 transition-all">
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              isFromAudio ? 'bg-purple-100' : 'bg-gray-100'
            }`}>
              <span className="text-lg">{isFromAudio ? '🎤' : '💭'}</span>
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900">{set.title}</h3>
              {set.description && (
                <p className="text-sm text-gray-600">{set.description}</p>
              )}
            </div>
          </div>

          {/* Metadata y timestamps */}
          <div className="flex items-center gap-4 text-xs text-gray-500 ml-13">
            <span className="flex items-center">
              <span className="w-2 h-2 bg-blue-500 rounded-full mr-1"></span>
              {set.totalAffirmations} affirmations
            </span>

            <span className="flex items-center">
              <span className="w-2 h-2 bg-green-500 rounded-full mr-1"></span>
              {formatDateTime(timestamp)}
            </span>

            {isFromAudio && (
              <span className="flex items-center">
                <span className="w-2 h-2 bg-purple-500 rounded-full mr-1"></span>
                Audio transcription
              </span>
            )}

            {set.transcriptionJobId && (
              <span className="flex items-center">
                <span className="w-2 h-2 bg-orange-500 rounded-full mr-1"></span>
                Job: {set.transcriptionJobId.slice(0, 8)}...
              </span>
            )}

            {set.metadata?.audioInfo?.duration && (
              <span className="flex items-center">
                <span className="w-2 h-2 bg-indigo-500 rounded-full mr-1"></span>
                {set.metadata.audioInfo.duration.toFixed(1)}s audio
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
          {isFromAudio && (
            <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full">
              🎤 Audio
            </span>
          )}
          <div className="flex gap-2">
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
              title="Eliminar set"
            >
              🗑️
            </button>
            <button
              onClick={onReview}
              className="px-4 py-2 bg-black text-white text-sm rounded-lg hover:bg-gray-800 transition-colors"
            >
              Review
            </button>
          </div>
        </div>
      </div>

      {/* Modal de confirmación */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              ¿Eliminar set de afirmaciones?
            </h3>
            <p className="text-gray-600 mb-4">
              Esta acción eliminará permanentemente "{set.title}" y todas sus afirmaciones. 
              No se puede deshacer.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
