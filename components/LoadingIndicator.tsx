
import React, { useState, useEffect } from 'react';
import { LOADING_MESSAGES } from '../constants';
import { PhotoIcon } from './Icons';

interface LoadingIndicatorProps {
  messages?: string[];
  IconComponent?: React.FC<{ className?: string }>;
}

const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({ messages = LOADING_MESSAGES, IconComponent = PhotoIcon }) => {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((prevIndex) => (prevIndex + 1) % messages.length);
    }, 3000); // Change message every 3 seconds

    return () => clearInterval(interval);
  }, [messages]);

  return (
    <div className="flex flex-col items-center justify-center text-center p-4 animate-fade-in">
       <div className="relative w-24 h-24">
        <IconComponent className="absolute inset-0 w-full h-full text-brand opacity-25" />
        <IconComponent className="absolute inset-0 w-full h-full text-brand animate-pulse-slow" />
      </div>
      <p className="mt-4 text-lg font-semibold text-text-primary transition-opacity duration-500">
        {messages[messageIndex]}
      </p>
    </div>
  );
};

export default LoadingIndicator;
