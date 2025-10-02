import React from 'react';
import PolaroidCard from './PolaroidCard';
import { DecadeGeneration } from '../types';
import { DownloadIcon, PhotoIcon } from './Icons';

interface PastForwardGridProps {
  generations: Record<string, DecadeGeneration>;
  onRegenerate: (decade: string) => void;
  onDownloadAlbum: (format: 'jpeg' | 'png') => void;
  isGenerating: boolean;
  uploadedImage: boolean;
  downloadingFormat: 'jpeg' | 'png' | null;
}

const PastForwardGrid: React.FC<PastForwardGridProps> = ({ generations, onRegenerate, onDownloadAlbum, isGenerating, uploadedImage, downloadingFormat }) => {
    const decades = Object.keys(generations);
    const successfulGenerations = Object.values(generations).filter(g => (g as DecadeGeneration).status === 'success').length;
    const isDownloading = downloadingFormat !== null;
    
    if (decades.length === 0 && !isGenerating) {
        return (
            <div className="flex flex-col items-center justify-center text-center text-text-secondary">
              <div className="p-4 bg-panel-light rounded-full mb-4">
                <PhotoIcon className="w-16 h-16 text-brand" />
              </div>
              <h2 className="text-2xl font-bold text-text-primary">Ready for a Trip Through Time?</h2>
              <p>{ uploadedImage ? 'Select your decades and start the journey!' : 'Upload a photo to get started.'}</p>
            </div>
        );
    }

    return (
        <div className="w-full animate-fade-in">
            {successfulGenerations > 1 && (
                <div className="text-center mb-6 space-y-3 sm:space-y-0 sm:flex sm:justify-center sm:gap-4">
                    <button 
                        onClick={() => onDownloadAlbum('jpeg')} 
                        disabled={isDownloading || isGenerating}
                        className="w-full sm:w-auto inline-flex items-center justify-center py-3 px-6 bg-green-600 text-white font-bold rounded-lg shadow-lg hover:bg-green-700 transform hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-50 disabled:cursor-wait"
                    >
                        <DownloadIcon className={`w-5 h-5 mr-2 ${downloadingFormat === 'jpeg' ? 'animate-pulse' : ''}`} />
                        {downloadingFormat === 'jpeg' ? 'Generating...' : 'Download JPEG'}
                    </button>
                    <button 
                        onClick={() => onDownloadAlbum('png')} 
                        disabled={isDownloading || isGenerating}
                        className="w-full sm:w-auto inline-flex items-center justify-center py-3 px-6 bg-blue-600 text-white font-bold rounded-lg shadow-lg hover:bg-blue-700 transform hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-50 disabled:cursor-wait"
                    >
                        <DownloadIcon className={`w-5 h-5 mr-2 ${downloadingFormat === 'png' ? 'animate-pulse' : ''}`} />
                         {downloadingFormat === 'png' ? 'Generating...' : 'Download PNG'}
                    </button>
                </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 p-4">
                {decades.map(decade => {
                    const generation = generations[decade];
                    return (
                        <PolaroidCard
                            key={decade}
                            decade={decade}
                            status={generation.status}
                            imageUrl={generation.url}
                            error={generation.error}
                            onRegenerate={onRegenerate}
                        />
                    );
                })}
            </div>
        </div>
    );
};

export default PastForwardGrid;