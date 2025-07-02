// src/components/LoadingSpinner.tsx - Updated with custom ALPHA Club logo animation
// FIXED: useEffect dependency and image optimization
import { FC, useState, useEffect } from 'react';
import Image from 'next/image';

interface LoadingSpinnerProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const LoadingSpinner: FC<LoadingSpinnerProps> = ({ 
  message = "Loading...", 
  size = 'md' 
}) => {
  const [currentWord, setCurrentWord] = useState(0);
  const words = ['REWARD', 'BURN', 'REPEAT'];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentWord((prev) => (prev + 1) % words.length);
    }, 800); // Change word every 800ms

    return () => clearInterval(interval);
  }, [words.length]);

  // Size configurations
  const sizeConfig = {
    sm: {
      outer: 'w-16 h-16',
      inner: 'w-12 h-12',
      outerSize: 64,
      innerSize: 48,
      text: 'text-lg',
      subtext: 'text-xs'
    },
    md: {
      outer: 'w-24 h-24',
      inner: 'w-16 h-16',
      outerSize: 96,
      innerSize: 64,
      text: 'text-2xl',
      subtext: 'text-sm'
    },
    lg: {
      outer: 'w-32 h-32',
      inner: 'w-24 h-24',
      outerSize: 128,
      innerSize: 96,
      text: 'text-3xl',
      subtext: 'text-base'
    }
  };

  const config = sizeConfig[size];

  return (
    <div className="flex flex-col items-center justify-center p-8">
      {/* Rotating Logo Animation */}
      <div className="relative mb-6">
        {/* Rotating Outer Circle */}
        <div className="animate-spin" style={{ animationDuration: '1s' }}>
          <Image 
            src="/alpha-outer-circle-307x307px.png" 
            alt="ALPHA Club Loading"
            width={config.outerSize}
            height={config.outerSize}
            className={`${config.outer} mx-auto`}
            priority
          />
        </div>
        
        {/* Static Inner Circle */}
        <div className="absolute inset-0 flex items-center justify-center">
          <Image 
            src="/alpha-inner-circle-307x307px.png" 
            alt="ALPHA Club Inner"
            width={config.innerSize}
            height={config.innerSize}
            className={config.inner}
            priority
          />
        </div>
      </div>
      
      {/* Flashing Words */}
      <div className={`${config.text} font-bold text-white mb-2`}>
        <span className="inline-block transition-opacity duration-300">
          {words[currentWord]}
        </span>
      </div>
      
      {/* Loading Message */}
      <div className={`text-gray-400 ${config.subtext} text-center`}>
        {message}
      </div>
    </div>
  );
};