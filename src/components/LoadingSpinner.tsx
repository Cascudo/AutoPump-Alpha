// src/components/LoadingSpinner.tsx
import { FC } from 'react';

export const LoadingSpinner: FC = () => {
  return (
    <div className="flex flex-col items-center justify-center space-y-4">
      <div className="relative">
        {/* Outer Ring */}
        <div className="w-16 h-16 border-4 border-gray-700 rounded-full animate-spin">
          <div className="absolute top-0 left-0 w-4 h-4 bg-gradient-to-r from-teal-400 to-cyan-500 rounded-full"></div>
        </div>
        
        {/* Inner Ring */}
        <div className="absolute top-2 left-2 w-12 h-12 border-4 border-gray-600 rounded-full animate-spin" style={{ animationDirection: 'reverse' }}>
          <div className="absolute top-0 left-0 w-3 h-3 bg-gradient-to-r from-cyan-500 to-emerald-500 rounded-full"></div>
        </div>
        
        {/* Center Alpha */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-teal-400 font-bold text-xl">
          α
        </div>
      </div>
      
      <div className="text-center">
        <div className="text-white font-semibold mb-1">Loading ALPHA Club</div>
        <div className="text-gray-400 text-sm">Fetching your membership status...</div>
      </div>
    </div>
  );
};