import { useState } from 'react';
import { useSimpleTranscription } from '../hooks/useTranscriptionApi';
import { useScreenRecorder } from '../hooks/useScreenRecorder';

/**
 * TranscriberForm
 * Interfaz mínima para cargar o grabar audio y obtener la transcripción
 */
export function TranscriberForm({ onBack }: { onBack: () => void }) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const {
    isTranscribing,
    progress,
    result,
    error,
    transcribe,
    clearResult,
    clearError,
  } = useSimpleTranscription();

  /* Opcional: grabación simple usando useScreenRecorder (micro-grabación) */
  const {
    isRecording,
    recordedBlob,
    startRecording,
    stopRecording,
    resetRecording,
  } = useScreenRecorder();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleTranscribe = async (file: File | Blob | null) => {
    if (!file) return;
    await transcribe(file, 'auto');
  };

  const handleUseRecording = async () => {
    if (recordedBlob) {
      await handleTranscribe(recordedBlob);
    }
  };

  return (
    <div className="space-y-6 max-w-lg mx-auto">
      <button onClick={onBack} className="text-sm text-blue-600 underline">
        ← Back
      </button>

      <h2 className="text-2xl font-light text-gray-900">Audio Transcription</h2>

      {/* File input */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">Upload audio file</label>
        <input
          type="file"
          accept="audio/*"
          onChange={handleFileChange}
          className="block w-full text-sm"
        />
        <button
          disabled={!selectedFile || isTranscribing}
          onClick={() => handleTranscribe(selectedFile)}
          className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
        >
          {isTranscribing ? 'Transcribing…' : 'Transcribe file'}
        </button>
      </div>

      {/* Recorder */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">Or record audio</label>
        {!isRecording && !recordedBlob && (
          <button onClick={startRecording} className="px-4 py-2 bg-green-600 text-white rounded">
            Start recording
          </button>
        )}
        {isRecording && (
          <button onClick={stopRecording} className="px-4 py-2 bg-red-600 text-white rounded">
            Stop recording
          </button>
        )}
        {recordedBlob && (
          <div className="space-x-2">
            <button onClick={handleUseRecording} className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50" disabled={isTranscribing}>
              {isTranscribing ? 'Transcribing…' : 'Transcribe recording'}
            </button>
            <button onClick={resetRecording} className="px-2 py-2 text-sm underline">
              Discard
            </button>
          </div>
        )}
      </div>

      {/* Progress */}
      {isTranscribing && (
        <div className="w-full bg-gray-200 rounded h-2">
          <div
            className="bg-blue-500 h-2 rounded"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="text-red-600 text-sm">
          {error}{' '}
          <button onClick={clearError} className="underline">
            clear
          </button>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold">Transcript</h3>
            <button onClick={clearResult} className="text-sm underline">
              clear
            </button>
          </div>
          <pre className="whitespace-pre-wrap bg-gray-50 p-3 rounded max-h-80 overflow-y-auto text-sm">
            {result.text}
          </pre>
        </div>
      )}
    </div>
  );
}
