
import React from 'react';
import { DownloadIcon } from './Icons';

interface VideoPlayerProps {
  videoUrl: string;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ videoUrl }) => {
  return (
    <div className="w-full flex flex-col items-center animate-fade-in">
      <video
        src={videoUrl}
        controls
        autoPlay
        loop
        className="w-full max-w-full rounded-lg shadow-2xl mb-4 border-2 border-brand"
      >
        Your browser does not support the video tag.
      </video>
      <a
        href={videoUrl}
        download="generated-video.mp4"
        className="inline-flex items-center justify-center py-2 px-6 bg-green-600 text-white font-bold rounded-lg shadow-lg hover:bg-green-700 transform hover:-translate-y-0.5 transition-all duration-300"
      >
        <DownloadIcon className="w-5 h-5 mr-2" />
        Download Video
      </a>
    </div>
  );
};

export default VideoPlayer;
