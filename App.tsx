
import React, { useState, useCallback, useEffect } from 'react';
import JSZip from 'jszip';
import { GenerationState, GenerativePart, ExamplePrompt, PromptCategory } from './types';
import { generateImage, generatePromptFromImage } from './services/geminiService';
import { EXAMPLE_PROMPTS } from './constants';
import { UploadIcon, SparklesIcon, DownloadIcon, CreditIcon, ClipboardIcon } from './components/Icons';
import LoadingIndicator from './components/LoadingIndicator';
import ImageDisplay from './components/ImageDisplay';
import ImageUploader from './components/ImageUploader';
import HistoryDisplay from './components/HistoryDisplay';
import AdminPanel from './components/AdminPanel';

const HISTORY_KEY = 'ai-portrait-history';
const PROMPTS_KEY = 'ai-portrait-prompts';
const CREDITS_KEY = 'ai-portrait-credits';
const HISTORY_LIMIT = 50;
const INITIAL_CREDITS = 20;
const GENERATION_COST = 1;
const EXAMPLE_GENERATION_COST = 1;
const ADD_CREDITS_AMOUNT = 20;


// Component for displaying bulk generated images
const BulkImageDisplay: React.FC<{ images: { prompt: string, imageUrl: string }[] }> = ({ images }) => {
  return (
    <div className="w-full">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-2">
        {images.map(({ prompt, imageUrl }, index) => (
          <div key={`${index}-${prompt}`} className="group relative aspect-square animate-fade-in">
            <img
              src={imageUrl}
              alt={prompt.substring(0, 50)}
              className="w-full h-full object-cover rounded-lg shadow-lg border-2 border-gray-700"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex items-end p-2 pointer-events-none rounded-lg">
              <p className="text-white text-xs leading-tight">{prompt}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const fileToGenerativePart = (file: File): Promise<GenerativePart> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64String = (reader.result as string)?.split(',')[1];
      if (base64String) {
        resolve({
          mimeType: file.type,
          data: base64String,
        });
      } else {
        reject(new Error("Failed to read file as base64."));
      }
    };
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
};

const App: React.FC = () => {
  const [prompt, setPrompt] = useState<string>('');
  const [generationState, setGenerationState] = useState<GenerationState>(GenerationState.IDLE);
  const [generatedImageUrls, setGeneratedImageUrls] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Image states
  const [uploadedImage, setUploadedImage] = useState<File | null>(null);
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [styleImage, setStyleImage] = useState<File | null>(null);
  const [styleImageDataUrl, setStyleImageDataUrl] = useState<string | null>(null);
  
  // Prompt examples state
  const [examplePrompts, setExamplePrompts] = useState<PromptCategory[]>(EXAMPLE_PROMPTS);
  const [promptSearch, setPromptSearch] = useState('');
  const [showAllPrompts, setShowAllPrompts] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>(EXAMPLE_PROMPTS[0].title);

  // History state
  const [history, setHistory] = useState<string[]>([]);
  
  // Admin state
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [generatingExample, setGeneratingExample] = useState<{ prompt: string; category: string } | null>(null);
  const [editingPrompt, setEditingPrompt] = useState<{ prompt: ExamplePrompt; categoryTitle: string } | null>(null);

  // Bulk generation state
  const [isBulkGenerating, setIsBulkGenerating] = useState<boolean>(false);
  const [bulkGenerationProgress, setBulkGenerationProgress] = useState({ current: 0, total: 0 });
  const [bulkGeneratedImages, setBulkGeneratedImages] = useState<{ prompt: string, imageUrl: string }[]>([]);

  // Credit system state
  const [credits, setCredits] = useState<number>(0);

  // Style prompt generator state
  const [isGeneratingStylePrompt, setIsGeneratingStylePrompt] = useState(false);
  const [generatedStylePrompt, setGeneratedStylePrompt] = useState('');
  const [stylePromptError, setStylePromptError] = useState<string | null>(null);


  useEffect(() => {
    try {
      // Load History
      const storedHistory = localStorage.getItem(HISTORY_KEY);
      if (storedHistory) setHistory(JSON.parse(storedHistory));
      
      // Load Prompts
      const storedPrompts = localStorage.getItem(PROMPTS_KEY);
      if (storedPrompts) {
        const parsedPrompts = JSON.parse(storedPrompts);
        setExamplePrompts(parsedPrompts);
        if (parsedPrompts.length > 0 && !parsedPrompts.some((p: PromptCategory) => p.title === selectedCategory)) {
          setSelectedCategory(parsedPrompts[0].title);
        }
      }

      // Load Credits
      const storedCredits = localStorage.getItem(CREDITS_KEY);
      if (storedCredits) {
        setCredits(JSON.parse(storedCredits));
      } else {
        setCredits(INITIAL_CREDITS);
      }

    } catch (error) {
      console.error("Failed to parse data from localStorage", error);
      setHistory([]);
      setExamplePrompts(EXAMPLE_PROMPTS);
      setCredits(INITIAL_CREDITS);
    }
  }, []);
  
  useEffect(() => {
    try {
      localStorage.setItem(PROMPTS_KEY, JSON.stringify(examplePrompts));
    } catch (e) {
      console.error("Failed to save prompts to localStorage:", e);
    }
  }, [examplePrompts]);
  
  useEffect(() => {
    try {
      localStorage.setItem(CREDITS_KEY, JSON.stringify(credits));
    } catch (e) {
      console.error("Failed to save credits to localStorage:", e);
    }
  }, [credits]);

  const spendCredits = useCallback((amount: number): boolean => {
    if (credits < amount) {
      setError(`Not enough credits. This action costs ${amount} credits.`);
      return false;
    }
    setCredits(prev => prev - amount);
    return true;
  }, [credits]);

  const addCredits = (amount: number) => {
    setCredits(prev => prev + amount);
  };

  const addToHistory = (urls: string[]) => {
    setHistory(prev => {
      const newHistory = [...urls, ...prev].slice(0, HISTORY_LIMIT);
      try {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory));
      } catch (e) {
        console.error("Failed to save history to localStorage:", e);
      }
      return newHistory;
    });
  };

  const clearHistory = () => {
    setHistory([]);
    try {
      localStorage.removeItem(HISTORY_KEY);
    } catch (e) {
      console.error("Failed to remove history from localStorage:", e);
    }
  };

  const handleImageChange = useCallback((file: File | null) => {
    setUploadedImage(file);
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => setImageDataUrl(e.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setImageDataUrl(null);
    }
  }, []);

  const handleStyleImageChange = useCallback((file: File | null) => {
    setStyleImage(file);
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => setStyleImageDataUrl(e.target?.result as string);
        reader.readAsDataURL(file);
    } else {
        setStyleImageDataUrl(null);
    }
  }, []);


  const handleGenerateClick = useCallback(async () => {
    if (!prompt || !uploadedImage) {
      setError('Please upload a base image and enter a prompt.');
      return;
    }

    // Lowered limit to 650KB to account for ~33% base64 encoding overhead and stay under 1MB server limit.
    const MAX_COMBINED_SIZE_BYTES = 650 * 1024;
    const totalSize = (uploadedImage?.size || 0) + (styleImage?.size || 0);

    if (totalSize > MAX_COMBINED_SIZE_BYTES) {
        setError(`The combined size of your images is too large for the server, even after optimization. Please try using smaller source images or only a single image.`);
        return;
    }
    
    if (!spendCredits(GENERATION_COST)) return;

    setGenerationState(GenerationState.LOADING);
    setError(null);
    setGeneratedImageUrls(null);
    setBulkGeneratedImages([]);

    try {
      const baseImagePart = await fileToGenerativePart(uploadedImage);
      const styleImagePart = styleImage ? await fileToGenerativePart(styleImage) : null;
      
      const imageUrls = await generateImage(prompt, baseImagePart, styleImagePart);
      
      setGeneratedImageUrls(imageUrls);
      addToHistory(imageUrls);
      setGenerationState(GenerationState.SUCCESS);
    } catch (e) {
      console.error(e);
      // Refund credits on failure
      addCredits(GENERATION_COST);
      const errorMessage = e instanceof Error ? e.message : 'An unexpected error occurred.';
      setError(errorMessage);
      setGenerationState(GenerationState.ERROR);
    }
  }, [prompt, uploadedImage, styleImage, credits, spendCredits]);
  
  const useExamplePrompt = useCallback((example: ExamplePrompt) => {
    setPrompt(example.prompt);
    
    // Smooth scroll to the top to see the prompt input field
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleBulkGenerate = async () => {
    if (!uploadedImage) {
        setError('Please upload a base image before starting a bulk generation.');
        return;
    }

    const allPrompts = examplePrompts.flatMap(cat => cat.prompts);
    const totalCost = allPrompts.length;
    
    if (!spendCredits(totalCost)) {
      setError(`Bulk generation requires ${totalCost} credits, but you only have ${credits}.`);
      return;
    }

    setIsBulkGenerating(true);
    setError(null);
    setGeneratedImageUrls(null);
    setBulkGeneratedImages([]);
    setBulkGenerationProgress({ current: 0, total: allPrompts.length });

    const generated: { prompt: string, imageUrl: string }[] = [];
    let failedCount = 0;

    try {
        const baseImagePart = await fileToGenerativePart(uploadedImage);

        for (let i = 0; i < allPrompts.length; i++) {
            const currentPrompt = allPrompts[i];
            setBulkGenerationProgress({ current: i + 1, total: allPrompts.length });
            try {
                // Introduce a delay to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 1200));
                
                const imageUrls = await generateImage(currentPrompt.prompt, baseImagePart, null);
                if (imageUrls.length > 0) {
                    const newImage = { prompt: currentPrompt.prompt, imageUrl: imageUrls[0] };
                    generated.push(newImage);
                    setBulkGeneratedImages(prev => [...prev, newImage]);
                    addToHistory([imageUrls[0]]);
                } else {
                   failedCount++;
                }
            } catch (err) {
                console.error(`Failed to generate for prompt: "${currentPrompt.prompt}"`, err);
                failedCount++;
            }
        }

        // After generation, create and download ZIP
        const zip = new JSZip();
        await Promise.all(generated.map(async ({ imageUrl, prompt }) => {
            try {
                const response = await fetch(imageUrl);
                const blob = await response.blob();
                // Sanitize prompt for filename
                const fileName = `${prompt.substring(0, 30).replace(/[^a-z0-9]/gi, '_')}.png`;
                zip.file(fileName, blob);
            } catch (e) {
                console.error("Error fetching or adding image to zip:", e);
            }
        }));

        const zipBlob = await zip.generateAsync({ type: 'blob' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(zipBlob);
        link.download = 'ai-portraits-collection.zip';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        if (failedCount > 0) {
            // Refund credits for failed images
            addCredits(failedCount);
            setError(`Bulk generation complete. ${failedCount} images failed to generate. ${failedCount} credits have been refunded.`);
        }

    } catch (e) {
        const errorMessage = e instanceof Error ? e.message : 'An unexpected error occurred during bulk generation.';
        setError(errorMessage);
        // Refund all credits on catastrophic failure
        addCredits(totalCost);
    } finally {
        setIsBulkGenerating(false);
    }
  };
  
  const addPrompt = (newPrompt: ExamplePrompt, categoryTitle: string) => {
    setExamplePrompts(prev => {
      const newPrompts = JSON.parse(JSON.stringify(prev));
      const categoryIndex = newPrompts.findIndex((c: PromptCategory) => c.title === categoryTitle);
      if (categoryIndex > -1) {
        newPrompts[categoryIndex].prompts.push(newPrompt);
      } else {
        newPrompts.push({ title: categoryTitle, prompts: [newPrompt] });
        setSelectedCategory(categoryTitle);
      }
      return newPrompts;
    });
  };

  const removePrompt = (promptText: string, categoryTitle: string) => {
    setExamplePrompts(prev => {
      const newPrompts = JSON.parse(JSON.stringify(prev));
      const categoryIndex = newPrompts.findIndex((c: PromptCategory) => c.title === categoryTitle);
      if (categoryIndex > -1) {
        newPrompts[categoryIndex].prompts = newPrompts[categoryIndex].prompts.filter((p: ExamplePrompt) => p.prompt !== promptText);
        // If category is now empty, remove it
        if (newPrompts[categoryIndex].prompts.length === 0) {
          newPrompts.splice(categoryIndex, 1);
          if (selectedCategory === categoryTitle && newPrompts.length > 0) {
            setSelectedCategory(newPrompts[0].title);
          } else if (newPrompts.length === 0) {
            setSelectedCategory('');
          }
        }
      }
      return newPrompts;
    });
  };
  
  const updatePrompt = (originalPromptText: string, categoryTitle: string, newPromptData: ExamplePrompt) => {
    setExamplePrompts(prev => {
      const newPrompts = JSON.parse(JSON.stringify(prev));
      const categoryIndex = newPrompts.findIndex((c: PromptCategory) => c.title === categoryTitle);
      if (categoryIndex > -1) {
        const promptIndex = newPrompts[categoryIndex].prompts.findIndex((p: ExamplePrompt) => p.prompt === originalPromptText);
        if (promptIndex > -1) {
          newPrompts[categoryIndex].prompts[promptIndex] = newPromptData;
        }
      }
      return newPrompts;
    });
    setEditingPrompt(null);
  };

  const handleGenerateExampleImage = async (promptToGenerate: string, categoryTitle: string) => {
    if (!uploadedImage) {
        setError('Please upload a base image first to generate an example image.');
        return;
    }
    
    if (!spendCredits(EXAMPLE_GENERATION_COST)) return;

    setGeneratingExample({ prompt: promptToGenerate, category: categoryTitle });
    setError(null);

    try {
        const baseImagePart = await fileToGenerativePart(uploadedImage);
        const imageUrls = await generateImage(promptToGenerate, baseImagePart, null);

        if (imageUrls && imageUrls.length > 0) {
            const newImageUrl = imageUrls[0];
            setExamplePrompts(prev => {
                const newPrompts = JSON.parse(JSON.stringify(prev));
                const category = newPrompts.find((c: PromptCategory) => c.title === categoryTitle);
                if (category) {
                    const prompt = category.prompts.find((p: ExamplePrompt) => p.prompt === promptToGenerate);
                    if (prompt) {
                        prompt.imageUrl = newImageUrl;
                    }
                }
                return newPrompts;
            });
            addToHistory(imageUrls);
        } else {
            throw new Error("Generation succeeded but no image was returned.");
        }
    } catch (e) {
        console.error(e);
        // Refund credits on failure
        addCredits(EXAMPLE_GENERATION_COST);
        const errorMessage = e instanceof Error ? e.message : 'An unexpected error occurred while generating the example.';
        setError(errorMessage);
        alert(errorMessage);
    } finally {
        setGeneratingExample(null);
    }
  };
  
  const handleGeneratePromptFromImage = useCallback(async (imageFile: File): Promise<string> => {
    const imagePart = await fileToGenerativePart(imageFile);
    return await generatePromptFromImage(imagePart);
  }, []);
  
  const handleGenerateStylePrompt = async () => {
    if (!styleImage) return;
    setIsGeneratingStylePrompt(true);
    setGeneratedStylePrompt('');
    setStylePromptError(null);
    try {
      const result = await handleGeneratePromptFromImage(styleImage);
      setGeneratedStylePrompt(result);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'An unknown error occurred.';
      setStylePromptError(msg);
    } finally {
      setIsGeneratingStylePrompt(false);
    }
  };

  const handleAppendStylePrompt = () => {
    if (!generatedStylePrompt) return;
    setPrompt(prev => {
      const trimmedPrev = prev.trim();
      if (trimmedPrev === '') {
        return generatedStylePrompt;
      }
      if (/[.,;!?]$/.test(trimmedPrev)) {
         return `${trimmedPrev} ${generatedStylePrompt}`;
      }
      return `${trimmedPrev}, ${generatedStylePrompt}`;
    });
    setGeneratedStylePrompt('');
  };


  const filteredPrompts = examplePrompts
    .map(category => ({
      ...category,
      prompts: category.prompts.filter(p => p.prompt.toLowerCase().includes(promptSearch.toLowerCase()))
    }))
    .filter(category => category.prompts.length > 0);
  
  const displayedPrompts = showAllPrompts
    ? filteredPrompts
    : filteredPrompts.filter(c => c.title === selectedCategory);
    
  const bulkGenerationCost = examplePrompts.flatMap(cat => cat.prompts).length;

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 font-sans p-4 sm:p-6 lg:p-8">
        {showAdminPanel && (
            <AdminPanel
                prompts={examplePrompts}
                onAddPrompt={addPrompt}
                onRemovePrompt={removePrompt}
                onClose={() => setShowAdminPanel(false)}
                onGenerateExampleImage={handleGenerateExampleImage}
                generatingExample={generatingExample}
                hasBaseImage={!!uploadedImage}
                editingPrompt={editingPrompt}
                onStartEdit={setEditingPrompt}
                onCancelEdit={() => setEditingPrompt(null)}
                onUpdatePrompt={updatePrompt}
                onGeneratePromptFromImage={handleGeneratePromptFromImage}
                credits={credits}
            />
        )}
      <main className="max-w-7xl mx-auto">
        <header className="text-center mb-10">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-brand-primary via-purple-400 to-brand-secondary">
            BesiAi Portrait Generator
          </h1>
          <p className="mt-4 text-lg text-gray-300 max-w-2xl mx-auto">
            Transform your photos into professional headshots or epic sci-fi portraits. Upload a reference image and describe your desired style.
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Panel: Inputs */}
          <div className="lg:col-span-3 space-y-6">
            <div className="bg-gray-800 p-4 rounded-xl shadow-lg border border-gray-700">
              <h3 className="font-semibold mb-3 text-lg">1. Upload Base Image</h3>
              <ImageUploader onImageChange={handleImageChange} imageDataUrl={imageDataUrl} disabled={generationState === GenerationState.LOADING || isBulkGenerating} onError={setError} />
            </div>
            
             <div className="bg-gray-800 p-4 rounded-xl shadow-lg border border-gray-700">
              <h3 className="font-semibold mb-3 text-lg">2. (Optional) Style Reference</h3>
               <p className="text-xs text-gray-400 mb-3">Upload an image to influence artistic style, or generate a prompt from it.</p>
              <ImageUploader onImageChange={handleStyleImageChange} imageDataUrl={styleImageDataUrl} disabled={generationState === GenerationState.LOADING || isBulkGenerating} onError={setError} />
               <button 
                onClick={handleGenerateStylePrompt} 
                disabled={!styleImage || isGeneratingStylePrompt} 
                className="mt-4 w-full flex items-center justify-center py-2 px-4 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
              >
                <SparklesIcon className="w-5 h-5 mr-2" />
                {isGeneratingStylePrompt ? 'Generating...' : 'Generate Style Prompt'}
              </button>
              {stylePromptError && <p className="mt-2 text-sm text-red-400">{stylePromptError}</p>}
              {generatedStylePrompt && (
                <div className="mt-4 animate-fade-in">
                  <label className="block text-sm font-medium text-gray-300 mb-1">Generated Style:</label>
                  <textarea value={generatedStylePrompt} readOnly className="w-full h-24 p-2 bg-gray-900 border border-gray-600 rounded-lg resize-none"></textarea>
                  <button 
                    onClick={handleAppendStylePrompt} 
                    className="mt-2 w-full flex items-center justify-center text-sm py-2 px-3 bg-gray-600 text-white font-semibold rounded-lg hover:bg-gray-500 transition-colors"
                  >
                    <ClipboardIcon className="w-4 h-4 mr-2"/>
                    Append to Main Prompt
                  </button>
                </div>
              )}
            </div>

            <div className="bg-gray-800 p-4 rounded-xl shadow-lg border border-gray-700">
              <h3 className="font-semibold mb-3 text-lg">3. Describe Your Vision</h3>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g., A professional corporate headshot..."
                className="w-full h-32 p-3 bg-gray-900 border border-gray-600 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition duration-200 resize-none disabled:opacity-50"
                disabled={generationState === GenerationState.LOADING || isBulkGenerating}
              />
            </div>
            
            {error && generationState === GenerationState.IDLE && (
              <div className="animate-fade-in p-3 bg-red-900/30 border border-red-700/50 rounded-lg text-red-300 text-sm text-center" role="alert">
                {error}
              </div>
            )}

            <div className="bg-gray-800 p-4 rounded-xl shadow-lg border border-gray-700 space-y-3">
               <div className="flex justify-between items-center">
                   <h3 className="font-semibold text-lg">Credits</h3>
                   <div className="flex items-center gap-2 px-3 py-1 bg-gray-900 rounded-full text-yellow-400">
                      <CreditIcon className="w-5 h-5"/>
                      <span className="font-bold text-lg">{credits}</span>
                   </div>
               </div>
               <button onClick={() => addCredits(ADD_CREDITS_AMOUNT)} className="w-full py-2 text-sm bg-green-600/20 text-green-300 border border-green-500/50 rounded-lg hover:bg-green-600/40 hover:text-green-200 transition-colors duration-200">
                   Add {ADD_CREDITS_AMOUNT} Credits
               </button>
            </div>

            <button
              onClick={handleGenerateClick}
              disabled={!prompt || !uploadedImage || generationState === GenerationState.LOADING || isBulkGenerating || credits < GENERATION_COST}
              className="w-full flex items-center justify-center py-3 px-6 bg-gradient-to-r from-brand-primary to-brand-secondary text-white font-bold text-lg rounded-lg shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              title={credits < GENERATION_COST ? `Not enough credits. Needs ${GENERATION_COST}.` : ''}
            >
              <SparklesIcon className="w-6 h-6 mr-2" />
              {generationState === GenerationState.LOADING ? 'Generating...' : `Generate Image (${GENERATION_COST} Credit)`}
            </button>
          </div>

          {/* Center Panel: Output */}
          <div className="lg:col-span-5 flex items-center justify-center bg-gray-800/50 border-2 border-dashed border-gray-700 rounded-xl min-h-[30rem] p-4">
              {isBulkGenerating ? (
                  <div className="flex flex-col items-center text-center">
                    <LoadingIndicator />
                    <p className="mt-4 text-xl">Generating {bulkGenerationProgress.total} images...</p>
                    <p className="text-gray-400">({bulkGenerationProgress.current} / {bulkGenerationProgress.total})</p>
                    <div className="w-full bg-gray-700 rounded-full h-2.5 mt-4">
                        <div className="bg-brand-primary h-2.5 rounded-full" style={{ width: `${(bulkGenerationProgress.current / bulkGenerationProgress.total) * 100}%` }}></div>
                    </div>
                     <p className="text-xs text-gray-500 mt-4">This may take several minutes. Please don't close this tab. A ZIP file will download when complete.</p>
                  </div>
              ) : bulkGeneratedImages.length > 0 ? (
                  <BulkImageDisplay images={bulkGeneratedImages} />
              ) : generationState === GenerationState.LOADING ? (
                <LoadingIndicator />
              ) : generationState === GenerationState.SUCCESS && generatedImageUrls ? (
                <ImageDisplay imageUrls={generatedImageUrls} />
              ) : generationState === GenerationState.ERROR && error ? (
                <div className="text-center text-red-400 p-4 bg-red-900/20 rounded-lg" role="alert">
                  <h3 className="font-bold">Generation Failed</h3>
                  <p className="text-sm mt-1">{error}</p>
                </div>
              ) : (
                <div className="text-center text-gray-500">
                  <SparklesIcon className="w-16 h-16 mx-auto mb-4" />
                  <p className="font-semibold">Your generated portrait will appear here</p>
                </div>
              )}
          </div>

          {/* Right Panel: Examples */}
          <div className="lg:col-span-4">
            <div className="bg-gray-800 p-4 rounded-xl shadow-lg border border-gray-700 h-full">
              <h3 className="font-semibold mb-3 text-lg">Inspiration Gallery</h3>
              <input 
                type="text"
                placeholder="Search prompts..."
                value={promptSearch}
                onChange={(e) => setPromptSearch(e.target.value)}
                className="w-full p-2 mb-3 bg-gray-900 border border-gray-600 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-brand-primary"
              />
              <div className="flex flex-wrap gap-2 mb-4">
                  <button onClick={() => setShowAllPrompts(!showAllPrompts)} className={`px-3 py-1 text-sm rounded-full transition-colors ${showAllPrompts ? 'bg-brand-primary text-white' : 'bg-gray-700 hover:bg-gray-600'}`}>All</button>
                  {examplePrompts.map(cat => (
                     <button key={cat.title} onClick={() => { setSelectedCategory(cat.title); setShowAllPrompts(false);}} className={`px-3 py-1 text-sm rounded-full transition-colors ${!showAllPrompts && selectedCategory === cat.title ? 'bg-brand-primary text-white' : 'bg-gray-700 hover:bg-gray-600'}`}>{cat.title}</button>
                  ))}
              </div>
              <div className="space-y-4 max-h-[calc(100vh-25rem)] overflow-y-auto pr-2">
                {displayedPrompts.map(category => (
                  <div key={category.title}>
                    {showAllPrompts && <h4 className="font-bold text-brand-secondary mb-2">{category.title}</h4>}
                    <div className="grid grid-cols-2 gap-2">
                      {category.prompts.map(ex => (
                        <div key={ex.prompt} className="group relative cursor-pointer aspect-square" onClick={() => useExamplePrompt(ex)}>
                           <img src={ex.imageUrl} alt={ex.prompt.substring(0,30)} className="w-full h-full object-cover rounded-lg group-hover:opacity-40 transition-opacity" />
                           <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent p-2 flex items-end opacity-0 group-hover:opacity-100 transition-opacity">
                               <p className="text-white text-xs font-semibold leading-tight">{ex.prompt}</p>
                           </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                {displayedPrompts.length === 0 && <p className="text-gray-500 text-center py-8">No prompts found.</p>}
              </div>
            </div>
          </div>
        </div>

        {history.length > 0 && <HistoryDisplay imageUrls={history} onClear={clearHistory} />}

         <footer className="text-center mt-12 pt-8 border-t border-gray-700/50">
           <div className="flex justify-center items-center gap-4">
             <button
              onClick={handleBulkGenerate}
              disabled={!uploadedImage || isBulkGenerating || generationState === GenerationState.LOADING || credits < bulkGenerationCost}
              className="px-4 py-2 bg-green-600/20 text-green-300 border border-green-500/50 rounded-lg hover:bg-green-600/40 hover:text-green-200 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              title={credits < bulkGenerationCost ? `Not enough credits. Needs ${bulkGenerationCost}.` : ''}
            >
              {`Generate & Download All (${bulkGenerationCost} Credits)`}
            </button>
            <button
                onClick={() => setShowAdminPanel(true)}
                className="px-4 py-2 bg-gray-600/20 text-gray-300 border border-gray-500/50 rounded-lg hover:bg-gray-600/40 hover:text-gray-200 transition-colors duration-200"
            >
                Admin Panel
            </button>
           </div>
          <p className="text-gray-500 text-sm mt-4">&copy; {new Date().getFullYear()} BesiAi. All rights reserved.</p>
        </footer>

      </main>
    </div>
  );
};

export default App;