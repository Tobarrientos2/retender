import { useState, useEffect, useRef } from "react";
import { useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";

interface CreateSetProps {
  onBack: () => void;
  onComplete: () => void;
}

interface ProcessedImage {
  id: string;
  name: string;
  status: 'processing' | 'completed' | 'error';
  content?: string;
  error?: string;
}

export function CreateSet({ onBack, onComplete }: CreateSetProps) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [processedImages, setProcessedImages] = useState<ProcessedImage[]>([]);
  const [isProcessingImages, setIsProcessingImages] = useState(false);
  
  const createSet = useAction(api.affirmations.createAffirmationSet);
  const analyzeImage = useAction(api.affirmations.analyzeImage);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Handle paste events for images
  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      if (!textareaRef.current || document.activeElement !== textareaRef.current) {
        return;
      }

      const items = e.clipboardData?.items;
      if (!items) return;

      const imageItems = Array.from(items).filter(item => item.type.startsWith('image/'));
      
      if (imageItems.length > 0) {
        e.preventDefault();
        await processImages(imageItems);
      }
    };

    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, []);

  const processImages = async (items: DataTransferItem[]) => {
    setIsProcessingImages(true);
    
    for (const item of items) {
      const file = item.getAsFile();
      if (!file) continue;

      const imageId = Math.random().toString(36).substr(2, 9);
      const newImage: ProcessedImage = {
        id: imageId,
        name: file.name || `Image ${Date.now()}`,
        status: 'processing'
      };

      setProcessedImages(prev => [...prev, newImage]);

      try {
        // Convert to base64
        const base64 = await fileToBase64(file);
        const base64Data = base64.split(',')[1]; // Remove data:image/...;base64, prefix

        // Analyze with AI
        const extractedText = await analyzeImage({
          imageBase64: base64Data,
          mimeType: file.type,
        });

        setProcessedImages(prev => 
          prev.map(img => 
            img.id === imageId 
              ? { ...img, status: 'completed' as const, content: extractedText }
              : img
          )
        );

        // Add to content
        setContent(prev => {
          const separator = prev ? '\n\n--- Image Content ---\n\n' : '';
          return prev + separator + extractedText;
        });

        toast.success(`Image "${newImage.name}" processed successfully`);

      } catch (error) {
        console.error('Error processing image:', error);
        setProcessedImages(prev => 
          prev.map(img => 
            img.id === imageId 
              ? { ...img, status: 'error' as const, error: 'Failed to process image' }
              : img
          )
        );
        toast.error(`Failed to process image "${newImage.name}"`);
      }
    }

    setIsProcessingImages(false);
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim() || !content.trim()) {
      toast.error("Please provide both title and content");
      return;
    }

    if (content.length < 100) {
      toast.error("Please provide more content (at least 100 characters) for better affirmation generation");
      return;
    }

    if (isProcessingImages) {
      toast.error("Please wait for images to finish processing");
      return;
    }

    setIsGenerating(true);
    
    try {
      await createSet({
        title: title.trim(),
        content: content.trim(),
      });
      
      toast.success("Affirmations generated successfully!");
      onComplete();
    } catch (error) {
      console.error("Error creating affirmations:", error);
      toast.error("Failed to generate affirmations. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePasteText = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setContent(prev => prev + (prev ? '\n\n' : '') + text);
      toast.success("Content pasted from clipboard");
    } catch (error) {
      toast.error("Failed to read from clipboard");
    }
  };

  const removeImage = (imageId: string) => {
    const image = processedImages.find(img => img.id === imageId);
    if (image?.content) {
      // Remove the image content from the main content
      const contentToRemove = image.content;
      setContent(prev => prev.replace(contentToRemove, '').replace(/\n\n--- Image Content ---\n\n/g, '').trim());
    }
    setProcessedImages(prev => prev.filter(img => img.id !== imageId));
  };

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
        <h2 className="text-2xl font-light text-gray-900 mb-2">
          Create Affirmation Set
        </h2>
        <p className="text-gray-600">
          Provide content and let AI generate 3 powerful affirmations for you. You can paste images directly with Ctrl+V!
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-900 mb-3">
            Set Title
          </label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Introduction to Machine Learning"
            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:border-black focus:ring-1 focus:ring-black outline-none transition-all"
            disabled={isGenerating}
          />
        </div>

        {/* Processed Images */}
        {processedImages.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-900">Processed Images</h3>
            <div className="space-y-2">
              {processedImages.map((image) => (
                <div key={image.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${
                      image.status === 'processing' ? 'bg-yellow-400 animate-pulse' :
                      image.status === 'completed' ? 'bg-green-400' : 'bg-red-400'
                    }`}></div>
                    <span className="text-sm text-gray-700">{image.name}</span>
                    {image.status === 'processing' && (
                      <span className="text-xs text-gray-500">Processing...</span>
                    )}
                    {image.status === 'error' && (
                      <span className="text-xs text-red-500">{image.error}</span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeImage(image.id)}
                    className="text-gray-400 hover:text-gray-600 text-sm"
                    disabled={isGenerating}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
          <div className="flex items-center justify-between mb-3">
            <label htmlFor="content" className="block text-sm font-medium text-gray-900">
              Content
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handlePasteText}
                className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
                disabled={isGenerating}
              >
                Paste text
              </button>
            </div>
          </div>
          <div className="relative">
            <textarea
              ref={textareaRef}
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Paste your document content, lecture notes, or any text you want to study. You can also paste images directly with Ctrl+V and they'll be processed automatically!"
              rows={16}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:border-black focus:ring-1 focus:ring-black outline-none transition-all resize-none font-mono text-sm"
              disabled={isGenerating}
            />
            {isProcessingImages && (
              <div className="absolute top-2 right-2 flex items-center gap-2 bg-white px-2 py-1 rounded shadow-sm border">
                <div className="w-3 h-3 border border-gray-300 border-t-black rounded-full animate-spin"></div>
                <span className="text-xs text-gray-600">Processing images...</span>
              </div>
            )}
          </div>
          <div className="flex justify-between items-center mt-2">
            <p className="text-xs text-gray-500">
              {content.length} characters
            </p>
            {content.length > 0 && content.length < 100 && (
              <p className="text-xs text-red-500">
                Minimum 100 characters recommended
              </p>
            )}
          </div>
        </div>

        <div className="flex gap-4">
          <button
            type="button"
            onClick={onBack}
            className="px-6 py-3 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            disabled={isGenerating || isProcessingImages}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isGenerating || isProcessingImages || !title.trim() || !content.trim() || content.length < 100}
            className="flex-1 px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isGenerating ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                Generating Affirmations...
              </>
            ) : (
              "Generate Affirmations"
            )}
          </button>
        </div>
      </form>

      {isGenerating && (
        <div className="mt-8 p-6 bg-gray-50 rounded-lg">
          <h3 className="font-medium text-gray-900 mb-2">AI is working...</h3>
          <p className="text-sm text-gray-600">
            Analyzing your content and creating intelligent flashcards. This may take a moment.
          </p>
        </div>
      )}
    </div>
  );
}
