
import React from 'react';
import { RefreshIcon, DownloadIcon } from './Icons';

interface PolaroidCardProps {
  decade: string;
  status: 'idle' | 'loading' | 'success' | 'error';
  imageUrl: string | null;
  onRegenerate: (decade: string) => void;
  error?: string;
}

const PolaroidCard: React.FC<PolaroidCardProps> = ({ decade, status, imageUrl, onRegenerate, error }) => {
  const renderContent = () => {
    switch (status) {
      case 'loading':
        return (
          <div className="w-full h-full flex items-center justify-center bg-background">
            <div className="w-8 h-8 border-4 border-border border-t-brand rounded-full animate-spin"></div>
          </div>
        );
      case 'success':
        return (
          <>
            <img
              src={imageUrl ?? ''}
              alt={`Portrait in ${decade} style`}
              className="w-full h-full object-cover animate-develop"
            />
            <a
              href={imageUrl ?? '#'}
              download={`past-forward-${decade}.png`}
              onClick={(e) => e.stopPropagation()}
              className="absolute top-2 right-2 p-2 bg-green-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 hover:scale-110 shadow-lg"
              aria-label={`Download ${decade} image`}
              title={`Download ${decade} image`}
            >
              <DownloadIcon className="w-5 h-5" />
            </a>
          </>
        );
      case 'error':
        return (
          <div className="w-full h-full flex flex-col items-center justify-center text-center bg-red-900/30 p-2">
            <p className="text-red-400 text-xs font-semibold mb-2">Error</p>
            <p className="text-red-400 text-[10px] leading-tight mb-2">{error}</p>
            <button
              onClick={() => onRegenerate(decade)}
              className="p-1.5 bg-brand text-white rounded-full hover:bg-brand-hover"
              title="Regenerate this decade"
            >
              <RefreshIcon className="w-4 h-4" />
            </button>
          </div>
        );
      case 'idle':
      default:
        return <div className="w-full h-full bg-panel-light"></div>;
    }
  };

  return (
    <div className="bg-white p-3 pb-8 rounded-md shadow-lg transform -rotate-2 hover:rotate-0 hover:scale-105 transition-transform duration-300">
      <div className="group aspect-square bg-gray-200 overflow-hidden relative">
        {renderContent()}
      </div>
      <p className="text-center text-xl font-semibold text-gray-800 mt-3">{decade}</p>
    </div>
  );
};

export default PolaroidCard;
