import React, { useState, useEffect } from 'react';
import { Clock, AlertTriangle, CheckCircle } from 'lucide-react';

interface CountdownTimerProps {
  endTime: bigint;
  compact?: boolean;
  onExpire?: () => void;
}

export const CountdownTimer: React.FC<CountdownTimerProps> = ({
  endTime,
  compact = false,
  onExpire,
}) => {
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    isEnded: boolean;
    isAntiSnipeWindow: boolean;
  }>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    isEnded: false,
    isAntiSnipeWindow: false,
  });

  useEffect(() => {
    const updateCountdown = () => {
      const now = Math.floor(Date.now() / 1000);
      const target = Number(endTime);
      const diff = target - now;

      if (diff <= 0) {
        setTimeLeft({
          days: 0,
          hours: 0,
          minutes: 0,
          seconds: 0,
          isEnded: true,
          isAntiSnipeWindow: false,
        });
        if (onExpire) onExpire();
        return;
      }

      const days = Math.floor(diff / (24 * 3600));
      const hours = Math.floor((diff % (24 * 3600)) / 3600);
      const minutes = Math.floor((diff % 3600) / 60);
      const seconds = diff % 60;
      const isAntiSnipeWindow = diff <= 900; // 15 minutes extension window

      setTimeLeft({
        days,
        hours,
        minutes,
        seconds,
        isEnded: false,
        isAntiSnipeWindow,
      });
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [endTime, onExpire]);

  if (timeLeft.isEnded) {
    return (
      <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-zinc-800 text-zinc-400 text-xs font-medium border border-zinc-700/60">
        <CheckCircle className="w-3.5 h-3.5 text-zinc-400" />
        <span>Auction Ended</span>
      </div>
    );
  }

  if (compact) {
    return (
      <div
        className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-md text-xs font-mono font-medium border ${
          timeLeft.isAntiSnipeWindow
            ? 'bg-amber-500/10 text-amber-400 border-amber-500/30 animate-pulse'
            : 'bg-dark-900 text-slate-300 border-dark-700'
        }`}
      >
        <Clock className={`w-3.5 h-3.5 ${timeLeft.isAntiSnipeWindow ? 'text-amber-400' : 'text-slate-400'}`} />
        <span>
          {timeLeft.days > 0 && `${timeLeft.days}d `}
          {String(timeLeft.hours).padStart(2, '0')}:
          {String(timeLeft.minutes).padStart(2, '0')}:
          {String(timeLeft.seconds).padStart(2, '0')}
        </span>
        {timeLeft.isAntiSnipeWindow && (
          <span className="text-[10px] bg-amber-500 text-dark-950 font-bold px-1 rounded">
            Anti-Snipe
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-4 gap-2 text-center">
        <div className="p-3 rounded-xl bg-dark-900 border border-dark-800">
          <div className="text-xl sm:text-2xl font-bold font-mono text-white">
            {String(timeLeft.days).padStart(2, '0')}
          </div>
          <div className="text-[10px] uppercase font-semibold text-slate-500 mt-1">Days</div>
        </div>
        <div className="p-3 rounded-xl bg-dark-900 border border-dark-800">
          <div className="text-xl sm:text-2xl font-bold font-mono text-white">
            {String(timeLeft.hours).padStart(2, '0')}
          </div>
          <div className="text-[10px] uppercase font-semibold text-slate-500 mt-1">Hours</div>
        </div>
        <div className="p-3 rounded-xl bg-dark-900 border border-dark-800">
          <div className="text-xl sm:text-2xl font-bold font-mono text-white">
            {String(timeLeft.minutes).padStart(2, '0')}
          </div>
          <div className="text-[10px] uppercase font-semibold text-slate-500 mt-1">Mins</div>
        </div>
        <div className="p-3 rounded-xl bg-dark-900 border border-dark-800">
          <div
            className={`text-xl sm:text-2xl font-bold font-mono ${
              timeLeft.isAntiSnipeWindow ? 'text-amber-400 animate-pulse' : 'text-brand-400'
            }`}
          >
            {String(timeLeft.seconds).padStart(2, '0')}
          </div>
          <div className="text-[10px] uppercase font-semibold text-slate-500 mt-1">Secs</div>
        </div>
      </div>

      {timeLeft.isAntiSnipeWindow && (
        <div className="flex items-center space-x-2 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs">
          <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
          <span>
            <strong>Anti-Snipe Active:</strong> Any bid placed now extends the auction by 15 minutes!
          </span>
        </div>
      )}
    </div>
  );
};
