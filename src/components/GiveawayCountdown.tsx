// src/components/GiveawayCountdown.tsx
// Countdown timer component with urgency messaging
import { FC, useState, useEffect } from 'react';

interface GiveawayCountdownProps {
  endDate: string;
}

interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  total: number;
}

export const GiveawayCountdown: FC<GiveawayCountdownProps> = ({ endDate }) => {
  const [timeRemaining, setTimeRemaining] = useState<TimeRemaining>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    total: 0
  });

  useEffect(() => {
    const calculateTimeRemaining = () => {
      const now = new Date().getTime();
      const end = new Date(endDate).getTime();
      const difference = end - now;

      if (difference > 0) {
        setTimeRemaining({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((difference % (1000 * 60)) / 1000),
          total: difference
        });
      } else {
        setTimeRemaining({
          days: 0,
          hours: 0,
          minutes: 0,
          seconds: 0,
          total: 0
        });
      }
    };

    // Calculate immediately
    calculateTimeRemaining();

    // Update every second
    const interval = setInterval(calculateTimeRemaining, 1000);

    return () => clearInterval(interval);
  }, [endDate]);

  const getUrgencyMessage = () => {
    const { total, days, hours } = timeRemaining;
    
    if (total <= 0) return { message: "Giveaway Ended", color: "text-red-400", urgent: true };
    if (days === 0 && hours === 0) return { message: "FINAL HOURS", color: "text-red-400", urgent: true };
    if (days === 0 && hours < 6) return { message: "ENDING VERY SOON", color: "text-orange-400", urgent: true };
    if (days === 0) return { message: "ENDING TODAY", color: "text-yellow-400", urgent: true };
    if (days === 1) return { message: "LESS THAN 24 HOURS", color: "text-yellow-400", urgent: true };
    if (days <= 3) return { message: "ENDING SOON", color: "text-teal-400", urgent: false };
    return { message: "TIME REMAINING", color: "text-gray-400", urgent: false };
  };

  const urgency = getUrgencyMessage();

  if (timeRemaining.total <= 0) {
    return (
      <div className="bg-gradient-to-r from-red-900/50 to-pink-900/50 backdrop-blur-sm rounded-3xl p-8 border border-red-500/30 max-w-2xl mx-auto">
        <h3 className="text-3xl font-bold text-red-400 mb-4">⏰ GIVEAWAY ENDED</h3>
        <p className="text-gray-300 text-lg">
          This giveaway has concluded. Winner announcement coming soon!
        </p>
      </div>
    );
  }

  return (
    <div className={`backdrop-blur-sm rounded-3xl p-8 border max-w-4xl mx-auto ${
      urgency.urgent 
        ? 'bg-gradient-to-r from-red-900/50 to-pink-900/50 border-red-500/30 animate-pulse'
        : 'bg-gradient-to-r from-purple-900/50 to-blue-900/50 border-purple-500/30'
    }`}>
      
      <div className="text-center">
        <h3 className={`text-2xl lg:text-3xl font-bold mb-6 ${urgency.color}`}>
          {urgency.urgent && '🚨 '}
          {urgency.message}
          {urgency.urgent && ' 🚨'}
        </h3>
        
        {/* Countdown Display */}
        <div className="grid grid-cols-4 gap-4 lg:gap-8 mb-6">
          
          {/* Days */}
          <div className="bg-black/60 rounded-2xl p-4 lg:p-6 border border-gray-600/50">
            <div className={`text-4xl lg:text-6xl font-mono font-bold mb-2 ${
              timeRemaining.days === 0 ? 'text-red-400' : 'text-white'
            }`}>
              {String(timeRemaining.days).padStart(2, '0')}
            </div>
            <div className="text-gray-400 font-bold text-sm lg:text-base">DAYS</div>
          </div>

          {/* Hours */}
          <div className="bg-black/60 rounded-2xl p-4 lg:p-6 border border-gray-600/50">
            <div className={`text-4xl lg:text-6xl font-mono font-bold mb-2 ${
              timeRemaining.days === 0 && timeRemaining.hours < 6 ? 'text-orange-400' : 'text-white'
            }`}>
              {String(timeRemaining.hours).padStart(2, '0')}
            </div>
            <div className="text-gray-400 font-bold text-sm lg:text-base">HOURS</div>
          </div>

          {/* Minutes */}
          <div className="bg-black/60 rounded-2xl p-4 lg:p-6 border border-gray-600/50">
            <div className={`text-4xl lg:text-6xl font-mono font-bold mb-2 ${
              timeRemaining.days === 0 && timeRemaining.hours === 0 ? 'text-yellow-400' : 'text-white'
            }`}>
              {String(timeRemaining.minutes).padStart(2, '0')}
            </div>
            <div className="text-gray-400 font-bold text-sm lg:text-base">MINS</div>
          </div>

          {/* Seconds */}
          <div className="bg-black/60 rounded-2xl p-4 lg:p-6 border border-gray-600/50">
            <div className={`text-4xl lg:text-6xl font-mono font-bold mb-2 ${
              timeRemaining.days === 0 && timeRemaining.hours === 0 && timeRemaining.minutes < 10 
                ? 'text-red-400 animate-pulse' : 'text-white'
            }`}>
              {String(timeRemaining.seconds).padStart(2, '0')}
            </div>
            <div className="text-gray-400 font-bold text-sm lg:text-base">SECS</div>
          </div>
        </div>

        {/* Urgency Messages */}
        {urgency.urgent && (
          <div className="bg-black/40 rounded-2xl p-6 border border-red-500/30">
            <div className="text-red-400 font-bold text-lg mb-2">
            ⚠️ DON&rsquo;T MISS OUT! ⚠️
            </div>
            <div className="text-gray-300">
              {timeRemaining.days === 0 && timeRemaining.hours === 0 
                ? "Final hours to enter! Buy your entries NOW!"
                : timeRemaining.days === 0 
                  ? "Less than 24 hours remaining! Secure your entries today!"
                  : "Time is running out! Get your entries before it's too late!"
              }
            </div>
          </div>
        )}

        {/* Draw Date Info */}
        <div className="mt-6 text-gray-400">
          <div className="text-sm">
            Draw Date: {new Date(endDate).toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              timeZoneName: 'short'
            })}
          </div>
        </div>
      </div>
    </div>
  );
};