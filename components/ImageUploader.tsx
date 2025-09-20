
import React, { useRef, useState } from 'react';
import { UploadIcon, TrashIcon } from './Icons';

interface ImageUploaderProps {
  onImageChange: (file: File | null) => void;
  imageDataUrl: string | null;
  disabled: boolean;
  onError: (message: string) => void;
}

const MAX_FILE_SIZE_MB = 3;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const RESIZE_TRIGGER_SIZE_BYTES = 350 * 1024; // Resize images larger than 350KB
const MAX_DIMENSION = 1024; // Resize to a max width/height of 1024px

const resizeImage = (file: File): Promise<File> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return reject(new Error('Could not get canvas context'));
        }

        let { width, height } = img;

        if (width > height) {
          if (width > MAX_DIMENSION) {
            height *= MAX_DIMENSION / width;
            width = MAX_DIMENSION;
          }
        } else {
          if (height > MAX_DIMENSION) {
            width *= MAX_DIMENSION / height;
            height = MAX_DIMENSION;
          }
        }

        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              // Create a new file name with .jpg extension
              const fileName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
              const resizedFile = new File([blob], `${fileName}.jpg`, {
                type: 'image/jpeg',
                lastModified: Date.now(),
              });
              resolve(resizedFile);
            } else {
              reject(new Error('Canvas to Blob conversion failed.'));
            }
          },
          'image/jpeg',
          0.9
        );
      };
      img.onerror = (error) => reject(error);
    };
    reader.onerror = (error) => reject(error);
  });
};


const ImageUploader: React.FC<ImageUploaderProps> = ({ onImageChange, imageDataUrl, disabled, onError }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > MAX_FILE_SIZE_BYTES) {
        onError(`Image is too large. Please upload an image under ${MAX_FILE_SIZE_MB}MB.`);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
        return;
      }
      onError(""); // Clear previous errors

      if (file.size > RESIZE_TRIGGER_SIZE_BYTES) {
        setIsProcessing(true);
        try {
          const resizedFile = await resizeImage(file);
          onImageChange(resizedFile);
        } catch (err) {
          onError("Failed to process image. Please try another one.");
          console.error(err);
        } finally {
          setIsProcessing(false);
        }
      } else {
        onImageChange(file);
      }
    }
  };

  const handleRemoveImage = () => {
    onImageChange(null);
    onError(""); // Clear errors on removal
    if(fileInputRef.current) {
        fileInputRef.current.value = "";
    }
  };
  
  const isDisabled = disabled || isProcessing;

  const handleAreaClick = () => {
    if(!isDisabled) {
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
        disabled={isDisabled}
      />
      {imageDataUrl ? (
        <div className="relative group">
          <img src={imageDataUrl} alt="Preview" className="w-full h-48 object-cover rounded-lg" />
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-lg">
            <button
              onClick={handleRemoveImage}
              className="p-3 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors disabled:opacity-50"
              disabled={isDisabled}
              aria-label="Remove image"
            >
              <TrashIcon className="w-6 h-6" />
            </button>
          </div>
        </div>
      ) : (
        <div
          onClick={handleAreaClick}
          className={`w-full h-48 border-2 border-dashed border-gray-600 rounded-lg flex flex-col items-center justify-center text-gray-400 transition-colors duration-200 ${isDisabled ? 'cursor-not-allowed bg-gray-700/50' : 'cursor-pointer hover:border-brand-primary hover:bg-gray-700/50'}`}
        >
          {isProcessing ? (
             <>
              <svg className="animate-spin h-10 w-10 mb-2 text-brand-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p className="font-semibold">Processing image...</p>
              <p className="text-sm">Optimizing for upload</p>
            </>
          ) : (
            <>
              <UploadIcon className="w-10 h-10 mb-2" />
              <p className="font-semibold">Click to upload or drag & drop</p>
              <p className="text-sm">PNG, JPG, or WEBP (up to {MAX_FILE_SIZE_MB}MB)</p>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default ImageUploader;
