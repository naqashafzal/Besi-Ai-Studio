
import React, { useRef } from 'react';
import { UploadIcon, TrashIcon } from './Icons';

interface ImageUploaderProps {
  onImageChange: (file: File | null) => void;
  imageDataUrl: string | null;
  disabled: boolean;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({ onImageChange, imageDataUrl, disabled }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onImageChange(file);
    }
  };

  const handleRemoveImage = () => {
    onImageChange(null);
    if(fileInputRef.current) {
        fileInputRef.current.value = "";
    }
  };
  
  const handleAreaClick = () => {
    if(!disabled) {
      fileInputRef.current?.click();
    }
  };


  return (
    <div className="w-full">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept="image/png, image/jpeg, image/webp"
        disabled={disabled}
      />
      {imageDataUrl ? (
        <div className="relative group">
          <img src={imageDataUrl} alt="Preview" className="w-full h-48 object-cover rounded-lg" />
          <div className="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-lg">
            <button
              onClick={handleRemoveImage}
              className="p-3 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors disabled:opacity-50"
              disabled={disabled}
              aria-label="Remove image"
            >
              <TrashIcon className="w-6 h-6" />
            </button>
          </div>
        </div>
      ) : (
        <div
          onClick={handleAreaClick}
          className={`w-full h-48 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center text-text-secondary transition-colors duration-200 ${disabled ? 'cursor-not-allowed bg-panel-light/50' : 'cursor-pointer hover:border-brand hover:bg-panel-light/50'}`}
        >
          <UploadIcon className="w-10 h-10 mb-2" />
          <p className="font-semibold">Click to upload or drag & drop</p>
          <p className="text-sm">PNG, JPG, or WEBP</p>
        </div>
      )}
    </div>
  );
};

export default ImageUploader;