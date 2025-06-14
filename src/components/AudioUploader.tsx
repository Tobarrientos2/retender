import { useState } from 'react';
import { useSimpleTranscription } from '../hooks/useTranscriptionApi';

export default function AudioUploader() {
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleTranscribe = async () => {
    if (!selectedFile) return;
    await transcribe(selectedFile, 'auto');
  };

  return (
    <div className="p-4 border rounded max-w-md mx-auto space-y-4">
      <h2 className="text-xl font-semibold">Transcribe Audio</h2>

      <input
        type="file"
        accept="audio/*"
        onChange={handleFileChange}
        className="block w-full text-sm"
      />

      <button
        disabled={!selectedFile || isTranscribing}
        onClick={handleTranscribe}
        className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
      >
        {isTranscribing ? 'Transcribing…' : 'Transcribe'}
      </button>

      {isTranscribing && (
        <div className="w-full bg-gray-200 rounded h-2">
          <div
            className="bg-blue-500 h-2 rounded"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      )}

      {error && (
        <div className="text-red-600 text-sm">
          {error} <button onClick={clearError} className="underline">clear</button>
        </div>
      )}

      {result && (
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold">Transcript</h3>
            <button onClick={clearResult} className="text-sm underline">clear</button>
          </div>
          <pre className="whitespace-pre-wrap bg-gray-50 p-2 rounded max-h-64 overflow-y-auto text-sm">
            {result.text}
          </pre>
        </div>
      )}
    </div>
  );
}
