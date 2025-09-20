import React, { useState, useEffect } from 'react';
import { LOADING_MESSAGES } from '../constants';
import { PhotoIcon } from './Icons';

const LoadingIndicator: React.FC = () => {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((prevIndex) => (prevIndex + 1) % LOADING_MESSAGES.length);
    }, 3000); // Change message every 3 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center text-center p-4 animate-fade-in">
       <div className="relative w-24 h-24">
        <PhotoIcon className="absolute inset-0 w-full h-full text-brand-primary opacity-25" />
        <PhotoIcon className="absolute inset-0 w-full h-full text-brand-primary animate-pulse-slow" />
      </div>
      <p className="mt-4 text-lg font-semibold text-gray-100 transition-opacity duration-500">
        {LOADING_MESSAGES[messageIndex]}
      </p>
    </div>
  );
};

export default LoadingIndicator;