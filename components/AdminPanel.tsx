
import React, { useState, useEffect, useCallback } from 'react';
import { PromptCategory, ExamplePrompt } from '../types';
import { TrashIcon, SparklesIcon, PencilIcon, ClipboardIcon } from './Icons';
import ImageUploader from './ImageUploader';

interface AdminPanelProps {
  prompts: PromptCategory[];
  onAddPrompt: (prompt: ExamplePrompt, categoryTitle: string) => void;
  onRemovePrompt: (promptText: string, categoryTitle: string) => void;
  onClose: () => void;
  onGenerateExampleImage: (promptText: string, categoryTitle: string) => void;
  generatingExample: { prompt: string; category: string } | null;
  hasBaseImage: boolean;
  editingPrompt: { prompt: ExamplePrompt; categoryTitle: string } | null;
  onStartEdit: (data: { prompt: ExamplePrompt; categoryTitle: string }) => void;
  onCancelEdit: () => void;
  onUpdatePrompt: (originalPromptText: string, categoryTitle: string, newPromptData: ExamplePrompt) => void;
  onGeneratePromptFromImage: (imageFile: File) => Promise<string>;
  credits: number;
}

const EditPromptModal: React.FC<Omit<AdminPanelProps, 'prompts' | 'onAddPrompt' | 'onRemovePrompt' | 'onClose' | 'onGenerateExampleImage' | 'generatingExample' | 'hasBaseImage' | 'onStartEdit' | 'onGeneratePromptFromImage' | 'credits'>> = ({ editingPrompt, onCancelEdit, onUpdatePrompt }) => {
  const [editedText, setEditedText] = useState('');
  const [editedImageUrl, setEditedImageUrl] = useState('');

  useEffect(() => {
    if (editingPrompt) {
      setEditedText(editingPrompt.prompt.prompt);
      setEditedImageUrl(editingPrompt.prompt.imageUrl);
    }
  }, [editingPrompt]);

  if (!editingPrompt) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdatePrompt(editingPrompt.prompt.prompt, editingPrompt.categoryTitle, { prompt: editedText, imageUrl: editedImageUrl });
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-gray-800 rounded-2xl shadow-2xl border border-gray-700 w-full max-w-lg">
        <header className="p-4 border-b border-gray-700 flex justify-between items-center">
          <h2 className="text-xl font-bold">Edit Prompt</h2>
          <button onClick={onCancelEdit} className="text-gray-400 hover:text-white transition-colors text-2xl">&times;</button>
        </header>
        <form onSubmit={handleSave} className="p-6 space-y-4">
          <div>
            <label htmlFor="edit-prompt-text" className="block text-sm font-medium text-gray-300 mb-1">Prompt Text</label>
            <textarea
              id="edit-prompt-text"
              value={editedText}
              onChange={(e) => setEditedText(e.target.value)}
              className="w-full h-32 p-2 bg-gray-900 border border-gray-600 rounded-lg focus:ring-2 focus:ring-brand-primary"
              required
            />
          </div>
          <div>
            <label htmlFor="edit-image-url" className="block text-sm font-medium text-gray-300 mb-1">Image URL</label>
            <input
              id="edit-image-url"
              type="url"
              value={editedImageUrl}
              onChange={(e) => setEditedImageUrl(e.target.value)}
              className="w-full p-2 bg-gray-900 border border-gray-600 rounded-lg focus:ring-2 focus:ring-brand-primary"
              required
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onCancelEdit} className="px-4 py-2 bg-gray-600 text-white font-semibold rounded-lg hover:bg-gray-500 transition-colors">Cancel</button>
            <button type="submit" className="px-4 py-2 bg-brand-primary text-white font-semibold rounded-lg hover:bg-brand-secondary transition-colors">Save Changes</button>
          </div>
        </form>
      </div>
    </div>
  );
}


const AdminPanel: React.FC<AdminPanelProps> = (props) => {
  const [newPromptText, setNewPromptText] = useState('');
  const [newImageUrl, setNewImageUrl] = useState('');
  const [newCategory, setNewCategory] = useState('');

  // State for Image to Prompt feature
  const [imageToPromptFile, setImageToPromptFile] = useState<File | null>(null);
  const [imageToPromptUrl, setImageToPromptUrl] = useState<string | null>(null);
  const [isGeneratingPrompt, setIsGeneratingPrompt] = useState(false);
  const [generatedPrompt, setGeneratedPrompt] = useState('');
  const [promptGenError, setPromptGenError] = useState('');

  const handleAddPrompt = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPromptText.trim() && newImageUrl.trim() && newCategory.trim()) {
      props.onAddPrompt({ prompt: newPromptText, imageUrl: newImageUrl }, newCategory);
      setNewPromptText('');
      setNewImageUrl('');
      setNewCategory('');
    } else {
      alert('Please fill in all fields.');
    }
  };

  const handleImageForPromptChange = useCallback((file: File | null) => {
    setImageToPromptFile(file);
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => setImageToPromptUrl(e.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setImageToPromptUrl(null);
    }
  }, []);

  const handleGeneratePromptFromImage = async () => {
    if (!imageToPromptFile) return;
    setIsGeneratingPrompt(true);
    setGeneratedPrompt('');
    setPromptGenError('');
    try {
      const result = await props.onGeneratePromptFromImage(imageToPromptFile);
      setGeneratedPrompt(result);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'An unknown error occurred.';
      setPromptGenError(msg);
    } finally {
      setIsGeneratingPrompt(false);
    }
  };


  return (
    <>
      <EditPromptModal {...props} />
      <div className="fixed inset-0 bg-black/80 z-40 flex items-center justify-center p-4 animate-fade-in">
        <div className="bg-gray-800 rounded-2xl shadow-2xl border border-gray-700 w-full max-w-4xl h-[90vh] flex flex-col">
          <header className="p-4 border-b border-gray-700 flex justify-between items-center flex-shrink-0">
            <h2 className="text-2xl font-bold">Admin Panel - Manage Prompts</h2>
            <button
              onClick={props.onClose}
              className="text-gray-400 hover:text-white transition-colors text-2xl"
              aria-label="Close admin panel"
            >
              &times;
            </button>
          </header>

          <div className="flex-grow overflow-y-auto p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Left Column: Forms */}
              <div className="space-y-8">
                {/* Add New Prompt Form */}
                <div className="bg-gray-900/50 p-6 rounded-lg border border-gray-700">
                  <h3 className="text-xl font-semibold mb-4 text-gray-100">Add New Prompt</h3>
                  <form onSubmit={handleAddPrompt} className="space-y-4">
                    <div>
                      <label htmlFor="new-prompt-text" className="block text-sm font-medium text-gray-300 mb-1">Prompt Text</label>
                      <textarea
                        id="new-prompt-text"
                        value={newPromptText}
                        onChange={(e) => setNewPromptText(e.target.value)}
                        placeholder="A professional corporate headshot..."
                        className="w-full h-28 p-2 bg-gray-900 border border-gray-600 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition duration-200 resize-none"
                        required
                      />
                    </div>
                    <div>
                      <label htmlFor="new-image-url" className="block text-sm font-medium text-gray-300 mb-1">Image URL</label>
                      <input
                        id="new-image-url"
                        type="url"
                        value={newImageUrl}
                        onChange={(e) => setNewImageUrl(e.target.value)}
                        placeholder="https://images.pexels.com/..."
                        className="w-full p-2 bg-gray-900 border border-gray-600 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition duration-200"
                        required
                      />
                    </div>
                    <div>
                      <label htmlFor="new-category" className="block text-sm font-medium text-gray-300 mb-1">Category</label>
                      <input
                        id="new-category"
                        type="text"
                        value={newCategory}
                        onChange={(e) => setNewCategory(e.target.value)}
                        placeholder="e.g., Professional Headshots"
                        className="w-full p-2 bg-gray-900 border border-gray-600 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition duration-200"
                        required
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full py-2 px-4 bg-brand-primary text-white font-semibold rounded-lg hover:bg-brand-secondary transition-colors"
                    >
                      Add Prompt
                    </button>
                  </form>
                </div>
                {/* Image to Prompt Generator */}
                <div className="bg-gray-900/50 p-6 rounded-lg border border-gray-700">
                  <h3 className="text-xl font-semibold mb-4 text-gray-100">Image to Prompt</h3>
{/* FIX: Pass the required 'onError' prop to the ImageUploader component. */}
                   <ImageUploader onImageChange={handleImageForPromptChange} imageDataUrl={imageToPromptUrl} disabled={isGeneratingPrompt} onError={setPromptGenError} />
                   <button onClick={handleGeneratePromptFromImage} disabled={!imageToPromptFile || isGeneratingPrompt} className="mt-4 w-full flex items-center justify-center py-2 px-4 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50">
                       <SparklesIcon className="w-5 h-5 mr-2" />
                       {isGeneratingPrompt ? 'Generating...' : 'Generate Prompt from Image'}
                   </button>
                   {isGeneratingPrompt && (
                     <div className="mt-2 text-center text-sm text-gray-400">Analyzing image...</div>
                   )}
                   {promptGenError && <p className="mt-2 text-sm text-red-400">{promptGenError}</p>}
                   {generatedPrompt && (
                     <div className="mt-4">
                         <label className="block text-sm font-medium text-gray-300 mb-1">Generated Prompt:</label>
                         <textarea value={generatedPrompt} readOnly className="w-full h-24 p-2 bg-gray-800 border border-gray-600 rounded-lg resize-none"></textarea>
                         <button onClick={() => { setNewPromptText(generatedPrompt); }} className="mt-2 w-full flex items-center justify-center text-sm py-2 px-3 bg-gray-600 text-white font-semibold rounded-lg hover:bg-gray-500 transition-colors">
                            <ClipboardIcon className="w-4 h-4 mr-2"/>
                            Use this Prompt
                         </button>
                     </div>
                   )}
                </div>
              </div>

              {/* Existing Prompts List */}
              <div className="space-y-6">
                {!props.hasBaseImage && (
                  <div className="p-3 bg-yellow-900/50 border border-yellow-700 rounded-lg text-center text-yellow-300 text-sm">
                      Upload a base image in the main view to generate new example images.
                  </div>
                )}
                {props.prompts.map(category => (
                  <div key={category.title}>
                    <h4 className="text-lg font-bold text-brand-secondary mb-3 border-b border-gray-700 pb-1">{category.title}</h4>
                    <ul className="space-y-3 max-h-[80vh] overflow-y-auto pr-2">
                      {category.prompts.map(prompt => (
                        <li key={prompt.prompt} className="flex items-center justify-between p-2 bg-gray-700/50 rounded-md gap-2">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <img src={prompt.imageUrl} alt="" className="w-12 h-12 object-cover rounded flex-shrink-0" />
                            <p className="text-sm text-gray-300 truncate" title={prompt.prompt}>{prompt.prompt}</p>
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <button
                                onClick={() => props.onStartEdit({ prompt, categoryTitle: category.title })}
                                disabled={!!props.generatingExample || !!props.editingPrompt}
                                className="p-1 text-gray-400 hover:text-white hover:bg-gray-500/20 rounded-full transition-colors disabled:opacity-50"
                                title="Edit prompt"
                            >
                                <PencilIcon className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => props.onGenerateExampleImage(prompt.prompt, category.title)}
                              disabled={!props.hasBaseImage || !!props.generatingExample || props.credits < 1}
                              className="p-1 text-blue-400 hover:text-blue-300 hover:bg-blue-500/20 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              title={!props.hasBaseImage ? "Upload a base image first" : props.credits < 1 ? "Not enough credits" : "Generate new feature image (1 Credit)"}
                            >
                              {props.generatingExample?.prompt === prompt.prompt && props.generatingExample?.category === category.title ? (
                                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                  </svg>
                              ) : (
                                  <SparklesIcon className="w-5 h-5" />
                              )}
                            </button>
                            <button
                              onClick={() => props.onRemovePrompt(prompt.prompt, category.title)}
                              disabled={!!props.generatingExample}
                              className="p-1 text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded-full transition-colors flex-shrink-0 disabled:opacity-50"
                              aria-label={`Remove prompt: ${prompt.prompt}`}
                            >
                              <TrashIcon className="w-5 h-5" />
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default AdminPanel;