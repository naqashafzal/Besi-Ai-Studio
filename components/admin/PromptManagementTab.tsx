import React, { useState } from 'react';
import { TrashIcon, PencilIcon } from '../Icons';
import { PromptCategory, Prompt } from '../../types';
import { generatePromptFromImage } from '../../services/geminiService';
import { fileToGenerativePart } from '../../utils/fileHelpers';
import ImageUploader from '../ImageUploader';


interface PromptManagementTabProps {
  prompts: PromptCategory[];
  onAddPrompt: (prompt: { text: string; imageFile: File | null }, categoryTitle: string) => void;
  onRemovePrompt: (promptId: string) => void;
  onUpdatePrompt: (promptId: string, updates: { text: string; categoryTitle: string; imageFile: File | null; removeImage: boolean }, originalImageUrl: string | null) => void;
}

const PromptManagementTab: React.FC<PromptManagementTabProps> = ({ prompts, onAddPrompt, onRemovePrompt, onUpdatePrompt }) => {
  const [newPromptText, setNewPromptText] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [newPromptImageFile, setNewPromptImageFile] = useState<File | null>(null);
  const [newPromptImageDataUrl, setNewPromptImageDataUrl] = useState<string | null>(null);

  const [isGeneratingPrompt, setIsGeneratingPrompt] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);

  const [editingPrompt, setEditingPrompt] = useState<string | null>(null);

  const handleImageChange = (file: File | null) => {
    if (file) {
      setNewPromptImageFile(file);
      const reader = new FileReader();
      reader.onload = (e) => setNewPromptImageDataUrl(e.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setNewPromptImageFile(null);
      setNewPromptImageDataUrl(null);
    }
  };

  const handleGeneratePrompt = async () => {
    if (!newPromptImageFile) {
        setGenerationError("Please upload an image first.");
        return;
    }
    setIsGeneratingPrompt(true);
    setGenerationError(null);
    try {
        const imagePart = await fileToGenerativePart(newPromptImageFile);
        const generatedPrompt = await generatePromptFromImage(
            imagePart, 
            // FIX: Added missing 'pose' property to satisfy the function's type requirement.
            { pose: true, realism: true, style: true, background: true, clothing: false, lighting: false }, 
            ''
        );
        setNewPromptText(generatedPrompt);
    } catch (err) {
        setGenerationError(err instanceof Error ? err.message : "An unknown error occurred.");
    } finally {
        setIsGeneratingPrompt(false);
    }
  };

  const handleAddPrompt = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPromptText.trim() && newCategory.trim()) {
      onAddPrompt({ text: newPromptText, imageFile: newPromptImageFile }, newCategory);
      setNewPromptText('');
      setNewCategory('');
      setNewPromptImageFile(null);
      setNewPromptImageDataUrl(null);
    } else {
      alert('Please fill in prompt text and category.');
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div className="space-y-8">
        <div className="bg-background p-6 rounded-lg border border-border">
          <h3 className="text-xl font-semibold mb-4 text-text-primary">Add New Example Prompt</h3>
          <form onSubmit={handleAddPrompt} className="space-y-4">
            <textarea
              value={newPromptText}
              onChange={(e) => setNewPromptText(e.target.value)}
              placeholder="Prompt Text"
              className="w-full h-28 p-2 bg-panel-light border border-border rounded-lg"
              required
            />
            <input
              type="text"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              placeholder="Category"
              className="w-full p-2 bg-panel-light border border-border rounded-lg"
              list="category-suggestions"
              required
            />
            <datalist id="category-suggestions">
                {prompts.map(cat => <option key={cat.id} value={cat.title} />)}
            </datalist>
             <ImageUploader 
              onImageChange={handleImageChange}
              imageDataUrl={newPromptImageDataUrl}
              disabled={false}
            />
            <button
                type="button"
                onClick={handleGeneratePrompt}
                disabled={isGeneratingPrompt || !newPromptImageFile}
                className="w-full py-2 px-4 bg-panel-light text-text-primary font-semibold rounded-lg hover:bg-border disabled:opacity-50"
            >
                {isGeneratingPrompt ? 'Generating...' : 'Generate Prompt from Image'}
            </button>
            {generationError && <p className="text-red-400 text-sm mt-1">{generationError}</p>}
            <button
              type="submit"
              className="w-full py-2 px-4 bg-brand text-white font-semibold rounded-lg hover:bg-brand-hover"
            >
              Add Prompt
            </button>
          </form>
        </div>
      </div>
      <div className="space-y-6 max-h-[calc(90vh-180px)] overflow-y-auto">
        {prompts.map(category => (
          <div key={category.id}>
            <h4 className="text-lg font-bold text-brand mb-3">{category.title}</h4>
            <ul className="space-y-2 pr-2">
              {category.prompts.map((prompt) => {
                 const isEditing = editingPrompt === prompt.id;
                 
                return isEditing ? (
                  <EditPromptForm
                    key={`${prompt.id}-edit`}
                    prompt={prompt}
                    categoryTitle={category.title}
                    allCategories={prompts.map(c => c.title)}
                    onSave={(updates) => {
                        onUpdatePrompt(prompt.id, updates, prompt.imageUrl);
                        setEditingPrompt(null);
                    }}
                    onCancel={() => setEditingPrompt(null)}
                  />
                ) : (
                <li key={prompt.id} className="flex items-center justify-between p-2 bg-panel-light/50 rounded-md gap-2">
                  {prompt.imageUrl && <img src={prompt.imageUrl} alt="" className="w-10 h-10 object-cover rounded-md flex-shrink-0" />}
                  <p className="text-sm text-text-secondary flex-1 min-w-0" title={prompt.text}>{prompt.text}</p>
                  <div className="flex-shrink-0 flex items-center">
                    <button onClick={() => setEditingPrompt(prompt.id)} className="p-1 text-text-secondary hover:text-brand">
                        <PencilIcon className="w-5 h-5" />
                    </button>
                    <button onClick={() => onRemovePrompt(prompt.id)} className="p-1 text-red-400 hover:text-red-300">
                        <TrashIcon className="w-5 h-5" />
                    </button>
                  </div>
                </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
};

interface EditPromptFormProps {
  prompt: Prompt;
  categoryTitle: string;
  allCategories: string[];
  onSave: (updates: { text: string; categoryTitle: string; imageFile: File | null; removeImage: boolean }) => void;
  onCancel: () => void;
}

const EditPromptForm: React.FC<EditPromptFormProps> = ({ prompt, categoryTitle, allCategories, onSave, onCancel }) => {
  const [text, setText] = useState(prompt.text);
  const [category, setCategory] = useState(categoryTitle);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(prompt.imageUrl);
  const [removeImage, setRemoveImage] = useState(false);

  const handleImageChange = (file: File | null) => {
    if (file) {
      setImageFile(file);
      setRemoveImage(false);
      const reader = new FileReader();
      reader.onload = e => setImageDataUrl(e.target?.result as string);
      reader.readAsDataURL(file);
    } else { // Image removed via uploader
      setImageFile(null);
      setImageDataUrl(null);
      setRemoveImage(true);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim() && category.trim()) {
      onSave({ text, categoryTitle: category, imageFile, removeImage });
    } else {
      alert("Text and category cannot be empty.");
    }
  };

  return (
    <li className="bg-brand/10 p-4 rounded-lg border border-brand space-y-4">
      <form onSubmit={handleSave} className="space-y-3">
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          className="w-full h-24 p-2 bg-background border border-border rounded-lg"
        />
        <input
          type="text"
          value={category}
          onChange={e => setCategory(e.target.value)}
          list="edit-category-suggestions"
          className="w-full p-2 bg-background border border-border rounded-lg"
          placeholder="Category"
        />
        <datalist id="edit-category-suggestions">
          {allCategories.map(cat => <option key={cat} value={cat} />)}
        </datalist>
        <ImageUploader onImageChange={handleImageChange} imageDataUrl={imageDataUrl} disabled={false} />
        <div className="flex justify-end gap-2 mt-2">
          <button type="button" onClick={onCancel} className="px-3 py-1 text-sm bg-panel-light text-text-primary rounded hover:bg-border">Cancel</button>
          <button type="submit" className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700">Save</button>
        </div>
      </form>
    </li>
  );
};

export default PromptManagementTab;