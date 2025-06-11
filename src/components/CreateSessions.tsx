import { useState } from "react";
import { useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";

interface CreateSessionsProps {
  onBack: () => void;
  onComplete: (collectionId: string) => void;
}

export function CreateSessions({ onBack, onComplete }: CreateSessionsProps) {
  const [content, setContent] = useState("");
  const [title, setTitle] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  const generateSessions = useAction(api.affirmations.generateSessions);

  const handleGenerate = async () => {
    if (content.trim().length < 500) {
      toast.error("Please provide at least 500 characters of content for meaningful session generation.");
      return;
    }

    setIsGenerating(true);
    try {
      const result = await generateSessions({
        content: content.trim(),
        title: title.trim() || undefined,
      });
      toast.success(`Generated ${result.sessions.sessions.length} intelligent sessions and saved to database!`);
      onComplete(result.collectionId);
    } catch (error) {
      console.error("Error generating sessions:", error);
      toast.error("Failed to generate sessions. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const wordCount = content.trim().split(/\s+/).filter(word => word.length > 0).length;
  const charCount = content.length;
  const isValidLength = charCount >= 500;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
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
          Generate Intelligent Sessions
        </h1>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Paste extensive content (articles, documents, chapters) and our AI will analyze it to create 
          multiple themed sessions, each containing 3 related affirmations grouped by semantic relationships.
        </p>
      </div>

      {/* Title Input */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-3">
          Collection Title (Optional)
        </label>
        <input
          id="title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g., History of the Bicycle, React Concepts, etc."
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent text-sm"
          disabled={isGenerating}
        />
        <p className="text-xs text-gray-500 mt-2">
          If not provided, a title will be generated automatically based on the date.
        </p>
      </div>

      {/* Content Input */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-3">
          Content to Analyze
        </label>
        <textarea
          id="content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Paste your extensive content here... (minimum 500 characters recommended for meaningful session generation)

Examples:
• Academic articles or research papers
• Book chapters or educational materials  
• Technical documentation or tutorials
• Historical texts or biographical content
• Scientific papers or case studies

The AI will analyze the content and create multiple sessions grouped by:
• Temporal relationships (chronological events)
• Thematic connections (related concepts)
• Causal relationships (cause and effect)
• Entity subjects (same people, places, concepts)"
          className="w-full h-96 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent resize-none text-sm"
          disabled={isGenerating}
        />
        
        {/* Content Stats */}
        <div className="flex justify-between items-center mt-3 text-sm">
          <div className="flex space-x-4">
            <span className={`${isValidLength ? 'text-green-600' : 'text-gray-500'}`}>
              {charCount} characters
            </span>
            <span className="text-gray-500">
              {wordCount} words
            </span>
          </div>
          <div className={`${isValidLength ? 'text-green-600' : 'text-orange-500'}`}>
            {isValidLength ? '✓ Ready for analysis' : 'Need more content for optimal results'}
          </div>
        </div>
      </div>

      {/* Generation Controls */}
      <div className="flex justify-center">
        <button
          onClick={handleGenerate}
          disabled={!content.trim() || isGenerating}
          className="px-8 py-4 bg-black text-white rounded-lg hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all duration-200 flex items-center space-x-3"
        >
          {isGenerating ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>Analyzing Content & Generating Sessions...</span>
            </>
          ) : (
            <>
              <span className="text-xl">🧠</span>
              <span>Generate Intelligent Sessions</span>
            </>
          )}
        </button>
      </div>

      {/* Help Section */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-3">How It Works</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-gray-600">
          <div>
            <h4 className="font-medium text-gray-900 mb-2">🔍 Semantic Analysis</h4>
            <p>Our AI analyzes your content to identify key concepts, entities, dates, and relationships between different pieces of information.</p>
          </div>
          <div>
            <h4 className="font-medium text-gray-900 mb-2">🎯 Intelligent Grouping</h4>
            <p>Affirmations are grouped into coherent sessions based on temporal, thematic, causal, and entity relationships.</p>
          </div>
          <div>
            <h4 className="font-medium text-gray-900 mb-2">📚 Multiple Sessions</h4>
            <p>Instead of just 3 affirmations, you'll get multiple sessions covering different aspects of your content.</p>
          </div>
          <div>
            <h4 className="font-medium text-gray-900 mb-2">🎓 Structured Learning</h4>
            <p>Each session tells a "mini-story" or explores a specific theme, making learning more organized and effective.</p>
          </div>
        </div>
      </div>

      {/* Examples Section */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-medium text-blue-900 mb-3">Example Session Groupings</h3>
        <div className="space-y-4 text-sm">
          <div>
            <h4 className="font-medium text-blue-900">📅 Temporal Session (History of Bicycles)</h4>
            <ul className="text-blue-700 ml-4 mt-1 space-y-1">
              <li>• "Baron von Drais invented the first bicycle in 1817"</li>
              <li>• "The first commercial bicycle was sold in 1819 in London"</li>
              <li>• "By 1825, bicycle manufacturing had spread across Europe"</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-blue-900">🔧 Thematic Session (Technical Evolution)</h4>
            <ul className="text-blue-700 ml-4 mt-1 space-y-1">
              <li>• "Early bicycles had wooden wheels without pedals"</li>
              <li>• "The pedal mechanism was added to bicycles in 1861"</li>
              <li>• "Pneumatic tires revolutionized bicycle comfort in 1888"</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
