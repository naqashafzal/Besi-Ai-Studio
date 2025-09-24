import { GenerativePart } from '../types';

export const fileToGenerativePart = (file: File): Promise<GenerativePart> => {
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
    // FIX: Corrected typo from readDataURL to readAsDataURL.
    reader.readAsDataURL(file);
  });
};