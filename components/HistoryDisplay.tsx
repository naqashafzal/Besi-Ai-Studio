
import React from 'react';
import { DownloadIcon, TrashIcon } from './Icons';

interface HistoryDisplayProps {
  imageUrls: string[];
  onClear: () => void;
}

const HistoryDisplay: React.FC<HistoryDisplayProps> = ({ imageUrls, onClear }) => {
  return (
    <section className="mt-16 animate-fade-in">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-text-primary">Generation History</h2>
        <button
          onClick={onClear}
          className="flex items-center px-4 py-2 bg-red-600/20 text-red-400 border border-red-500/50 rounded-lg hover:bg-red-600/40 hover:text-red-300 transition-colors duration-200"
          aria-label="Clear history"
        >
          <TrashIcon className="w-5 h-5 mr-2" />
          Clear History
        </button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {imageUrls.map((url, index) => (
          <div key={index} className="group relative aspect-square">
            <img
              src={url}
              alt={`Generated history item ${index + 1}`}
              className="w-full h-full object-cover rounded-lg shadow-lg border-2 border-border"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-lg flex items-center justify-center">
                <a
                  href={url}
                  download={`bestai-history-${index + 1}.png`}
                  className="inline-flex items-center justify-center p-3 bg-green-600 text-white font-bold rounded-full shadow-lg hover:bg-green-700 transform transition-transform hover:scale-110"
                  aria-label="Download Image"
                  onClick={(e) => e.stopPropagation()}
                >
                  <DownloadIcon className="w-6 h-6" />
                </a>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default HistoryDisplay;
